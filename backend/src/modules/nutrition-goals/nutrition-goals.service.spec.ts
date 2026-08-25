import { Test, TestingModule } from '@nestjs/testing';
import { NutritionGoalsService } from './nutrition-goals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import {
  ActivityLevel,
  BiologicalSex,
  Prisma,
} from '../../generated/prisma/client';

const mockPrismaService = {
  nutritionGoal: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('NutritionGoalsService', () => {
  let service: NutritionGoalsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NutritionGoalsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NutritionGoalsService>(NutritionGoalsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  const userId = 'user-uuid-1';

  describe('calculate (Fórmulas Matemáticas)', () => {
    it('deve calcular corretamente TMB, TDEE, déficit e macros para HOMEM moderadamente ativo', () => {
      // Mifflin-St Jeor Homem: (10 * 80) + (6.25 * 180) - (5 * 30) + 5
      // 800 + 1125 - 150 + 5 = 1780
      // TDEE (MODERATELY_ACTIVE = 1.55): 1780 * 1.55 = 2759
      // Déficit (2 kg/mês): (2 * 7700) / 30 = 513.33 kcal
      // Meta Calórica: 2759 - 513.33 = 2245.67 kcal
      // Proteína (2.0 g/kg): 80 * 2.0 = 160g (640 kcal)
      // Gordura (0.8 g/kg): 80 * 0.8 = 64g (576 kcal)
      // Kcal restantes para Carbos: 2245.67 - 1216 = 1029.67 kcal -> 1029.67 / 4 = 257.42g
      const result = service.calculate({
        weight: 80,
        height: 180,
        age: 30,
        sex: BiologicalSex.MALE,
        activityLevel: ActivityLevel.MODERATELY_ACTIVE,
        weightLossGoalKgPerMonth: 2,
        proteinPerKg: 2.0,
        fatPerKg: 0.8,
      });

      expect(result.bmr).toBe(1780);
      expect(result.tdee).toBe(2759);
      expect(result.dailyDeficit).toBe(513.33);
      expect(result.recommendedDailyCalories).toBe(2245.67);
      expect(result.macros.protein).toBe(160);
      expect(result.macros.fat).toBe(64);
      expect(result.macros.carbs).toBe(257.42);
      expect(result.warnings).toHaveLength(0);
    });

    it('deve calcular corretamente TMB para MULHER sedentária e emitir aviso se calorias < 1200', () => {
      // Mifflin-St Jeor Mulher: (10 * 50) + (6.25 * 155) - (5 * 35) - 161
      // 500 + 968.75 - 175 - 161 = 1132.75
      // TDEE (SEDENTARY = 1.2): 1132.75 * 1.2 = 1359.3
      // Déficit (1.5 kg/mês): (1.5 * 7700) / 30 = 385 kcal
      // Meta Calórica: 1359.3 - 385 = 974.3 kcal (< 1200 -> gera warning)
      const result = service.calculate({
        weight: 50,
        height: 155,
        age: 35,
        sex: BiologicalSex.FEMALE,
        activityLevel: ActivityLevel.SEDENTARY,
        weightLossGoalKgPerMonth: 1.5,
      });

      expect(result.bmr).toBe(1132.75);
      expect(result.tdee).toBe(1359.3);
      expect(result.recommendedDailyCalories).toBe(974.3);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings[0]).toContain('1200 kcal para mulheres');
    });

    it('deve emitir aviso de segurança para HOMEM se a recomendação for < 1500 kcal', () => {
      const result = service.calculate({
        weight: 60,
        height: 160,
        age: 40,
        sex: BiologicalSex.MALE,
        activityLevel: ActivityLevel.SEDENTARY,
        weightLossGoalKgPerMonth: 3.5, // Déficit agressivo
      });

      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings[0]).toContain('1500 kcal para homens');
    });
  });

  describe('upsert', () => {
    it('deve salvar e persistir as metas nutricionais via upsert do Prisma', async () => {
      const dto = {
        targetCalories: 2100,
        targetProtein: 160,
        targetCarbs: 220,
        targetFat: 60,
        targetFiber: 28,
        targetWeight: 75.5,
      };

      const expectedResponse = {
        id: 'goal-uuid-1',
        userId,
        targetCalories: new Prisma.Decimal(2100),
        targetProtein: new Prisma.Decimal(160),
        targetCarbs: new Prisma.Decimal(220),
        targetFat: new Prisma.Decimal(60),
        targetFiber: new Prisma.Decimal(28),
        targetWeight: new Prisma.Decimal(75.5),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.nutritionGoal.upsert.mockResolvedValue(expectedResponse);

      const result = await service.upsert(userId, dto);

      expect(prisma.nutritionGoal.upsert).toHaveBeenCalledWith({
        where: { userId },
        create: {
          userId,
          targetCalories: new Prisma.Decimal(dto.targetCalories),
          targetProtein: new Prisma.Decimal(dto.targetProtein),
          targetCarbs: new Prisma.Decimal(dto.targetCarbs),
          targetFat: new Prisma.Decimal(dto.targetFat),
          targetFiber: new Prisma.Decimal(dto.targetFiber),
          targetWeight: new Prisma.Decimal(dto.targetWeight),
        },
        update: {
          targetCalories: new Prisma.Decimal(dto.targetCalories),
          targetProtein: new Prisma.Decimal(dto.targetProtein),
          targetCarbs: new Prisma.Decimal(dto.targetCarbs),
          targetFat: new Prisma.Decimal(dto.targetFat),
          targetFiber: new Prisma.Decimal(dto.targetFiber),
          targetWeight: new Prisma.Decimal(dto.targetWeight),
        },
        select: expect.any(Object),
      });

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getCurrentGoal', () => {
    it('deve retornar a meta cadastrada do usuário', async () => {
      const mockGoal = {
        id: 'goal-1',
        userId,
        targetCalories: new Prisma.Decimal(2000),
      };

      prisma.nutritionGoal.findUnique.mockResolvedValue(mockGoal);

      const result = await service.getCurrentGoal(userId);
      expect(prisma.nutritionGoal.findUnique).toHaveBeenCalledWith({
        where: { userId },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockGoal);
    });

    it('deve lançar NotFoundException caso o usuário não tenha meta cadastrada', async () => {
      prisma.nutritionGoal.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentGoal(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
