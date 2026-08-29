import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWeightGoalDto } from './dto/create-weight-goal.dto';
import { UpdateWeightGoalDto } from './dto/update-weight-goal.dto';
import { FindWeightGoalsQueryDto } from './dto/find-weight-goals-query.dto';
import { GoalStatus, Prisma } from '../../generated/prisma/client';

export type AdherenceStatus =
  | 'ON_TRACK'
  | 'AHEAD_OF_SCHEDULE'
  | 'BEHIND_SCHEDULE'
  | 'GOAL_REACHED'
  | 'GAINING_WEIGHT'
  | 'INSUFFICIENT_DATA';

export interface GoalProgressAnalytics {
  goalId: string;
  status: GoalStatus;
  startDate: Date;
  targetDate: Date | null;
  daysElapsed: number;
  startWeight: number;
  currentWeight: number;
  targetWeight: number;
  totalToLose: number;
  totalLost: number;
  remainingToLose: number;
  progressPercentage: number;
  weeklyRateGoal: number | null;
  actualWeeklyPace: number;
  projectedCompletionDate: Date | null;
  adherence: AdherenceStatus;
  adherenceMessage: string;
}

@Injectable()
export class WeightGoalsService {
  private readonly logger = new Logger(WeightGoalsService.name);

  private readonly goalSelect: Prisma.WeightGoalSelect = {
    id: true,
    startWeight: true,
    targetWeight: true,
    startDate: true,
    targetDate: true,
    weeklyRateGoal: true,
    status: true,
    notes: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
  };

  constructor(private readonly prisma: PrismaService) {}

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private round1(value: number): number {
    return Math.round((value + Number.EPSILON) * 10) / 10;
  }

  private calculateAnalytics(
    goal: {
      id: string;
      startWeight: Prisma.Decimal | number;
      targetWeight: Prisma.Decimal | number;
      startDate: Date;
      targetDate: Date | null;
      weeklyRateGoal: Prisma.Decimal | number | null;
      status: GoalStatus;
    },
    latestLog: { weight: Prisma.Decimal | number; date: Date } | null,
  ): GoalProgressAnalytics {
    const startWeight = Number(goal.startWeight);
    const targetWeight = Number(goal.targetWeight);
    const currentWeight = latestLog ? Number(latestLog.weight) : startWeight;

    const totalToLose = this.round2(startWeight - targetWeight);
    const totalLost = this.round2(startWeight - currentWeight);
    const remainingToLose = this.round2(currentWeight - targetWeight);

    let progressPercentage = 0;
    if (totalToLose > 0) {
      progressPercentage = this.round1((totalLost / totalToLose) * 100);
    }

    const now = new Date();
    const startDate = new Date(goal.startDate);
    const diffTime = Math.max(0, now.getTime() - startDate.getTime());
    const daysElapsed = Math.max(
      1,
      Math.floor(diffTime / (1000 * 60 * 60 * 24)),
    );

    const actualDailyPace = totalLost / daysElapsed;
    const actualWeeklyPace = this.round2(actualDailyPace * 7);

    let projectedCompletionDate: Date | null = null;
    if (actualDailyPace > 0 && remainingToLose > 0) {
      const daysNeeded = Math.ceil(remainingToLose / actualDailyPace);
      projectedCompletionDate = new Date();
      projectedCompletionDate.setDate(
        projectedCompletionDate.getDate() + daysNeeded,
      );
    }

    let adherence: AdherenceStatus = 'INSUFFICIENT_DATA';
    let adherenceMessage =
      'Aguardando mais registros de pesagem para calcular o ritmo.';

    const weeklyRateGoal = goal.weeklyRateGoal
      ? Number(goal.weeklyRateGoal)
      : null;

    if (currentWeight <= targetWeight) {
      adherence = 'GOAL_REACHED';
      adherenceMessage =
        '🎉 Parabéns! Você atingiu ou superou o seu peso objetivo!';
    } else if (totalLost < 0) {
      adherence = 'GAINING_WEIGHT';
      adherenceMessage =
        'Atenção: O peso atual está acima do peso inicial desta meta.';
    } else if (weeklyRateGoal && weeklyRateGoal > 0) {
      const ratio = actualWeeklyPace / weeklyRateGoal;
      if (ratio >= 1.15) {
        adherence = 'AHEAD_OF_SCHEDULE';
        adherenceMessage =
          'Excelente! Você está perdendo peso mais rápido que o ritmo planejado.';
      } else if (ratio >= 0.85) {
        adherence = 'ON_TRACK';
        adherenceMessage =
          'Ótimo trabalho! Seu ritmo está perfeitamente alinhado com a meta planejada.';
      } else {
        adherence = 'BEHIND_SCHEDULE';
        adherenceMessage =
          'Ritmo abaixo do planejado. Considere avaliar seu balanço calórico diário.';
      }
    } else if (actualWeeklyPace > 0) {
      adherence = 'ON_TRACK';
      adherenceMessage = `Evolução constante: média de ${actualWeeklyPace} kg eliminados por semana.`;
    }

    return {
      goalId: goal.id,
      status: goal.status,
      startDate: goal.startDate,
      targetDate: goal.targetDate,
      daysElapsed,
      startWeight,
      currentWeight,
      targetWeight,
      totalToLose,
      totalLost,
      remainingToLose,
      progressPercentage,
      weeklyRateGoal,
      actualWeeklyPace,
      projectedCompletionDate,
      adherence,
      adherenceMessage,
    };
  }

