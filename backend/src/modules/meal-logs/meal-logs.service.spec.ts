import { Test, TestingModule } from '@nestjs/testing';
import { MealLogsService } from './meal-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { MealType, Prisma } from '../../generated/prisma/client';

const mockPrismaService = {
  mealLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  mealFoodItem: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  food: {
    findFirst: jest.fn(),
  },
  nutritionGoal: {
    findUnique: jest.fn(),
  },
};

describe('MealLogsService', () => {
  let service: MealLogsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealLogsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MealLogsService>(MealLogsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  const userId = 'user-1';
  const mockFood = {
    id: 'food-1',
    name: 'Peito de Frango',
    servingSize: new Prisma.Decimal(100),
    calories: new Prisma.Decimal(165),
    protein: new Prisma.Decimal(31),
    carbs: new Prisma.Decimal(0),
    fat: new Prisma.Decimal(3.6),
    fiber: new Prisma.Decimal(0),
    userId: null,
  };

  describe('create', () => {
    it('deve criar uma refeição e calcular o snapshot dos itens corretamente (Fator = 200/100 = 2)', async () => {
      prisma.food.findFirst.mockResolvedValue(mockFood);

      const createDto = {
        date: '2026-08-25',
        mealType: MealType.LUNCH,
        notes: 'Almoço reforçado',
        items: [{ foodId: 'food-1', quantity: 200 }],
      };

      const expectedResponse = {
        id: 'meal-1',
        userId,
        date: new Date('2026-08-25T00:00:00.000Z'),
        mealType: MealType.LUNCH,
        notes: 'Almoço reforçado',
        items: [
          {
            id: 'item-1',
            quantity: new Prisma.Decimal(200),
            consumedCalories: new Prisma.Decimal(330),
            consumedProtein: new Prisma.Decimal(62),
            consumedCarbs: new Prisma.Decimal(0),
            consumedFat: new Prisma.Decimal(7.2),
            consumedFiber: new Prisma.Decimal(0),
          },
        ],
      };

      prisma.mealLog.create.mockResolvedValue(expectedResponse);

      const result = await service.create(userId, createDto);

      expect(prisma.food.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'food-1',
          deletedAt: null,
          OR: [{ userId }, { userId: null }],
        },
      });

      expect(prisma.mealLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            mealType: MealType.LUNCH,
            items: {
              create: [
                expect.objectContaining({
                  food: { connect: { id: 'food-1' } },
                  consumedCalories: new Prisma.Decimal(330),
                  consumedProtein: new Prisma.Decimal(62),
                }),
              ],
            },
          }),
        }),
      );

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('addItem', () => {
    it('deve adicionar um novo item calculando o snapshot imutável', async () => {
      prisma.mealLog.findFirst.mockResolvedValue({
        id: 'meal-1',
        userId,
        deletedAt: null,
      });
      prisma.food.findFirst.mockResolvedValue(mockFood);

      const expectedItem = {
        id: 'item-new',
        mealLogId: 'meal-1',
        foodId: 'food-1',
        quantity: new Prisma.Decimal(150),
        consumedCalories: new Prisma.Decimal(247.5),
        consumedProtein: new Prisma.Decimal(46.5),
        consumedCarbs: new Prisma.Decimal(0),
        consumedFat: new Prisma.Decimal(5.4),
        consumedFiber: new Prisma.Decimal(0),
      };

      prisma.mealFoodItem.create.mockResolvedValue(expectedItem);

      const result = await service.addItem('meal-1', userId, {
        foodId: 'food-1',
        quantity: 150,
      });

      expect(prisma.mealFoodItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mealLogId: 'meal-1',
            foodId: 'food-1',
            consumedCalories: new Prisma.Decimal(247.5),
            consumedProtein: new Prisma.Decimal(46.5),
          }),
        }),
      );
      expect(result).toEqual(expectedItem);
    });
  });

  describe('updateItem', () => {
    it('deve recalcular os macros com base na nova quantidade', async () => {
      prisma.mealLog.findFirst.mockResolvedValue({
        id: 'meal-1',
        userId,
        deletedAt: null,
      });
      prisma.mealFoodItem.findFirst.mockResolvedValue({
        id: 'item-1',
        mealLogId: 'meal-1',
        food: mockFood,
      });

      const expectedUpdatedItem = {
        id: 'item-1',
        quantity: new Prisma.Decimal(300),
        consumedCalories: new Prisma.Decimal(495),
        consumedProtein: new Prisma.Decimal(93),
      };

      prisma.mealFoodItem.update.mockResolvedValue(expectedUpdatedItem);

      const result = await service.updateItem('meal-1', 'item-1', userId, {
        quantity: 300,
      });

      expect(prisma.mealFoodItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: expect.objectContaining({
            consumedCalories: new Prisma.Decimal(495),
            consumedProtein: new Prisma.Decimal(93),
          }),
        }),
      );
      expect(result).toEqual(expectedUpdatedItem);
    });
  });

  describe('getDailySummary', () => {
    it('deve agregar os totais do dia e calcular a diferença e progresso em relação à meta', async () => {
      const mockGoal = {
        userId,
        targetCalories: new Prisma.Decimal(2000),
        targetProtein: new Prisma.Decimal(150),
        targetCarbs: new Prisma.Decimal(200),
        targetFat: new Prisma.Decimal(60),
        targetFiber: new Prisma.Decimal(30),
        targetWeight: new Prisma.Decimal(80.5),
      };

      const mockMeals = [
        {
          id: 'meal-1',
          mealType: MealType.LUNCH,
          items: [
            {
              consumedCalories: new Prisma.Decimal(500),
              consumedProtein: new Prisma.Decimal(45),
              consumedCarbs: new Prisma.Decimal(50),
              consumedFat: new Prisma.Decimal(15),
              consumedFiber: new Prisma.Decimal(5),
            },
            {
              consumedCalories: new Prisma.Decimal(300),
              consumedProtein: new Prisma.Decimal(30),
              consumedCarbs: new Prisma.Decimal(30),
              consumedFat: new Prisma.Decimal(5),
              consumedFiber: new Prisma.Decimal(2),
            },
          ],
        },
      ];

      prisma.nutritionGoal.findUnique.mockResolvedValue(mockGoal);
      prisma.mealLog.findMany.mockResolvedValue(mockMeals);

      const summary = await service.getDailySummary(userId, {
        date: '2026-08-25',
      });

      expect(summary.date).toBe('2026-08-25');
      expect(summary.consumed).toEqual({
        calories: 800,
        protein: 75,
        carbs: 80,
        fat: 20,
        fiber: 7,
      });
      expect(summary.remaining).toEqual({
        calories: 1200,
        protein: 75,
        carbs: 120,
        fat: 40,
        fiber: 23,
      });
      expect(summary.progressPercentage).toEqual({
        calories: 40,
        protein: 50,
        carbs: 40,
        fat: 33.3,
        fiber: 23.3,
      });
      expect(summary.meals).toHaveLength(1);
    });

    it('deve retornar resumo com goals nulos caso o usuário não possua NutritionGoal cadastrada', async () => {
      prisma.nutritionGoal.findUnique.mockResolvedValue(null);
      prisma.mealLog.findMany.mockResolvedValue([]);

      const summary = await service.getDailySummary(userId, {
        date: '2026-08-25',
      });

      expect(summary.goals).toBeNull();
      expect(summary.remaining).toBeNull();
      expect(summary.progressPercentage).toBeNull();
      expect(summary.consumed.calories).toBe(0);
    });
  });

  describe('remove', () => {
    it('deve efetuar soft delete na refeição', async () => {
      prisma.mealLog.findFirst.mockResolvedValue({
        id: 'meal-1',
        userId,
        deletedAt: null,
      });
      prisma.mealLog.update.mockResolvedValue({
        id: 'meal-1',
        deletedAt: new Date(),
      });

      const result = await service.remove('meal-1', userId);

      expect(prisma.mealLog.update).toHaveBeenCalledWith({
        where: { id: 'meal-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toEqual({ message: 'Refeição removida com sucesso.' });
    });

    it('deve lançar NotFoundException se a refeição não existir', async () => {
      prisma.mealLog.findFirst.mockResolvedValue(null);
      await expect(service.remove('invalid-id', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
