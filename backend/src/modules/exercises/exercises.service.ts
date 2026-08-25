import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { FindExercisesQueryDto } from './dto/find-exercises-query.dto';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class ExercisesService {
  private readonly logger = new Logger(ExercisesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida se a categoria é do tipo FITNESS e se o usuário tem acesso (dono ou global).
   */
  private async validateFitnessCategory(
    categoryId: string,
    userId: string,
  ): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        type: 'FITNESS',
        OR: [{ userId }, { userId: null }],
        deletedAt: null,
      },
    });

    if (!category) {
      throw new NotFoundException(
        'Categoria FITNESS inválida, inativa ou inexistente.',
      );
    }
  }

  async create(userId: string, dto: CreateExerciseDto) {
    await this.validateFitnessCategory(dto.categoryId, userId);

    try {
      return await this.prisma.exercise.create({
        data: {
          name: dto.name,
          categoryId: dto.categoryId,
          userId, // Salva o exercício na biblioteca privada do usuário
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao criar o exercício na biblioteca.',
      );
    }
  }

  async findAll(userId: string, query: FindExercisesQueryDto) {
    const { page = 1, limit = 20, search, categoryId, workoutPlanId } = query;
    const skip = (page - 1) * limit;

    // Retorna exercícios criados pelo próprio usuário OU globais (onde userId é nulo)
    const whereClause: Prisma.ExerciseWhereInput = {
      deletedAt: null,
      OR: [{ userId }, { userId: null }],
    };

    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // Se um plano de treino específico foi requisitado, filtramos através do relacionamento Many-to-Many
    if (workoutPlanId) {
      whereClause.workoutPlanExercises = {
        some: {
          workoutPlanId,
        },
      };
    }

    try {
      const [total, data] = await Promise.all([
        this.prisma.exercise.count({ where: whereClause }),
        this.prisma.exercise.findMany({
          where: whereClause,
          take: limit,
          skip,
          include: {
            category: {
              select: { id: true, name: true },
            },
          },
          orderBy: { name: 'asc' },
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
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao buscar exercícios.');
    }
  }

  async findOne(id: string, userId: string) {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ userId }, { userId: null }],
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercício não encontrado.');
    }

    return exercise;
  }

  async update(id: string, userId: string, dto: UpdateExerciseDto) {
    // Valida a existência do exercício
    const exercise = await this.findOne(id, userId);

    // Impede a edição de exercícios padrão globais do sistema
    if (!exercise.userId) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar exercícios padrões do sistema.',
      );
    }

    if (dto.categoryId) {
      await this.validateFitnessCategory(dto.categoryId, userId);
    }

    try {
      return await this.prisma.exercise.update({
        where: { id },
        data: {
          name: dto.name,
          categoryId: dto.categoryId,
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao atualizar o exercício.');
    }
  }

  async remove(id: string, userId: string) {
    // Valida existência
    const exercise = await this.findOne(id, userId);

    // Impede a remoção de exercícios padrões do sistema
    if (!exercise.userId) {
      throw new ForbiddenException(
        'Você não tem permissão para remover exercícios padrões do sistema.',
      );
    }

    try {
      await this.prisma.exercise.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return { message: 'Exercício removido com sucesso.' };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao remover o exercício.');
    }
  }
}