  async create(userId: string, dto: CreateWeightGoalDto) {
    let startWeight = dto.startWeight;

    if (startWeight === undefined || startWeight === null) {
      const latestWeightLog = await this.prisma.weightLog.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { date: 'desc' },
      });

      if (!latestWeightLog) {
        throw new BadRequestException(
          'Peso inicial não fornecido e nenhum registro de pesagem anterior foi localizado. Informe startWeight ou registre uma pesagem primeiro.',
        );
      }
      startWeight = Number(latestWeightLog.weight);
    }

    if (dto.targetWeight >= startWeight) {
      throw new BadRequestException(
        `O peso alvo (${dto.targetWeight} kg) deve ser estritamente menor que o peso inicial (${startWeight} kg) em uma meta de perda de peso.`,
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.status === GoalStatus.ACTIVE || dto.status === undefined) {
          await tx.weightGoal.updateMany({
            where: {
              userId,
              status: GoalStatus.ACTIVE,
              deletedAt: null,
            },
            data: { status: GoalStatus.ABANDONED },
          });
        }

        const createdGoal = await tx.weightGoal.create({
          data: {
            startWeight: new Prisma.Decimal(startWeight),
            targetWeight: new Prisma.Decimal(dto.targetWeight),
            startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
            targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
            weeklyRateGoal:
              dto.weeklyRateGoal !== undefined && dto.weeklyRateGoal !== null
                ? new Prisma.Decimal(dto.weeklyRateGoal)
                : null,
            status: dto.status ?? GoalStatus.ACTIVE,
            notes: dto.notes,
            userId,
          },
          select: this.goalSelect,
        });

        return createdGoal;
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao cadastrar a meta de peso.',
      );
    }
  }

  async getCurrentGoal(userId: string) {
    const activeGoal = await this.prisma.weightGoal.findFirst({
      where: {
        userId,
        status: GoalStatus.ACTIVE,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: this.goalSelect,
    });

    if (!activeGoal) {
      throw new NotFoundException(
        'Nenhuma meta de perda de peso ativa encontrada para o usuário.',
      );
    }

    const latestWeightLog = await this.prisma.weightLog.findFirst({
      where: {
        userId,
        deletedAt: null,
        date: { gte: activeGoal.startDate },
      },
      orderBy: { date: 'desc' },
      select: { weight: true, date: true },
    });

    const fallbackLatest = latestWeightLog
      ? latestWeightLog
      : await this.prisma.weightLog.findFirst({
          where: { userId, deletedAt: null },
          orderBy: { date: 'desc' },
          select: { weight: true, date: true },
        });

    const analytics = this.calculateAnalytics(activeGoal, fallbackLatest);

    return {
      goal: activeGoal,
      analytics,
    };
  }

  async findAll(userId: string, query: FindWeightGoalsQueryDto) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.WeightGoalWhereInput = {
      userId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    try {
      const [total, data] = await Promise.all([
        this.prisma.weightGoal.count({ where }),
        this.prisma.weightGoal.findMany({
          where,
          take: limit,
          skip,
          select: this.goalSelect,
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
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao listar histórico de metas.',
      );
    }
  }

  async findOne(id: string, userId: string) {
    const goal = await this.prisma.weightGoal.findFirst({
      where: { id, userId, deletedAt: null },
      select: this.goalSelect,
    });

    if (!goal) {
      throw new NotFoundException('Meta de peso não encontrada.');
    }

    const latestLog = await this.prisma.weightLog.findFirst({
      where: {
        userId,
        deletedAt: null,
        date: { gte: goal.startDate },
      },
      orderBy: { date: 'desc' },
      select: { weight: true, date: true },
    });

    const analytics = this.calculateAnalytics(goal, latestLog);

    return {
      goal,
      analytics,
    };
  }

  async update(id: string, userId: string, dto: UpdateWeightGoalDto) {
    const existing = await this.prisma.weightGoal.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Meta de peso não encontrada.');
    }

    const updateData: Prisma.WeightGoalUpdateInput = {};

    if (dto.startWeight !== undefined) {
      updateData.startWeight = new Prisma.Decimal(dto.startWeight);
    }
    if (dto.targetWeight !== undefined) {
      updateData.targetWeight = new Prisma.Decimal(dto.targetWeight);
    }
    if (dto.startDate !== undefined) {
      updateData.startDate = new Date(dto.startDate);
    }
    if (dto.targetDate !== undefined) {
      updateData.targetDate = dto.targetDate ? new Date(dto.targetDate) : null;
    }
    if (dto.weeklyRateGoal !== undefined) {
      updateData.weeklyRateGoal =
        dto.weeklyRateGoal !== null
          ? new Prisma.Decimal(dto.weeklyRateGoal)
          : null;
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }
    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    try {
      return await this.prisma.weightGoal.update({
        where: { id },
        data: updateData,
        select: this.goalSelect,
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao atualizar a meta de peso.',
      );
    }
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.weightGoal.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Meta de peso não encontrada.');
    }

    try {
      await this.prisma.weightGoal.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: GoalStatus.ABANDONED,
        },
      });
      return { message: 'Meta de peso removida com sucesso.' };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao remover a meta de peso.');
    }
  }
}
