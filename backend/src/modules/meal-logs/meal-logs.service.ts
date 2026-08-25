import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMealLogDto } from './dto/create-meal-log.dto';
import { UpdateMealLogDto } from './dto/update-meal-log.dto';
import { AddMealItemDto } from './dto/add-meal-item.dto';
import { UpdateMealItemDto } from './dto/update-meal-item.dto';
import { FindMealLogsQueryDto } from './dto/find-meal-logs-query.dto';
import { DailySummaryQueryDto } from './dto/daily-summary-query.dto';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class MealLogsService {
  private readonly logger = new Logger(MealLogsService.name);

  private readonly mealLogInclude = {
    items: {
      include: {
        food: {
          select: {
            id: true,
            name: true,
            brand: true,
            servingSize: true,
            servingUnit: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' as const },
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  private parseDateOnly(dateStr: string): Date {
    return new Date(`${dateStr}T00:00:00.000Z`);
  }

  private calculateSnapshot(
    food: {
      servingSize: Prisma.Decimal | number;
      calories: Prisma.Decimal | number;
      protein: Prisma.Decimal | number;
      carbs: Prisma.Decimal | number;
      fat: Prisma.Decimal | number;
      fiber: Prisma.Decimal | number | null;
    },
    quantity: number,
  ) {
    const servingSize = new Prisma.Decimal(food.servingSize);
    if (servingSize.isZero() || servingSize.isNegative()) {
      throw new BadRequestException(
        'A porção de referência do alimento é inválida.',
      );
    }

    const factor = new Prisma.Decimal(quantity).dividedBy(servingSize);
    const consumedCalories = new Prisma.Decimal(food.calories).times(factor);
    const consumedProtein = new Prisma.Decimal(food.protein).times(factor);
    const consumedCarbs = new Prisma.Decimal(food.carbs).times(factor);
    const consumedFat = new Prisma.Decimal(food.fat).times(factor);
    const consumedFiber =
      food.fiber !== null && food.fiber !== undefined
        ? new Prisma.Decimal(food.fiber).times(factor)
        : null;

    return {
      quantity: new Prisma.Decimal(quantity),
      consumedCalories,
      consumedProtein,
      consumedCarbs,
      consumedFat,
      consumedFiber,
    };
  }

  private async validateFoodAccess(foodId: string, userId: string) {
    const food = await this.prisma.food.findFirst({
      where: {
        id: foodId,
        deletedAt: null,
        OR: [{ userId }, { userId: null }],
      },
    });

    if (!food) {
      throw new NotFoundException(
        `Alimento com ID ${foodId} não encontrado ou indisponível.`,
      );
    }

    return food;
  }

  async create(userId: string, dto: CreateMealLogDto) {
    const date = this.parseDateOnly(dto.date);

    let itemsData: Prisma.MealFoodItemCreateWithoutMealLogInput[] = [];

    if (dto.items && dto.items.length > 0) {
      for (const itemDto of dto.items) {
        const food = await this.validateFoodAccess(itemDto.foodId, userId);
        const snapshot = this.calculateSnapshot(food, itemDto.quantity);

        itemsData.push({
          food: { connect: { id: food.id } },
          ...snapshot,
        });
      }
    }

    try {
      return await this.prisma.mealLog.create({
        data: {
          userId,
          date,
          mealType: dto.mealType,
          notes: dto.notes,
          items: itemsData.length > 0 ? { create: itemsData } : undefined,
        },
        include: this.mealLogInclude,
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao registrar a refeição.');
    }
  }

  async findAll(userId: string, query: FindMealLogsQueryDto) {
    const { page = 1, limit = 20, date, startDate, endDate, mealType } = query;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.MealLogWhereInput = {
      userId,
      deletedAt: null,
    };

    if (date) {
      whereClause.date = this.parseDateOnly(date);
    } else if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = this.parseDateOnly(startDate);
      if (endDate) whereClause.date.lte = this.parseDateOnly(endDate);
    }

    if (mealType) {
      whereClause.mealType = mealType;
    }

    try {
      const [total, data] = await Promise.all([
        this.prisma.mealLog.count({ where: whereClause }),
        this.prisma.mealLog.findMany({
          where: whereClause,
          take: limit,
          skip,
          include: this.mealLogInclude,
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
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
      throw new InternalServerErrorException('Erro ao buscar as refeições.');
    }
  }

  async findOne(id: string, userId: string) {
    const mealLog = await this.prisma.mealLog.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include: this.mealLogInclude,
    });

    if (!mealLog) {
      throw new NotFoundException('Registro de refeição não encontrado.');
    }

    return mealLog;
  }

  async update(id: string, userId: string, dto: UpdateMealLogDto) {
    await this.findOne(id, userId);

    const updateData: Prisma.MealLogUpdateInput = {};
    if (dto.date) updateData.date = this.parseDateOnly(dto.date);
    if (dto.mealType) updateData.mealType = dto.mealType;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    try {
      return await this.prisma.mealLog.update({
        where: { id },
        data: updateData,
        include: this.mealLogInclude,
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao atualizar a refeição.');
    }
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    try {
      await this.prisma.mealLog.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return { message: 'Refeição removida com sucesso.' };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao remover a refeição.');
    }
  }

  async addItem(mealLogId: string, userId: string, dto: AddMealItemDto) {
    await this.findOne(mealLogId, userId);
    const food = await this.validateFoodAccess(dto.foodId, userId);
    const snapshot = this.calculateSnapshot(food, dto.quantity);

    try {
      return await this.prisma.mealFoodItem.create({
        data: {
          mealLogId,
          foodId: food.id,
          ...snapshot,
        },
        include: {
          food: {
            select: {
              id: true,
              name: true,
              brand: true,
              servingSize: true,
              servingUnit: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao adicionar o alimento na refeição.',
      );
    }
  }

  async updateItem(
    mealLogId: string,
    itemId: string,
    userId: string,
    dto: UpdateMealItemDto,
  ) {
    await this.findOne(mealLogId, userId);

    const mealFoodItem = await this.prisma.mealFoodItem.findFirst({
      where: {
        id: itemId,
        mealLogId,
      },
      include: { food: true },
    });

    if (!mealFoodItem) {
      throw new NotFoundException('Item não encontrado nesta refeição.');
    }

    const snapshot = this.calculateSnapshot(mealFoodItem.food, dto.quantity);

    try {
      return await this.prisma.mealFoodItem.update({
        where: { id: itemId },
        data: snapshot,
        include: {
          food: {
            select: {
              id: true,
              name: true,
              brand: true,
              servingSize: true,
              servingUnit: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao atualizar o item da refeição.',
      );
    }
  }

  async removeItem(mealLogId: string, itemId: string, userId: string) {
    await this.findOne(mealLogId, userId);

    const mealFoodItem = await this.prisma.mealFoodItem.findFirst({
      where: {
        id: itemId,
        mealLogId,
      },
    });

    if (!mealFoodItem) {
      throw new NotFoundException('Item não encontrado nesta refeição.');
    }

    try {
      await this.prisma.mealFoodItem.delete({
        where: { id: itemId },
      });

      return { message: 'Item removido da refeição com sucesso.' };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao remover o item da refeição.',
      );
    }
  }

  async getDailySummary(userId: string, query: DailySummaryQueryDto) {
    const targetDateStr = query.date || new Date().toISOString().split('T')[0];
    const targetDate = this.parseDateOnly(targetDateStr);

    const [nutritionGoal, mealLogs] = await Promise.all([
      this.prisma.nutritionGoal.findUnique({
        where: { userId },
      }),
      this.prisma.mealLog.findMany({
        where: {
          userId,
          date: targetDate,
          deletedAt: null,
        },
        include: this.mealLogInclude,
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;

    for (const meal of mealLogs) {
      for (const item of meal.items) {
        totalCalories += Number(item.consumedCalories);
        totalProtein += Number(item.consumedProtein);
        totalCarbs += Number(item.consumedCarbs);
        totalFat += Number(item.consumedFat);
        if (item.consumedFiber) {
          totalFiber += Number(item.consumedFiber);
        }
      }
    }

    const round2 = (num: number) =>
      Math.round((num + Number.EPSILON) * 100) / 100;
    const round1 = (num: number) =>
      Math.round((num + Number.EPSILON) * 10) / 10;

    const consumed = {
      calories: round2(totalCalories),
      protein: round2(totalProtein),
      carbs: round2(totalCarbs),
      fat: round2(totalFat),
      fiber: round2(totalFiber),
    };

    if (!nutritionGoal) {
      return {
        date: targetDateStr,
        goals: null,
        consumed,
        remaining: null,
        progressPercentage: null,
        meals: mealLogs,
      };
    }

    const goals = {
      calories: Number(nutritionGoal.targetCalories),
      protein: Number(nutritionGoal.targetProtein),
      carbs: Number(nutritionGoal.targetCarbs),
      fat: Number(nutritionGoal.targetFat),
      fiber: nutritionGoal.targetFiber ? Number(nutritionGoal.targetFiber) : 0,
      targetWeight: nutritionGoal.targetWeight
        ? Number(nutritionGoal.targetWeight)
        : null,
    };

    const remaining = {
      calories: round2(goals.calories - consumed.calories),
      protein: round2(goals.protein - consumed.protein),
      carbs: round2(goals.carbs - consumed.carbs),
      fat: round2(goals.fat - consumed.fat),
      fiber: round2(goals.fiber - consumed.fiber),
    };

    const calcProgress = (cons: number, target: number) =>
      target > 0 ? round1((cons / target) * 100) : 0;

    const progressPercentage = {
      calories: calcProgress(consumed.calories, goals.calories),
      protein: calcProgress(consumed.protein, goals.protein),
      carbs: calcProgress(consumed.carbs, goals.carbs),
      fat: calcProgress(consumed.fat, goals.fat),
      fiber: calcProgress(consumed.fiber, goals.fiber),
    };

    return {
      date: targetDateStr,
      goals,
      consumed,
      remaining,
      progressPercentage,
      meals: mealLogs,
    };
  }
}
