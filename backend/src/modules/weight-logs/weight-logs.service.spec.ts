import { Test, TestingModule } from '@nestjs/testing';
import { WeightLogsService } from './weight-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

const mockPrismaService = {
  weightLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    aggregate: jest.fn(),
    update: jest.fn(),
  },
  nutritionGoal: {
    findUnique: jest.fn(),
  },
};

describe('WeightLogsService', () => {
  let service: WeightLogsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeightLogsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WeightLogsService>(WeightLogsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  const userId = 'user-1';

  describe('create', () => {
    it('deve registrar uma pesagem com sucesso', async () => {
      const createDto = {
        weight: 82.5,
        date: '2026-08-25T08:00:00.000Z',
        notes: 'Pós-treino',
      };

      const expectedResponse = {
        id: 'weight-1',
        weight: new Prisma.Decimal(82.5),
        date: new Date(createDto.date),
        notes: 'Pós-treino',
        createdAt: new Date(),
      };

      prisma.weightLog.create.mockResolvedValue(expectedResponse);

      const result = await service.create(userId, createDto);

      expect(prisma.weightLog.create).toHaveBeenCalledWith({
        data: {
          weight: new Prisma.Decimal(82.5),
          date: new Date(createDto.date),
          notes: 'Pós-treino',
          userId,
        },
        select: expect.any(Object),
      });

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada e ordenada por data decrescente', async () => {
      const mockLogs = [
        {
          id: '1',
          weight: new Prisma.Decimal(80),
          date: new Date('2026-08-20'),
        },
        {
          id: '2',
          weight: new Prisma.Decimal(81),
          date: new Date('2026-08-10'),
        },
      ];

      prisma.weightLog.count.mockResolvedValue(2);
      prisma.weightLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.findAll(userId, { page: 1, limit: 20 });

      expect(prisma.weightLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, deletedAt: null },
          orderBy: { date: 'desc' },
        }),
      );
      expect(result.data).toEqual(mockLogs);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('getLatest', () => {
    it('deve calcular o delta em relação à pesagem anterior e a distância para a meta', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          weight: new Prisma.Decimal(78.0),
          date: new Date('2026-08-25'),
        },
        {
          id: 'log-2',
          weight: new Prisma.Decimal(79.2),
          date: new Date('2026-08-18'),
        },
      ];

      const mockGoal = {
        targetWeight: new Prisma.Decimal(75.0),
      };

      prisma.weightLog.findMany.mockResolvedValue(mockLogs);
      prisma.nutritionGoal.findUnique.mockResolvedValue(mockGoal);

      const result = await service.getLatest(userId);

      expect(result.latest).toEqual(mockLogs[0]);
      expect(result.previous).toEqual(mockLogs[1]);
      expect(result.deltaFromPrevious).toBe(-1.2); // 78.0 - 79.2 = -1.2 kg
      expect(result.targetWeight).toBe(75.0);
      expect(result.distanceToTarget).toBe(3.0); // 78.0 - 75.0 = 3.0 kg
    });

    it('deve retornar campos nulos quando não houver histórico de pesagem', async () => {
      prisma.weightLog.findMany.mockResolvedValue([]);
      prisma.nutritionGoal.findUnique.mockResolvedValue(null);

      const result = await service.getLatest(userId);

      expect(result.latest).toBeNull();
      expect(result.deltaFromPrevious).toBeNull();
      expect(result.distanceToTarget).toBeNull();
    });
  });

  describe('getStats', () => {
    it('deve consolidar estatísticas de peso inicial, atual, mínimo, máximo e variação total', async () => {
      prisma.weightLog.aggregate.mockResolvedValue({
        _min: { weight: new Prisma.Decimal(77.5) },
        _max: { weight: new Prisma.Decimal(85.0) },
        _count: { id: 5 },
      });

      prisma.weightLog.findFirst
        .mockResolvedValueOnce({
          weight: new Prisma.Decimal(85.0),
          date: new Date('2026-01-01'),
        }) // Inicial (date ASC)
        .mockResolvedValueOnce({
          weight: new Prisma.Decimal(78.0),
          date: new Date('2026-08-25'),
        }); // Atual (date DESC)

      const result = await service.getStats(userId);

      expect(result).toEqual({
        totalRecords: 5,
        initialWeight: 85.0,
        initialDate: expect.any(Date),
        currentWeight: 78.0,
        currentDate: expect.any(Date),
        minWeight: 77.5,
        maxWeight: 85.0,
        totalVariation: -7.0, // 78.0 - 85.0 = -7.0 kg
      });
    });

    it('deve retornar zeros e valores nulos caso o usuário não possua pesagens', async () => {
      prisma.weightLog.aggregate.mockResolvedValue({
        _min: { weight: null },
        _max: { weight: null },
        _count: { id: 0 },
      });
      prisma.weightLog.findFirst.mockResolvedValue(null);

      const result = await service.getStats(userId);

      expect(result.totalRecords).toBe(0);
      expect(result.totalVariation).toBeNull();
    });
  });

  describe('update', () => {
    it('deve atualizar uma pesagem existente pertencente ao usuário', async () => {
      prisma.weightLog.findFirst.mockResolvedValue({
        id: 'log-1',
        userId,
        deletedAt: null,
      });
      prisma.weightLog.update.mockResolvedValue({
        id: 'log-1',
        weight: new Prisma.Decimal(79.0),
      });

      const result = await service.update('log-1', userId, { weight: 79.0 });

      expect(prisma.weightLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'log-1' },
          data: { weight: new Prisma.Decimal(79.0) },
        }),
      );
      expect(result.weight).toEqual(new Prisma.Decimal(79.0));
    });
  });

  describe('remove', () => {
    it('deve executar o soft delete na pesagem', async () => {
      prisma.weightLog.findFirst.mockResolvedValue({
        id: 'log-1',
        userId,
        deletedAt: null,
      });
      prisma.weightLog.update.mockResolvedValue({
        id: 'log-1',
        deletedAt: new Date(),
      });

      const result = await service.remove('log-1', userId);

      expect(prisma.weightLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toEqual({
        message: 'Registro de pesagem removido com sucesso.',
      });
    });

    it('deve lançar NotFoundException ao tentar deletar pesagem inexistente', async () => {
      prisma.weightLog.findFirst.mockResolvedValue(null);

      await expect(service.remove('invalid-id', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
