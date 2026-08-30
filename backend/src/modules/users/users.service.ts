import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12;
  private readonly userSelect: Prisma.UserSelect = {
    id: true,
    name: true,
    email: true,
    createdAt: true,
    updatedAt: true,
  };

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const hash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash: hash,
        },
        select: this.userSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Este e-mail já está em uso.');
        }
      }
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao processar criação.');
    }
  }

  async findByEmailInternal(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });
    return user;
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      take: limit,
      skip,
      select: this.userSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: this.userSelect,
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const { password, ...rest } = dto;
    const dataToUpdate: Prisma.UserUpdateInput = { ...rest };
    if (password) {
      dataToUpdate.passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
    }
    try {
      return await this.prisma.user.update({
        where: { id, deletedAt: null },
        data: dataToUpdate,
        select: this.userSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Usuário não encontrado ou já deletado.');
        }
      }
      this.logger.error(error);
      throw new InternalServerErrorException('Erro ao atualizar usuário.');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.user.update({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return { message: 'Usuário removido com sucesso.' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Usuário não encontrado ou já removido.');
        }
      }
      throw new InternalServerErrorException('Erro ao remover usuário.');
    }
  }
}
