import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RecurringTransaction,
  RecurrenceFrequency,
  Prisma,
} from '../../generated/prisma/client';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';

@Injectable()
export class RecurringTransactionsService {
  private readonly logger = new Logger(RecurringTransactionsService.name);

  // Filtro de seleção padrão para as rotas CRUD externas
  private readonly recurringSelect: Prisma.RecurringTransactionSelect = {
    id: true,
    amount: true,
    description: true,
    frequency: true,
    startDate: true,
    endDate: true,
    nextDate: true,
    isActive: true,
    paymentMethod: true,
    categoryId: true,
    category: {
      select: {
        id: true,
        name: true,
        type: true,
      },
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // OPERAÇÕES CRUD (CHAMADAS PELA API REST)
  // ==========================================

  async create(userId: string, dto: CreateRecurringTransactionDto) {
    // Valida se a categoria informada existe, pertence ao usuário ou é global, e se não está apagada
    const category = await this.prisma.category.findFirst({
      where: {
        id: dto.categoryId,
        OR: [{ userId }, { userId: null }],
        deletedAt: null,
      },
    });

    if (!category) {
      throw new NotFoundException(
        'A categoria especificada não existe ou está inacessível.',
      );
    }

    try {
      const parsedStartDate = new Date(dto.startDate);

      return await this.prisma.recurringTransaction.create({
        data: {
          amount: new Prisma.Decimal(dto.amount),
          description: dto.description,
          frequency: dto.frequency,
          startDate: parsedStartDate,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          nextDate: parsedStartDate, // A primeira transação aguarda a data de início
          paymentMethod: dto.paymentMethod,
          userId,
          categoryId: dto.categoryId,
        },
        select: this.recurringSelect,
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro interno ao salvar transação recorrente.',
      );
    }
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: Prisma.RecurringTransactionWhereInput = {
      userId,
      deletedAt: null,
    };

    const [total, data] = await Promise.all([
      this.prisma.recurringTransaction.count({ where }),
      this.prisma.recurringTransaction.findMany({
        where,
        take: limit,
        skip,
        select: this.recurringSelect,
        orderBy: { createdAt: 'desc' },
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

  async findOne(id: string, userId: string) {
    const recurrence = await this.prisma.recurringTransaction.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      select: this.recurringSelect,
    });

    if (!recurrence) {
      throw new NotFoundException('Transação recorrente não localizada.');
    }

    return recurrence;
  }

  async update(id: string, userId: string, dto: UpdateRecurringTransactionDto) {
    // Garante que o registro pertence ao usuário logado antes de alterar
    await this.findOne(id, userId);

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          OR: [{ userId }, { userId: null }],
          deletedAt: null,
        },
      });
      if (!category) {
        throw new NotFoundException(
          'A nova categoria especificada não existe ou está inacessível.',
        );
      }
    }

    const dataToUpdate: Prisma.RecurringTransactionUpdateInput = {};

    if (dto.amount !== undefined)
      dataToUpdate.amount = new Prisma.Decimal(dto.amount);
    if (dto.description !== undefined)
      dataToUpdate.description = dto.description;
    if (dto.frequency !== undefined) dataToUpdate.frequency = dto.frequency;
    if (dto.isActive !== undefined) dataToUpdate.isActive = dto.isActive;
    if (dto.paymentMethod !== undefined)
      dataToUpdate.paymentMethod = dto.paymentMethod;

    // Corrigido: Usando a instrução connect relacional exigida pelo Prisma UpdateInput
    if (dto.categoryId !== undefined) {
      dataToUpdate.category = {
        connect: { id: dto.categoryId },
      };
    }

    if (dto.startDate !== undefined) {
      const parsedStartDate = new Date(dto.startDate);
      dataToUpdate.startDate = parsedStartDate;
      // Recalcula o próximo disparo se o usuário mudar a data de início de forma explícita
      dataToUpdate.nextDate = parsedStartDate;
    }

    if (dto.endDate !== undefined) {
      dataToUpdate.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    try {
      return await this.prisma.recurringTransaction.update({
        where: { id, userId },
        data: dataToUpdate,
        select: this.recurringSelect,
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao atualizar a recorrência.',
      );
    }
  }

  async remove(id: string, userId: string) {
    // Garante que o registro pertence ao usuário antes de alterar
    await this.findOne(id, userId);

    try {
      await this.prisma.recurringTransaction.update({
        where: { id, userId },
        data: {
          deletedAt: new Date(),
          isActive: false, // Desativa preventivamente para não rodar pelo Cron Job
        },
      });
      return { message: 'Transação recorrente removida com sucesso.' };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao remover a recorrência.');
    }
  }

  // ==========================================
  // MOTOR AGENDADOR (CRON JOB)
  // ==========================================

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleRecurringTransactionsCron() {
    this.logger.log('Iniciando varredura diária de transações recorrentes...');
    const nowUtc = new Date();

    const pendingRecurrences = await this.prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        nextDate: {
          lte: nowUtc,
        },
      },
    });

    if (pendingRecurrences.length === 0) {
      this.logger.log('Nenhuma transação recorrente pendente para processar.');
      return;
    }

    this.logger.log(
      `Detectadas ${pendingRecurrences.length} recorrências pendentes para execução. Processando...`,
    );

    let processedCount = 0;
    let failedCount = 0;

    for (const recurrence of pendingRecurrences) {
      try {
        await this.processSingleRecurrence(recurrence, nowUtc);
        processedCount++;
      } catch (error) {
        failedCount++;
        this.logger.error(
          `Falha crítica ao processar recorrência ID ${recurrence.id} para o usuário ${recurrence.userId}. Erro:`,
          error instanceof Error ? error.stack : error,
        );
      }
    }

    this.logger.log(
      `Varredura concluída. Processadas com sucesso: ${processedCount} | Falhas: ${failedCount}`,
    );
  }

  private async processSingleRecurrence(
    recurrence: RecurringTransaction,
    nowUtc: Date,
  ) {
    const nextDate = new Date(recurrence.nextDate);
    const calculatedNextDate = this.calculateNextDate(
      nextDate,
      recurrence.frequency,
    );

    const isDeactivating =
      recurrence.endDate && calculatedNextDate > new Date(recurrence.endDate);

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          amount: recurrence.amount,
          description: `[Recorrente] ${recurrence.description}`,
          date: nextDate,
          categoryId: recurrence.categoryId,
          userId: recurrence.userId,
          paymentMethod: recurrence.paymentMethod,
          recurringTransactionId: recurrence.id,
        },
      });

      await tx.recurringTransaction.update({
        where: { id: recurrence.id },
        data: {
          nextDate: calculatedNextDate,
          isActive: isDeactivating ? false : true,
        },
      });
    });

    this.logger.log(
      `Recorrência ID ${recurrence.id} processada. Próxima execução ajustada para: ${calculatedNextDate.toISOString()}`,
    );
  }

  private calculateNextDate(
    currentNextDate: Date,
    frequency: RecurrenceFrequency,
  ): Date {
    const nextDate = new Date(currentNextDate);

    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        break;
      case RecurrenceFrequency.WEEKLY:
        nextDate.setUTCDate(nextDate.getUTCDate() + 7);
        break;
      case RecurrenceFrequency.BIWEEKLY:
        nextDate.setUTCDate(nextDate.getUTCDate() + 14);
        break;
      case RecurrenceFrequency.MONTHLY:
        nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
        break;
      case RecurrenceFrequency.YEARLY:
        nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1);
        break;
    }

    return nextDate;
  }
}
