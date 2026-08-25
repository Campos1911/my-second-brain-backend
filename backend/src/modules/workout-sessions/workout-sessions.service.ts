import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StartSessionDto } from './dto/start-session.dto';
import { LogSetDto } from './dto/log-set.dto';
import { UpdateSetLogDto } from './dto/update-set-log.dto';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class WorkoutSessionsService {
  private readonly logger = new Logger(WorkoutSessionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async startSession(userId: string, dto: StartSessionDto) {
    const plan = await this.prisma.workoutPlan.findFirst({
      where: {
        id: dto.workoutPlanId,
        userId,
        deletedAt: null,
      },
    });

    if (!plan) {
      throw new NotFoundException(
        'Plano de treino não encontrado ou indisponível.',
      );
    }

    const activeSession = await this.prisma.workoutSession.findFirst({
      where: {
        userId,
        finishedAt: null,
        deletedAt: null,
      },
    });

    if (activeSession) {
      throw new BadRequestException(
        'Você já possui uma sessão de treino em andamento. Finalize-a antes de iniciar uma nova.',
      );
    }

    try {
      return await this.prisma.workoutSession.create({
        data: {
          workoutPlanId: dto.workoutPlanId,
          userId,
        },
        include: {
          workoutPlan: {
            select: { name: true },
          },
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao iniciar a sessão de treino.',
      );
    }
  }

  async logSet(sessionId: string, userId: string, dto: LogSetDto) {
    const session = await this.prisma.workoutSession.findFirst({
      where: {
        id: sessionId,
        userId,
        finishedAt: null,
        deletedAt: null,
      },
    });

    if (!session) {
      throw new NotFoundException(
        'Sessão de treino ativa não encontrada. Garanta que o treino esteja iniciado.',
      );
    }

    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: dto.exerciseId,
        deletedAt: null,
        workoutPlanExercises: {
          some: {
            workoutPlanId: session.workoutPlanId,
          },
        },
      },
    });

    if (!exercise) {
      throw new BadRequestException(
        'O exercício informado não faz parte deste plano de treino.',
      );
    }

    try {
      return await this.prisma.setLog.create({
        data: {
          workoutSessionId: sessionId,
          exerciseId: dto.exerciseId,
          reps: dto.reps,
          weight: new Prisma.Decimal(dto.weight),
          toFailure: dto.toFailure ?? false,
        },
        select: {
          id: true,
          exerciseId: true,
          reps: true,
          weight: true,
          toFailure: true,
          createdAt: true,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao salvar a série.');
    }
  }

  async finishSession(sessionId: string, userId: string) {
    const session = await this.prisma.workoutSession.findFirst({
      where: {
        id: sessionId,
        userId,
        finishedAt: null,
        deletedAt: null,
      },
    });

    if (!session) {
      throw new NotFoundException(
        'Sessão de treino ativa não encontrada ou já finalizada.',
      );
    }

    try {
      return await this.prisma.workoutSession.update({
        where: { id: sessionId },
        data: {
          finishedAt: new Date(),
        },
        include: {
          setLogs: {
            where: { deletedAt: null },
            select: { id: true, reps: true, weight: true },
          },
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao finalizar a sessão de treino.',
      );
    }
  }

  async findAll(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const where: Prisma.WorkoutSessionWhereInput = {
      userId,
      deletedAt: null,
    };

    const [total, data] = await Promise.all([
      this.prisma.workoutSession.count({ where }),
      this.prisma.workoutSession.findMany({
        where,
        take: limit,
        skip,
        include: {
          workoutPlan: {
            select: { name: true },
          },
          _count: {
            select: { setLogs: { where: { deletedAt: null } } },
          },
        },
        orderBy: { startedAt: 'desc' },
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
    const session = await this.prisma.workoutSession.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include: {
        workoutPlan: {
          select: { name: true },
        },
        setLogs: {
          where: { deletedAt: null },
          include: {
            exercise: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Sessão de treino não encontrada.');
    }

    return session;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    try {
      await this.prisma.$transaction(async (tx) => {
        const now = new Date();

        await tx.workoutSession.update({
          where: { id },
          data: { deletedAt: now },
        });

        await tx.setLog.updateMany({
          where: { workoutSessionId: id, deletedAt: null },
          data: { deletedAt: now },
        });
      });

      return {
        message: 'Sessão de treino e seus registros removidos com sucesso.',
      };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao remover a sessão de treino.',
      );
    }
  }

  // ==========================================
  // NOVOS MÉTODOS: CONTROLE INDIVIDUAL DE SÉRIES
  // ==========================================

  private async findActiveSetLogOwnedByUser(setId: string, userId: string) {
    // Apenas permite alteração de séries em sessões ativas (treino em andamento)
    const setLog = await this.prisma.setLog.findFirst({
      where: {
        id: setId,
        deletedAt: null,
        workoutSession: {
          userId,
          finishedAt: null,
          deletedAt: null,
        },
      },
    });

    if (!setLog) {
      throw new NotFoundException(
        'Série não encontrada ou o treino já foi finalizado/deletado.',
      );
    }

    return setLog;
  }

  async updateSet(setId: string, userId: string, dto: UpdateSetLogDto) {
    await this.findActiveSetLogOwnedByUser(setId, userId);

    const updateData: Prisma.SetLogUpdateInput = {};
    if (dto.reps !== undefined) updateData.reps = dto.reps;
    if (dto.toFailure !== undefined) updateData.toFailure = dto.toFailure;
    if (dto.weight !== undefined)
      updateData.weight = new Prisma.Decimal(dto.weight);

    try {
      return await this.prisma.setLog.update({
        where: { id: setId },
        data: updateData,
        select: {
          id: true,
          reps: true,
          weight: true,
          toFailure: true,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao atualizar a série.');
    }
  }

  async removeSet(setId: string, userId: string) {
    await this.findActiveSetLogOwnedByUser(setId, userId);

    try {
      await this.prisma.setLog.update({
        where: { id: setId },
        data: { deletedAt: new Date() },
      });

      return { message: 'Série removida com sucesso.' };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao remover a série.');
    }
  }

  async getExerciseProgress(exerciseId: string, userId: string) {
    // CORRIGIDO: Valida a propriedade do exercício de forma simples diretamente pelo userId ou se é global
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        deletedAt: null,
        OR: [{ userId }, { userId: null }],
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercício não localizado ou inativo.');
    }

    // 2. Buscar histórico completo de séries realizadas nesse exercício
    const logs = await this.prisma.setLog.findMany({
      where: {
        exerciseId,
        deletedAt: null,
        workoutSession: {
          userId,
          deletedAt: null,
        },
      },
      include: {
        workoutSession: {
          select: { startedAt: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 3. Mapear e estruturar os dados para exibição do progresso
    const progress = logs.map((log) => {
      const weightNum = Number(log.weight);
      return {
        setId: log.id,
        date: log.workoutSession.startedAt,
        reps: log.reps,
        weight: weightNum,
        toFailure: log.toFailure,
        volume: weightNum * log.reps, // Volume total levantado (Peso x Repetições)
      };
    });

    return {
      exercise: {
        id: exercise.id,
        name: exercise.name,
      },
      history: progress,
    };
  }
}
