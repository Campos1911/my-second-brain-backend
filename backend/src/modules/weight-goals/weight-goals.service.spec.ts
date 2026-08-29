import { Test, TestingModule } from '@nestjs/testing';
import { WeightGoalsService } from './weight-goals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GoalStatus, Prisma } from '../../generated/prisma/client';

const mockPrismaService = {
  weightGoal: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  weightLog: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(async (callback) => {
    return await callback(mockPrismaService);
  }),
};

describe('WeightGoalsService', () => {
  let service: WeightGoalsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeightGoalsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WeightGoalsService>(WeightGoalsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  const userId = 'user-uuid-1';

  describe('create', () => {
    it('deve cadastrar uma meta de peso com peso inicial informado e arquivar metas ativas anteriores', async () => {
      const dto = {
        startWeight: 85.0,
        targetWeight: 75.0,
        weeklyRateGoal: 0.5,
        notes: 'Cutting 20 semanas',
      };

      const expectedResponse = {
        id: 'goal-uuid-1',
        startWeight: new Prisma.Decimal(85.0),
        targetWeight: new Prisma.Decimal(75.0),
        startDate: new Date(),
        targetDate: null,
        weeklyRateGoal: new Prisma.Decimal(0.5),
        status: GoalStatus.ACTIVE,
        notes: 'Cutting 20 semanas',
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.weightGoal.create.mockResolvedValue(expectedResponse);

      const result = await service.create(userId, dto);

      expect(prisma.weightGoal.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: GoalStatus.ACTIVE,
          deletedAt: null,
        },
        data: { status: GoalStatus.ABANDONED },
      });

      expect(prisma.weightGoal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startWeight: new Prisma.Decimal(85.0),
          targetWeight: new Prisma.Decimal(75.0),
          weeklyRateGoal: new Prisma.Decimal(0.5),
          status: GoalStatus.ACTIVE,
          userId,
        }),
        select: expect.any(Object),
      });

      expect(result).toEqual(expectedResponse);
    });

    it('deve usar o peso do registro de pesagem mais recente quando startWeight não for informado', async () => {
      const dto = {
        targetWeight: 70.0,
      };

      prisma.weightLog.findFirst.mockResolvedValue({
        id: 'weight-log-latest',
        weight: new Prisma.Decimal(82.5),
        date: new Date(),
      });

      prisma.weightGoal.create.mockResolvedValue({
        id: 'goal-auto-start',
        startWeight: new Prisma.Decimal(82.5),
        targetWeight: new Prisma.Decimal(70.0),
      });

      await service.create(userId, dto);

      expect(prisma.weightLog.findFirst).toHaveBeenCalledWith({
        where: { userId, deletedAt: null },
        orderBy: { date: 'desc' },
      });

      expect(prisma.weightGoal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startWeight: new Prisma.Decimal(82.5),
            targetWeight: new Prisma.Decimal(70.0),
          }),
        }),
      );
    });

    it('deve lançar BadRequestException se startWeight for omitido e não houver histórico de pesagens', async () => {
      prisma.weightLog.findFirst.mockResolvedValue(null);

      await expect(
        service.create(userId, { targetWeight: 70.0 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.weightGoal.create).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException se targetWeight for maior ou igual ao startWeight', async () => {
      const dto = {
        startWeight: 80.0,
        targetWeight: 85.0,
      };

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.weightGoal.create).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentGoal & Motor de Cálculos Analíticos', () => {
    it('deve calcular o progresso, ritmo real e prever conclusão com aderência ON_TRACK', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14); // 14 dias atrás (2 semanas)

      const activeGoal = {
        id: 'goal-active',
        startWeight: new Prisma.Decimal(85.0),
        targetWeight: new Prisma.Decimal(75.0), // Total a perder = 10kg
        startDate,
        targetDate: null,
        weeklyRateGoal: new Prisma.Decimal(0.5), // Meta = 0.5 kg/semana
        status: GoalStatus.ACTIVE,
      };

      const latestLog = {
        weight: new Prisma.Decimal(84.0), // Perdeu 1.0kg em 14 dias (0.5 kg/semana)
        date: new Date(),
      };

      prisma.weightGoal.findFirst.mockResolvedValue(activeGoal);
      prisma.weightLog.findFirst.mockResolvedValue(latestLog);

      const result = await service.getCurrentGoal(userId);

      expect(result.analytics.totalToLose).toBe(10.0);
      expect(result.analytics.totalLost).toBe(1.0);
      expect(result.analytics.remainingToLose).toBe(9.0);
      expect(result.analytics.progressPercentage).toBe(10.0);
      expect(result.analytics.actualWeeklyPace).toBe(0.5);
      expect(result.analytics.adherence).toBe('ON_TRACK');
      expect(result.analytics.projectedCompletionDate).not.toBeNull();
    });

    it('deve classificar aderência como AHEAD_OF_SCHEDULE quando a perda for superior a 15% da meta', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);

      const activeGoal = {
        id: 'goal-fast',
        startWeight: new Prisma.Decimal(85.0),
        targetWeight: new Prisma.Decimal(75.0),
        startDate,
        targetDate: null,
        weeklyRateGoal: new Prisma.Decimal(0.5),
        status: GoalStatus.ACTIVE,
      };

      const latestLog = {
        weight: new Prisma.Decimal(83.0), // Perdeu 2kg em 14 dias = 1.0 kg/sem (2x a meta de 0.5)
        date: new Date(),
      };

      prisma.weightGoal.findFirst.mockResolvedValue(activeGoal);
      prisma.weightLog.findFirst.mockResolvedValue(latestLog);

      const result = await service.getCurrentGoal(userId);

      expect(result.analytics.actualWeeklyPace).toBe(1.0);
      expect(result.analytics.adherence).toBe('AHEAD_OF_SCHEDULE');
    });

    it('deve classificar aderência como BEHIND_SCHEDULE quando a perda for inferior ao planejado', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);

      const activeGoal = {
        id: 'goal-slow',
        startWeight: new Prisma.Decimal(85.0),
        targetWeight: new Prisma.Decimal(75.0),
        startDate,
        targetDate: null,
        weeklyRateGoal: new Prisma.Decimal(0.5),
        status: GoalStatus.ACTIVE,
      };

      const latestLog = {
        weight: new Prisma.Decimal(84.7), // Perdeu apenas 0.3kg em 14 dias = 0.15 kg/sem
        date: new Date(),
      };

      prisma.weightGoal.findFirst.mockResolvedValue(activeGoal);
      prisma.weightLog.findFirst.mockResolvedValue(latestLog);

      const result = await service.getCurrentGoal(userId);

      expect(result.analytics.adherence).toBe('BEHIND_SCHEDULE');
    });

    it('deve classificar como GOAL_REACHED quando o peso atual for menor ou igual ao peso alvo', async () => {
      const activeGoal = {
        id: 'goal-done',
        startWeight: new Prisma.Decimal(80.0),
        targetWeight: new Prisma.Decimal(75.0),
        startDate: new Date(),
        targetDate: null,
        weeklyRateGoal: null,
        status: GoalStatus.ACTIVE,
      };

      const latestLog = {
        weight: new Prisma.Decimal(74.8),
        date: new Date(),
      };

      prisma.weightGoal.findFirst.mockResolvedValue(activeGoal);
      prisma.weightLog.findFirst.mockResolvedValue(latestLog);

      const result = await service.getCurrentGoal(userId);

      expect(result.analytics.adherence).toBe('GOAL_REACHED');
      expect(result.analytics.adherenceMessage).toContain('Parabéns');
    });

    it('deve classificar como GAINING_WEIGHT se o peso atual for maior que o peso inicial', async () => {
      const activeGoal = {
        id: 'goal-rebound',
        startWeight: new Prisma.Decimal(80.0),
        targetWeight: new Prisma.Decimal(75.0),
        startDate: new Date(),
        targetDate: null,
        weeklyRateGoal: null,
        status: GoalStatus.ACTIVE,
      };

      const latestLog = {
        weight: new Prisma.Decimal(81.5),
        date: new Date(),
      };

      prisma.weightGoal.findFirst.mockResolvedValue(activeGoal);
      prisma.weightLog.findFirst.mockResolvedValue(latestLog);

      const result = await service.getCurrentGoal(userId);

      expect(result.analytics.adherence).toBe('GAINING_WEIGHT');
    });

    it('deve lançar NotFoundException quando o usuário não tiver meta ativa', async () => {
      prisma.weightGoal.findFirst.mockResolvedValue(null);

      await expect(service.getCurrentGoal(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('deve listar metas paginadas com metadados', async () => {
      const mockGoals = [
        {
          id: '1',
          startWeight: new Prisma.Decimal(85),
          targetWeight: new Prisma.Decimal(75),
        },
      ];

      prisma.weightGoal.count.mockResolvedValue(1);
      prisma.weightGoal.findMany.mockResolvedValue(mockGoals);

      const result = await service.findAll(userId, { page: 1, limit: 20 });

      expect(prisma.weightGoal.findMany).toHaveBeenCalledWith({
        where: { userId, deletedAt: null },
        take: 20,
        skip: 0,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });

      expect(result.data).toEqual(mockGoals);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('update', () => {
    it('deve atualizar parâmetros de uma meta existente', async () => {
      prisma.weightGoal.findFirst.mockResolvedValue({ id: 'goal-1', userId });
      prisma.weightGoal.update.mockResolvedValue({
        id: 'goal-1',
        targetWeight: new Prisma.Decimal(72.0),
      });

      const result = await service.update('goal-1', userId, {
        targetWeight: 72.0,
      });

      expect(prisma.weightGoal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: { targetWeight: new Prisma.Decimal(72.0) },
        select: expect.any(Object),
      });

      expect(result.targetWeight).toEqual(new Prisma.Decimal(72.0));
    });
  });

  describe('remove', () => {
    it('deve aplicar soft delete e arquivar status para ABANDONED', async () => {
      prisma.weightGoal.findFirst.mockResolvedValue({ id: 'goal-1', userId });
      prisma.weightGoal.update.mockResolvedValue({
        id: 'goal-1',
        deletedAt: new Date(),
        status: GoalStatus.ABANDONED,
      });

      const result = await service.remove('goal-1', userId);

      expect(prisma.weightGoal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: {
          deletedAt: expect.any(Date),
          status: GoalStatus.ABANDONED,
        },
      });

      expect(result).toEqual({ message: 'Meta de peso removida com sucesso.' });
    });
  });
});
