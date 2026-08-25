import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FindTasksQueryDto } from './dto/find-tasks-query.dto';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTaskDto) {
    try {
      return await this.prisma.task.create({
        data: {
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          status: dto.status, // <-- Mapeia o status do DTO (ou usará default TODO se nulo)
          startDate: dto.startDate,
          endDate: dto.endDate,
          userId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao criar a tarefa.');
    }
  }

  async findAll(userId: string, query: FindTasksQueryDto) {
    const { page = 1, limit = 20, search, priority, status } = query; // <-- Extraído status
    const skip = (page - 1) * limit;

    const whereClause: Prisma.TaskWhereInput = {
      userId,
      deletedAt: null,
    };

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (priority) {
      whereClause.priority = priority;
    }

    if (status) {
      // <-- Aplica filtro de status se enviado na requisição
      whereClause.status = status;
    }

    try {
      const [total, data] = await Promise.all([
        this.prisma.task.count({ where: whereClause }),
        this.prisma.task.findMany({
          where: whereClause,
          take: limit,
          skip,
          orderBy: { createdAt: 'desc' },
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
      throw new InternalServerErrorException('Erro ao buscar tarefas.');
    }
  }

  async findOne(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada.');
    }

    return task;
  }

  async update(id: string, userId: string, dto: UpdateTaskDto) {
    await this.findOne(id, userId);

    try {
      return await this.prisma.task.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          status: dto.status, // <-- Permite alterar status via PATCH
          startDate: dto.startDate,
          endDate: dto.endDate,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao atualizar a tarefa.');
    }
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    try {
      await this.prisma.task.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return { message: 'Tarefa removida com sucesso.' };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao remover a tarefa.');
    }
  }
}
