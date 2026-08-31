import { Test, TestingModule } from '@nestjs/testing';
import { WorkoutSessionsService } from './workout-sessions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

const mockPrismaService = {
  workoutPlan: {
    findFirst: jest.fn(),
  },
  workoutSession: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  exercise: {
    findFirst: jest.fn(),
  },
  setLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((cb) => cb(mockPrismaService)),
};

describe('WorkoutSessionsService', () => {
  let service: WorkoutSessionsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutSessionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WorkoutSessionsService>(WorkoutSessionsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    const userId = 'user-uuid-1';
    const dto = { workoutPlanId: 'plan-uuid-1' };

    it('deve iniciar uma sessão de treino e retornar os dados enriquecidos com badges', async () => {
      prisma.workoutPlan.findFirst.mockResolvedValue({
        id: dto.workoutPlanId,
        name: 'Treino A',
      });
      // Nenhuma sessão ativa no momento
      prisma.workoutSession.findFirst
        .mockResolvedValueOnce(null) // activeSession check
        .mockResolvedValueOnce({    // getLiveSession query
          id: 'session-uuid-1',
          workoutPlanId: dto.workoutPlanId,
          startedAt: new Date(),
          finishedAt: null,
          workoutPlan: {
            id: dto.workoutPlanId,
            name: 'Treino A',
            exercises: [
              {
                exerciseId: 'ex-1',
                targetSets: 4,
                targetMinReps: 8,
                targetMaxReps: 12,
                exercise: {
                  name: 'Supino Reto',
                  category: { id: 'cat-1', name: 'Peito' },
                },
              },
            ],
          },
          setLogs: [],
        })
        .mockResolvedValueOnce({    // getLastWorkoutLogsForExercise
          id: 'old-session-uuid',
          setLogs: [
            { id: 'old-1', reps: 10, weight: new Prisma.Decimal(60), toFailure: false },
          ],
        });

      prisma.workoutSession.create.mockResolvedValue({
        id: 'session-uuid-1',
        workoutPlanId: dto.workoutPlanId,
        userId,
      });

      const result = await service.startSession(userId, dto);
      expect(result).toHaveProperty('sessionId', 'session-uuid-1');
      expect(result.exercises[0].lastWorkoutLogs).toEqual([
        { reps: 10, weight: 60, toFailure: false },
      ]);
    });

    it('deve lançar NotFoundException se o plano de treino não existir', async () => {
      prisma.workoutPlan.findFirst.mockResolvedValue(null);
      await expect(service.startSession(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.workoutSession.create).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException se já houver uma sessão ativa em andamento', async () => {
      prisma.workoutPlan.findFirst.mockResolvedValue({
        id: dto.workoutPlanId,
        name: 'Treino A',
      });
      prisma.workoutSession.findFirst.mockResolvedValue({
        id: 'active-session-uuid',
      });

      await expect(service.startSession(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.workoutSession.create).not.toHaveBeenCalled();
    });
  });

  describe('logSet', () => {
    const sessionId = 'session-uuid-1';
    const userId = 'user-uuid-1';
    const dto = {
      exerciseId: 'exercise-uuid-1',
      reps: 10,
      weight: 50.0,
      toFailure: false,
    };

    it('deve registrar um set com sucesso se a sessão estiver ativa e o exercício pertencer ao plano', async () => {
      prisma.workoutSession.findFirst.mockResolvedValue({
        id: sessionId,
        workoutPlanId: 'plan-uuid-1',
      });
      prisma.exercise.findFirst.mockResolvedValue({
        id: dto.exerciseId,
        name: 'Supino Reto',
      });
      const expectedLog = {
        id: 'log-uuid-1',
        exerciseId: dto.exerciseId,
        reps: dto.reps,
        weight: new Prisma.Decimal(dto.weight),
        toFailure: dto.toFailure,
        createdAt: new Date(),
      };
      prisma.setLog.create.mockResolvedValue(expectedLog);

      const result = await service.logSet(sessionId, userId, dto);
      expect(result).toEqual({
        id: 'log-uuid-1',
        exerciseId: dto.exerciseId,
        reps: 10,
        weight: 50.0,
        toFailure: false,
        createdAt: expectedLog.createdAt,
      });
    });
  });

  describe('getExerciseProgress', () => {
    const exerciseId = 'exercise-uuid-1';
    const userId = 'user-uuid-1';

    it('deve calcular corretamente a progressão e o volume total (reps * weight)', async () => {
      prisma.exercise.findFirst.mockResolvedValue({
        id: exerciseId,
        name: 'Supino Reto',
      });
      const mockLogs = [
        {
          id: 'log-1',
          reps: 10,
          weight: new Prisma.Decimal(60.0),
          toFailure: false,
          workoutSession: { startedAt: new Date('2024-03-10T10:00:00Z') },
        },
        {
          id: 'log-2',
          reps: 8,
          weight: new Prisma.Decimal(65.0),
          toFailure: true,
          workoutSession: { startedAt: new Date('2024-03-15T10:00:00Z') },
        },
      ];
      prisma.setLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getExerciseProgress(exerciseId, userId);
      expect(result.exercise.name).toBe('Supino Reto');
      expect(result.history).toHaveLength(2);
      expect(result.history[0]).toEqual({
        setId: 'log-1',
        date: mockLogs[0].workoutSession.startedAt,
        reps: 10,
        weight: 60.0,
        toFailure: false,
        volume: 600.0,
      });
      expect(result.history[1].volume).toBe(520.0);
    });
  });
});
