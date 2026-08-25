import { Test, TestingModule } from '@nestjs/testing';
import { RecurringTransactionsService } from './recurring-transactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import {
  Prisma,
  RecurrenceFrequency,
  PaymentMethod,
} from '../../generated/prisma/client';

const mockPrismaService = {
  recurringTransaction: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  category: {
    findFirst: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (callback) => {
    // Simula o comportamento de uma transação do Prisma executando a callback
    return await callback(mockPrismaService);
  }),
};

describe('RecurringTransactionsService', () => {
  let service: RecurringTransactionsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringTransactionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RecurringTransactionsService>(
      RecurringTransactionsService,
    );
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-1';
    const dto = {
      amount: 55.9,
      description: 'Netflix',
      frequency: RecurrenceFrequency.MONTHLY,
      startDate: '2024-01-10T00:00:00.000Z',
      categoryId: 'category-1',
      paymentMethod: PaymentMethod.CREDIT,
    };

    it('deve cadastrar uma recorrência com sucesso ao validar a categoria', async () => {
      prisma.category.findFirst.mockResolvedValue({
        id: dto.categoryId,
        name: 'Assinaturas',
        type: 'EXPENSE',
      });

      const expectedRecord = {
        id: 'recurrence-1',
        amount: new Prisma.Decimal(dto.amount),
        description: dto.description,
        frequency: dto.frequency,
        startDate: new Date(dto.startDate),
        endDate: null,
        nextDate: new Date(dto.startDate),
        isActive: true,
        paymentMethod: dto.paymentMethod,
        categoryId: dto.categoryId,
        userId,
      };

      prisma.recurringTransaction.create.mockResolvedValue(expectedRecord);

      const result = await service.create(userId, dto);

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: {
          id: dto.categoryId,
          OR: [{ userId }, { userId: null }],
          deletedAt: null,
        },
      });
      expect(result).toEqual(expectedRecord);
    });

    it('deve lançar NotFoundException se a categoria não existir ou for inativa', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.recurringTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('calculateNextDate (Cálculo de Períodos)', () => {
    it('deve incrementar corretamente um dia na recorrência DAILY', () => {
      const baseDate = new Date('2024-03-01T10:00:00Z');
      const nextDate = service['calculateNextDate'](
        baseDate,
        RecurrenceFrequency.DAILY,
      );
      expect(nextDate.toISOString()).toBe('2024-03-02T10:00:00.000Z');
    });

    it('deve adicionar um mês na recorrência MONTHLY', () => {
      const baseDate = new Date('2024-01-15T00:00:00Z');
      const nextDate = service['calculateNextDate'](
        baseDate,
        RecurrenceFrequency.MONTHLY,
      );
      expect(nextDate.toISOString()).toBe('2024-02-15T00:00:00.000Z');
    });

    it('deve lidar com anos bissextos na recorrência YEARLY', () => {
      const baseDate = new Date('2024-02-29T00:00:00Z'); // Ano Bissexto
      const nextDate = service['calculateNextDate'](
        baseDate,
        RecurrenceFrequency.YEARLY,
      );
      expect(nextDate.getUTCFullYear()).toBe(2025);
      // Como 2025 não é bissexto, o JS ajusta automaticamente para o dia válido (ex: 1 de março)
    });
  });

  describe('handleRecurringTransactionsCron (Motor Agendador)', () => {
    it('deve registrar log e encerrar se não houver agendamentos pendentes', async () => {
      prisma.recurringTransaction.findMany.mockResolvedValue([]);

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.handleRecurringTransactionsCron();

      expect(prisma.recurringTransaction.findMany).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Nenhuma transação recorrente pendente para processar.',
      );
    });

    it('deve processar pendências pendentes, gerar transação física e recalcular a data de disparo', async () => {
      const pendingRecurrence = {
        id: 'recurrence-1',
        amount: new Prisma.Decimal(99.9),
        description: 'Assinatura',
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: null,
        nextDate: new Date('2024-02-01T00:00:00Z'),
        isActive: true,
        paymentMethod: PaymentMethod.CREDIT,
        categoryId: 'category-1',
        userId: 'user-1',
      };

      prisma.recurringTransaction.findMany.mockResolvedValue([
        pendingRecurrence,
      ]);

      await service.handleRecurringTransactionsCron();

      // 1. Deve abrir transação e criar a transação física simulada
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          amount: pendingRecurrence.amount,
          description: `[Recorrente] ${pendingRecurrence.description}`,
          date: pendingRecurrence.nextDate,
          categoryId: pendingRecurrence.categoryId,
          userId: pendingRecurrence.userId,
          paymentMethod: pendingRecurrence.paymentMethod,
          recurringTransactionId: pendingRecurrence.id,
        },
      });

      // 2. Deve atualizar a data de disparo no agendamento base
      const expectedNewNextDate = new Date('2024-03-01T00:00:00.000Z');
      expect(prisma.recurringTransaction.update).toHaveBeenCalledWith({
        where: { id: pendingRecurrence.id },
        data: {
          nextDate: expectedNewNextDate,
          isActive: true, // Continua ativo pois não possui data de término
        },
      });
    });

    it('deve desativar o agendamento se o próximo cálculo ultrapassar a data limite (endDate)', async () => {
      const recurrenceWithEnd = {
        id: 'recurrence-expires',
        amount: new Prisma.Decimal(120.0),
        description: 'Parcelamento Termina Hoje',
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-02-15T00:00:00Z'), // Data limite inferior ao próximo ciclo esperado (março)
        nextDate: new Date('2024-02-01T00:00:00Z'),
        isActive: true,
        paymentMethod: PaymentMethod.DEBIT,
        categoryId: 'category-1',
        userId: 'user-1',
      };

      prisma.recurringTransaction.findMany.mockResolvedValue([
        recurrenceWithEnd,
      ]);

      await service.handleRecurringTransactionsCron();

      expect(prisma.transaction.create).toHaveBeenCalled();

      // O próximo cálculo seria 2024-03-01, que é maior que o endDate (2024-02-15), logo, isActive deve ser false
      expect(prisma.recurringTransaction.update).toHaveBeenCalledWith({
        where: { id: recurrenceWithEnd.id },
        data: {
          nextDate: new Date('2024-03-01T00:00:00.000Z'),
          isActive: false, // Foi desativado pelo limite do contrato
        },
      });
    });
  });
});
