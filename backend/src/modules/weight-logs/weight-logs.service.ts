import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWeightLogDto } from './dto/create-weight-log.dto';
import { UpdateWeightLogDto } from './dto/update-weight-log.dto';
import { FindWeightLogsQueryDto } from './dto/find-weight-logs-query.dto';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class WeightLogsService {
  private readonly logger = new Logger(WeightLogsService.name);

  private readonly weightLogSelect: Prisma.WeightLogSelect = {
    id: true,
    weight: true,
    date: true,
    notes: true,
    createdAt: true,
  };

  constructor(private readonly prisma: PrismaService) {}

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  async create(userId: string, dto: CreateWeightLogDto) {
    try {
      return await this.prisma.weightLog.create({
        data: {
          weight: new Prisma.Decimal(dto.weight),
          date: dto.date ? new Date(dto.date) : new Date(),
          notes: dto.notes,
          userId,
        },
        select: this.weightLogSelect,
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao registrar a pesagem.');
    }
  }

  async findAll(userId: string, query: FindWeightLogsQueryDto) {
    const { page = 1, limit = 20, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.WeightLogWhereInput = {
      userId,
      deletedAt: null,
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }

    try {
      const [total, data] = await Promise.all([
        this.prisma.weightLog.count({ where: whereClause }),
        this.prisma.weightLog.findMany({
          where: whereClause,
          take: limit,
          skip,
          select: this.weightLogSelect,
          orderBy: { date: 'desc' },
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
      throw new InternalServerErrorException(
        'Erro ao buscar o histórico de pesagens.',
      );
    }
  }

  async getLatest(userId: string) {
    const [logs, nutritionGoal] = await Promise.all([
      this.prisma.weightLog.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        orderBy: { date: 'desc' },
        take: 2,
        select: this.weightLogSelect,
      }),
      this.prisma.nutritionGoal.findUnique({
        where: { userId },
        select: { targetWeight: true },
      }),
    ]);

    if (logs.length === 0) {
      return {
        latest: null,
        previous: null,
        deltaFromPrevious: null,
        targetWeight: nutritionGoal?.targetWeight
          ? Number(nutritionGoal.targetWeight)
          : null,
        distanceToTarget: null,
      };
    }

    const latest = logs[0];
    const previous = logs.length > 1 ? logs[1] : null;

    const latestWeight = Number(latest.weight);
    const deltaFromPrevious = previous
      ? this.round2(latestWeight - Number(previous.weight))
      : null;

    const targetWeight = nutritionGoal?.targetWeight
      ? Number(nutritionGoal.targetWeight)
      : null;

    const distanceToTarget =
      targetWeight !== null ? this.round2(latestWeight - targetWeight) : null;

    return {
      latest,
      previous,
      deltaFromPrevious,
      targetWeight,
      distanceToTarget,
    };
  }

  async getStats(userId: string) {
    const where: Prisma.WeightLogWhereInput = {
      userId,
      deletedAt: null,
    };

    const [aggregations, initialRecord, currentRecord] = await Promise.all([
      this.prisma.weightLog.aggregate({
        where,
        _min: { weight: true },
        _max: { weight: true },
        _count: { id: true },
      }),
      this.prisma.weightLog.findFirst({
        where,
        orderBy: { date: 'asc' },
        select: { weight: true, date: true },
      }),
      this.prisma.weightLog.findFirst({
        where,
        orderBy: { date: 'desc' },
        select: { weight: true, date: true },
      }),
    ]);

    if (aggregations._count.id === 0 || !initialRecord || !currentRecord) {
      return {
        totalRecords: 0,
        initialWeight: null,
        initialDate: null,
        currentWeight: null,
        currentDate: null,
        minWeight: null,
        maxWeight: null,
        totalVariation: null,
      };
    }

    const initialWeight = Number(initialRecord.weight);
    const currentWeight = Number(currentRecord.weight);
    const minWeight = Number(aggregations._min.weight);
    const maxWeight = Number(aggregations._max.weight);
    const totalVariation = this.round2(currentWeight - initialWeight);

    return {
      totalRecords: aggregations._count.id,
      initialWeight,
      initialDate: initialRecord.date,
      currentWeight,
      currentDate: currentRecord.date,
      minWeight,
      maxWeight,
      totalVariation,
    };
  }

  async findOne(id: string, userId: string) {
    const weightLog = await this.prisma.weightLog.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      select: this.weightLogSelect,
    });

    if (!weightLog) {
      throw new NotFoundException('Registro de pesagem não encontrado.');
    }

    return weightLog;
  }

  async update(id: string, userId: string, dto: UpdateWeightLogDto) {
    await this.findOne(id, userId);

    const dataToUpdate: Prisma.WeightLogUpdateInput = {};
    if (dto.weight !== undefined) {
      dataToUpdate.weight = new Prisma.Decimal(dto.weight);
    }
    if (dto.date !== undefined) {
      dataToUpdate.date = new Date(dto.date);
    }
    if (dto.notes !== undefined) {
      dataToUpdate.notes = dto.notes;
    }

    try {
      return await this.prisma.weightLog.update({
        where: { id },
        data: dataToUpdate,
        select: this.weightLogSelect,
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao atualizar a pesagem.');
    }
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    try {
      await this.prisma.weightLog.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return { message: 'Registro de pesagem removido com sucesso.' };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao remover o registro de pesagem.',
      );
    }
  }
}
