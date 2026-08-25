import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class WorkoutPlansService {
  private readonly logger = new Logger(WorkoutPlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida se os exercícios estão disponíveis e pertencem ao usuário (ou se são globais)
   */
  private async validateExercisesAccessibility(
    exercises: { exerciseId: string }[],
    userId: string,
  ): Promise<void> {
    const exerciseIds = exercises.map((e) => e.exerciseId);
    // Elimina IDs duplicados no payload para realizar uma contagem precisa
    const uniqueExerciseIds = [...new Set(exerciseIds)];

    const count = await this.prisma.exercise.count({
      where: {
        id: { in: uniqueExerciseIds },
        deletedAt: null,
        OR: [{ userId }, { userId: null }],
      },
    });

    if (count !== uniqueExerciseIds.length) {
      throw new NotFoundException(
        'Um ou mais exercícios fornecidos não foram encontrados ou estão inacessíveis.',
      );
    }
  }

  /**
   * Formata o plano de treino incluindo os alvos estruturados de séries e repetições
   */
  private formatWorkoutPlan(plan: any) {
    return {
      id: plan.id,
      name: plan.name,
      userId: plan.userId,
      deletedAt: plan.deletedAt,
      exercises: plan.exercises
        ? plan.exercises.map((wpe: any) => ({
            associationId: wpe.id,
            id: wpe.exercise.id,
            name: wpe.exercise.name,
            categoryId: wpe.exercise.categoryId,
            category: wpe.exercise.category,
            targetSets: wpe.targetSets,
            targetMinReps: wpe.targetMinReps,
            targetMaxReps: wpe.targetMaxReps,
          }))
        : [],
    };
  }

  async create(userId: string, dto: CreateWorkoutPlanDto) {
    await this.validateExercisesAccessibility(dto.exercises, userId);

    try {
      const plan = await this.prisma.workoutPlan.create({
        data: {
          name: dto.name,
          userId,
          exercises: {
            create: dto.exercises.map((item) => ({
              exerciseId: item.exerciseId,
              targetSets: item.targetSets,
              targetMinReps: item.targetMinReps,
              targetMaxReps: item.targetMaxReps,
            })),
          },
        },
        include: {
          exercises: {
            include: {
              exercise: {
                select: { id: true, name: true, categoryId: true },
              },
            },
          },
        },
      });

      return this.formatWorkoutPlan(plan);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao criar o plano de treino.',
      );
    }
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: Prisma.WorkoutPlanWhereInput = {
      userId,
      deletedAt: null,
    };

    const [total, data] = await Promise.all([
      this.prisma.workoutPlan.count({ where }),
      this.prisma.workoutPlan.findMany({
        where,
        take: limit,
        skip,
        include: {
          exercises: {
            include: {
              exercise: {
                select: { id: true, name: true, categoryId: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      data: data.map((plan) => this.formatWorkoutPlan(plan)),
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string, userId: string) {
    const plan = await this.prisma.workoutPlan.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include: {
        exercises: {
          include: {
            exercise: {
              include: {
                category: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plano de treino não encontrado.');
    }

    return this.formatWorkoutPlan(plan);
  }

  async update(id: string, userId: string, dto: UpdateWorkoutPlanDto) {
    await this.findOne(id, userId);

    if (dto.exercises) {
      await this.validateExercisesAccessibility(dto.exercises, userId);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.workoutPlan.update({
          where: { id },
          data: {
            name: dto.name,
          },
        });

        if (dto.exercises !== undefined) {
          // Remove fisicamente as conexões antigas
          await tx.workoutPlanExercise.deleteMany({
            where: { workoutPlanId: id },
          });

          if (dto.exercises.length > 0) {
            await tx.workoutPlanExercise.createMany({
              data: dto.exercises.map((item) => ({
                workoutPlanId: id,
                exerciseId: item.exerciseId,
                targetSets: item.targetSets,
                targetMinReps: item.targetMinReps,
                targetMaxReps: item.targetMaxReps,
              })),
            });
          }
        }

        const updatedPlan = await tx.workoutPlan.findUnique({
          where: { id },
          include: {
            exercises: {
              include: {
                exercise: {
                  select: { id: true, name: true, categoryId: true },
                },
              },
            },
          },
        });

        return this.formatWorkoutPlan(updatedPlan);
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao atualizar o plano de treino.',
      );
    }
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    try {
      await this.prisma.$transaction(async (tx) => {
        const now = new Date();

        await tx.workoutPlan.update({
          where: { id },
          data: { deletedAt: now },
        });

        await tx.workoutPlanExercise.deleteMany({
          where: { workoutPlanId: id },
        });
      });

      return {
        message:
          'Plano de treino e associações de exercícios removidos com sucesso.',
      };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao remover o plano de treino.',
      );
    }
  }
}
