import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { FindFoodsQueryDto } from './dto/find-foods-query.dto';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class FoodsService {
  private readonly logger = new Logger(FoodsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFoodDto) {
    try {
      return await this.prisma.food.create({
        data: {
          name: dto.name,
          brand: dto.brand,
          servingSize: new Prisma.Decimal(dto.servingSize),
          servingUnit: dto.servingUnit,
          calories: new Prisma.Decimal(dto.calories),
          protein: new Prisma.Decimal(dto.protein),
          carbs: new Prisma.Decimal(dto.carbs),
          fat: new Prisma.Decimal(dto.fat),
          fiber: dto.fiber !== undefined ? new Prisma.Decimal(dto.fiber) : null,
          userId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao cadastrar alimento.');
    }
  }

  async findAll(userId: string, query: FindFoodsQueryDto) {
    const { page = 1, limit = 20, search, onlyMine } = query;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.FoodWhereInput = {
      deletedAt: null,
    };

    if (onlyMine) {
      whereClause.userId = userId;
    } else {
      whereClause.OR = [{ userId }, { userId: null }];
    }

    if (search) {
      const searchConditions: Prisma.FoodWhereInput[] = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];

      if (whereClause.OR) {
        whereClause.AND = [{ OR: searchConditions }];
      } else {
        whereClause.OR = searchConditions;
      }
    }

    try {
      const [total, data] = await Promise.all([
        this.prisma.food.count({ where: whereClause }),
        this.prisma.food.findMany({
          where: whereClause,
          take: limit,
          skip,
          orderBy: { name: 'asc' },
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
      throw new InternalServerErrorException('Erro ao buscar alimentos.');
    }
  }

  async findOne(id: string, userId: string) {
    const food = await this.prisma.food.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ userId }, { userId: null }],
      },
    });

    if (!food) {
      throw new NotFoundException('Alimento não encontrado.');
    }

    return food;
  }

  async update(id: string, userId: string, dto: UpdateFoodDto) {
    const food = await this.findOne(id, userId);

    if (!food.userId) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar alimentos padrões do sistema.',
      );
    }

    if (food.userId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar alimentos criados por outros usuários.',
      );
    }

    const updateData: Prisma.FoodUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.brand !== undefined) updateData.brand = dto.brand;
    if (dto.servingSize !== undefined)
      updateData.servingSize = new Prisma.Decimal(dto.servingSize);
    if (dto.servingUnit !== undefined) updateData.servingUnit = dto.servingUnit;
    if (dto.calories !== undefined)
      updateData.calories = new Prisma.Decimal(dto.calories);
    if (dto.protein !== undefined)
      updateData.protein = new Prisma.Decimal(dto.protein);
    if (dto.carbs !== undefined)
      updateData.carbs = new Prisma.Decimal(dto.carbs);
    if (dto.fat !== undefined)
      updateData.fat = new Prisma.Decimal(dto.fat);
    if (dto.fiber !== undefined)
      updateData.fiber = dto.fiber !== null ? new Prisma.Decimal(dto.fiber) : null;

    try {
      return await this.prisma.food.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao atualizar o alimento.');
    }
  }

  async remove(id: string, userId: string) {
    const food = await this.findOne(id, userId);

    if (!food.userId) {
      throw new ForbiddenException(
        'Você não tem permissão para remover alimentos padrões do sistema.',
      );
    }

    if (food.userId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para remover alimentos criados por outros usuários.',
      );
    }

    try {
      await this.prisma.food.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return { message: 'Alimento removido com sucesso.' };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao remover o alimento.');
    }
  }
}