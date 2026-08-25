import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Prisma } from '../../generated/prisma/client';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  private readonly transactionSelect: Prisma.TransactionSelect = {
    id: true,
    amount: true,
    description: true,
    date: true,
    paymentMethod: true, // Adicionado na seleção do objeto retornado
    category: {
      select: { id: true, name: true, type: true },
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Constrói a cláusula WHERE de forma dinâmica compartilhada entre a listagem e o resumo.
   */
  private buildWhereClause(
    userId: string,
    month?: number,
    year?: number,
    categoryIds?: string | string[],
    paymentMethod?: 'DEBIT' | 'CREDIT', // Novo filtro adicionado à assinatura do método helper
  ): Prisma.TransactionWhereInput {
    const whereClause: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
    };

    if (year && month) {
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

      whereClause.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    if (categoryIds) {
      const parsedCategoryIds = Array.isArray(categoryIds)
        ? categoryIds
        : categoryIds
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);

      if (parsedCategoryIds.length > 0) {
        whereClause.categoryId = {
          in: parsedCategoryIds,
        };
      }
    }

    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod;
    }

    return whereClause;
  }

  async create(userId: string, dto: CreateTransactionDto) {
    try {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          OR: [{ userId }, { userId: null }],
          deletedAt: null,
        },
      });

      if (!category) throw new NotFoundException('Categoria não encontrada.');

      return await this.prisma.transaction.create({
        data: {
          amount: new Prisma.Decimal(dto.amount),
          description: dto.description,
          date: dto.date ? new Date(dto.date) : new Date(),
          userId,
          categoryId: dto.categoryId,
          paymentMethod: dto.paymentMethod, // Persiste o método de pagamento no banco
        },
        select: this.transactionSelect,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao criar transação.');
    }
  }

  async findAll(
    userId: string,
    page = 1,
    limit = 20,
    month?: number,
    year?: number,
    categoryIds?: string | string[],
    paymentMethod?: 'DEBIT' | 'CREDIT', // Novo filtro de método de pagamento
  ) {
    const skip = (page - 1) * limit;
    const whereClause = this.buildWhereClause(
      userId,
      month,
      year,
      categoryIds,
      paymentMethod,
    );

    const [total, data] = await Promise.all([
      this.prisma.transaction.count({ where: whereClause }),
      this.prisma.transaction.findMany({
        where: whereClause,
        take: limit,
        skip,
        select: this.transactionSelect,
        orderBy: { date: 'desc' },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retorna o resumo financeiro (Entradas, Saídas e Saldo) aplicando os filtros
   * selecionados (incluindo o método de pagamento se fornecido).
   */
  async getSummary(
    userId: string,
    month?: number,
    year?: number,
    categoryIds?: string | string[],
    paymentMethod?: 'DEBIT' | 'CREDIT',
  ) {
    const whereClause = this.buildWhereClause(
      userId,
      month,
      year,
      categoryIds,
      paymentMethod,
    );

    // Executa duas agregações simples no banco de dados
    const [incomeSum, expenseSum] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          ...whereClause,
          category: { type: 'INCOME' },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          ...whereClause,
          category: { type: 'EXPENSE' },
        },
        _sum: { amount: true },
      }),
    ]);

    const income = incomeSum._sum.amount
      ? new Prisma.Decimal(incomeSum._sum.amount)
      : new Prisma.Decimal(0);
    const expense = expenseSum._sum.amount
      ? new Prisma.Decimal(expenseSum._sum.amount)
      : new Prisma.Decimal(0);
    const balance = income.minus(expense);

    return {
      income: income.toNumber(),
      expense: expense.toNumber(),
      balance: balance.toNumber(),
    };
  }

  async findOne(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      select: this.transactionSelect,
    });

    if (!transaction) throw new NotFoundException('Transação não encontrada.');
    return transaction;
  }

  async update(id: string, userId: string, dto: UpdateTransactionDto) {
    // 1. Validar se a transação existe e pertence ao usuário autenticado
    const existingTransaction = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existingTransaction) {
      throw new NotFoundException('Transação não encontrada.');
    }

    // 2. Se a categoria foi alterada, validar se a nova categoria é válida
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          OR: [{ userId }, { userId: null }],
          deletedAt: null,
        },
      });
      if (!category) {
        throw new NotFoundException('Categoria não encontrada ou inativa.');
      }
    }

    // 3. Executar o update aplicando as conversões corretas
    return await this.prisma.transaction.update({
      where: { id },
      data: {
        amount:
          dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : undefined,
        categoryId: dto.categoryId,
        paymentMethod: dto.paymentMethod,
      },
      select: this.transactionSelect,
    });
  }

  async remove(id: string, userId: string) {
    try {
      await this.prisma.transaction.update({
        where: { id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return { message: 'Transação removida com sucesso.' };
    } catch (error) {
      throw new NotFoundException('Transação não encontrada ou já removida.');
    }
  }
}
