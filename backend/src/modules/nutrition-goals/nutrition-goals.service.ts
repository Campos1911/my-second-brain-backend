import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CalculateNutritionGoalDto } from './dto/calculate-nutrition-goal.dto';
import { UpsertNutritionGoalDto } from './dto/upsert-nutrition-goal.dto';
import {
  ActivityLevel,
  BiologicalSex,
  Prisma,
} from '../../generated/prisma/client';

export interface CalculationResult {
  bmr: number;
  tdee: number;
  dailyDeficit: number;
  recommendedDailyCalories: number;
  macros: {
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
  };
  warnings: string[];
}

@Injectable()
export class NutritionGoalsService {
  private readonly logger = new Logger(NutritionGoalsService.name);

  private readonly goalSelect: Prisma.NutritionGoalSelect = {
    id: true,
    userId: true,
    targetCalories: true,
    targetProtein: true,
    targetCarbs: true,
    targetFat: true,
    targetFiber: true,
    targetWeight: true,
    createdAt: true,
    updatedAt: true,
  };

  private readonly activityMultipliers: Record<ActivityLevel, number> = {
    [ActivityLevel.SEDENTARY]: 1.2,
    [ActivityLevel.LIGHTLY_ACTIVE]: 1.375,
    [ActivityLevel.MODERATELY_ACTIVE]: 1.55,
    [ActivityLevel.VERY_ACTIVE]: 1.725,
    [ActivityLevel.EXTRA_ACTIVE]: 1.9,
  };

  constructor(private readonly prisma: PrismaService) {}

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  calculate(dto: CalculateNutritionGoalDto): CalculationResult {
    const {
      weight,
      height,
      age,
      sex,
      activityLevel,
      weightLossGoalKgPerMonth = 0,
      proteinPerKg = 2.0,
      fatPerKg = 0.8,
    } = dto;

    // 1. Taxa Metabólica Basal (Mifflin-St Jeor)
    let bmr = 10 * weight + 6.25 * height - 5 * age;
    if (sex === BiologicalSex.MALE) {
      bmr += 5;
    } else {
      bmr -= 161;
    }

    // 2. Gasto Energético Diário Total (TDEE)
    const multiplier = this.activityMultipliers[activityLevel] || 1.2;
    const tdee = bmr * multiplier;

    // 3. Déficit Calórico Diário (1kg de gordura ~ 7700 kcal)
    const dailyDeficit = (weightLossGoalKgPerMonth * 7700) / 30;
    const recommendedDailyCalories = Math.max(0, tdee - dailyDeficit);

    // 4. Distribuição de Macronutrientes
    const protein = weight * proteinPerKg;
    const fat = weight * fatPerKg;
    const caloriesAllocated = protein * 4 + fat * 9;
    const remainingCaloriesForCarbs = recommendedDailyCalories - caloriesAllocated;
    const carbs = Math.max(0, remainingCaloriesForCarbs / 4);

    // Recomendação de Fibras (~14g por 1000 kcal)
    const fiber = (recommendedDailyCalories / 1000) * 14;

    // 5. Avisos de Segurança
    const warnings: string[] = [];
    if (sex === BiologicalSex.FEMALE && recommendedDailyCalories < 1200) {
      warnings.push(
        'Aviso: O consumo calórico diário calculado está abaixo de 1200 kcal para mulheres. Déficits muito agressivos podem comprometer o metabolismo, massa magra e saúde hormonal.',
      );
    } else if (sex === BiologicalSex.MALE && recommendedDailyCalories < 1500) {
      warnings.push(
        'Aviso: O consumo calórico diário calculado está abaixo de 1500 kcal para homens. Déficits muito agressivos podem comprometer o metabolismo, massa magra e saúde hormonal.',
      );
    }

    if (remainingCaloriesForCarbs < 0) {
      warnings.push(
        'Aviso: A soma das calorias de proteínas e gorduras configuradas excede o total diário recomendado, zerando a cota de carboidratos.',
      );
    }

    return {
      bmr: this.round2(bmr),
      tdee: this.round2(tdee),
      dailyDeficit: this.round2(dailyDeficit),
      recommendedDailyCalories: this.round2(recommendedDailyCalories),
      macros: {
        protein: this.round2(protein),
        fat: this.round2(fat),
        carbs: this.round2(carbs),
        fiber: this.round2(fiber),
      },
      warnings,
    };
  }

  async upsert(userId: string, dto: UpsertNutritionGoalDto) {
    try {
      return await this.prisma.nutritionGoal.upsert({
        where: { userId },
        create: {
          userId,
          targetCalories: new Prisma.Decimal(dto.targetCalories),
          targetProtein: new Prisma.Decimal(dto.targetProtein),
          targetCarbs: new Prisma.Decimal(dto.targetCarbs),
          targetFat: new Prisma.Decimal(dto.targetFat),
          targetFiber:
            dto.targetFiber !== undefined && dto.targetFiber !== null
              ? new Prisma.Decimal(dto.targetFiber)
              : null,
          targetWeight:
            dto.targetWeight !== undefined && dto.targetWeight !== null
              ? new Prisma.Decimal(dto.targetWeight)
              : null,
        },
        update: {
          targetCalories: new Prisma.Decimal(dto.targetCalories),
          targetProtein: new Prisma.Decimal(dto.targetProtein),
          targetCarbs: new Prisma.Decimal(dto.targetCarbs),
          targetFat: new Prisma.Decimal(dto.targetFat),
          targetFiber:
            dto.targetFiber !== undefined && dto.targetFiber !== null
              ? new Prisma.Decimal(dto.targetFiber)
              : null,
          targetWeight:
            dto.targetWeight !== undefined && dto.targetWeight !== null
              ? new Prisma.Decimal(dto.targetWeight)
              : null,
        },
        select: this.goalSelect,
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao salvar ou atualizar as metas nutricionais.',
      );
    }
  }

  async getCurrentGoal(userId: string) {
    const goal = await this.prisma.nutritionGoal.findUnique({
      where: { userId },
      select: this.goalSelect,
    });

    if (!goal) {
      throw new NotFoundException(
        'Nenhuma meta nutricional configurada para o usuário autenticado.',
      );
    }

    return goal;
  }
}
