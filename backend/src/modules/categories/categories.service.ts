import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  private readonly categorySelect: Prisma.CategorySelect = {
    id: true,
    name: true,
    type: true,
    userId: true,
  };

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: {
          ...dto,
          userId,
        },
        select: this.categorySelect,
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao criar categoria.');
    }
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // Definimos o filtro em uma variável para reutilizar no count e no findMany
    const where = {
      OR: [{ userId }, { userId: null }],
      deletedAt: null,
    };

    // Promise.all para performance: busca o total de registros e os dados em paralelo
    const [total, data] = await Promise.all([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        take: limit,
        skip,
        select: this.categorySelect,
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        OR: [{ userId }, { userId: null }],
        deletedAt: null,
      },
      select: this.categorySelect,
    });

    if (!category) throw new NotFoundException('Categoria não encontrada.');
    return category;
  }

  async update(id: string, userId: string, dto: UpdateCategoryDto) {
    try {
      // Impede alterar categorias globais (segurança)
      return await this.prisma.category.update({
        where: { id, userId, deletedAt: null },
        data: dto,
        select: this.categorySelect,
      });
    } catch (error) {
      throw new NotFoundException(
        'Categoria não encontrada ou você não tem permissão para editá-la.',
      );
    }
  }

  async remove(id: string, userId: string) {
    try {
      // Soft Delete: Apenas se pertencer ao usuário
      await this.prisma.category.update({
        where: { id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return { message: 'Categoria removida com sucesso.' };
    } catch (error) {
      throw new NotFoundException('Categoria não encontrada ou protegida.');
    }
  }
}
