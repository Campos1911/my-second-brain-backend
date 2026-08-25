import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

const mockPrismaService = {
  transaction: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    aggregate: jest.fn(),
    update: jest.fn(),
  },
  category: {
    findFirst: jest.fn(),
  },
};

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-uuid-1';
    const createDto = {
      amount: 150.5,
      description: 'Supermercado',
      categoryId: 'category-uuid-1',
      paymentMethod: 'DEBIT' as const,
    };

    it('deve criar uma transação com sucesso quando a categoria for encontrada', async () => {
      prisma.category.findFirst.mockResolvedValue({
        id: createDto.categoryId,
        name: 'Alimentação',
        type: 'EXPENSE',
      });

      const expectedResult = {
        id: 'transaction-uuid-1',
        amount: new Prisma.Decimal(createDto.amount),
        description: createDto.description,
        date: new Date(),
        paymentMethod: createDto.paymentMethod,
        category: {
          id: createDto.categoryId,
          name: 'Alimentação',
          type: 'EXPENSE',
        },
      };

      prisma.transaction.create.mockResolvedValue(expectedResult);

      const result = await service.create(userId, createDto);

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: {
          id: createDto.categoryId,
          OR: [{ userId }, { userId: null }],
          deletedAt: null,
        },
      });
      expect(result).toEqual(expectedResult);
    });

    it('deve lançar NotFoundException quando a categoria não for localizada', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, createDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    const userId = 'user-uuid-1';

    it('deve calcular o resumo financeiro com base nas agregações do Prisma', async () => {
      prisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(2000.0) } }) // Receita
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(850.5) } }); // Despesa

      const result = await service.getSummary(userId, 3, 2024);

      expect(result).toEqual({
        income: 2000.0,
        expense: 850.5,
        balance: 1149.5,
      });
    });

    it('deve retornar valores zerados quando não houver transações correspondentes', async () => {
      prisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });

      const result = await service.getSummary(userId, 3, 2024);

      expect(result).toEqual({
        income: 0,
        expense: 0,
        balance: 0,
      });
    });
  });
});
