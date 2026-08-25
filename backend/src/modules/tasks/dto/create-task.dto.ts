import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../../../generated/prisma/client'; // <-- Importado do Prisma Client gerado

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class CreateTaskDto {
  @ApiProperty({ description: 'Título da tarefa', example: 'Estudar NestJS' })
  @IsString()
  @IsNotEmpty({ message: 'O título da tarefa é obrigatório.' })
  title!: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da tarefa',
    example: 'Estudar os conceitos de injeção de dependência',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Prioridade da tarefa',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  @IsEnum(TaskPriority, {
    message: 'A prioridade deve ser LOW, MEDIUM ou HIGH.',
  })
  priority!: TaskPriority;

  @ApiPropertyOptional({
    description: 'Status atual da tarefa no fluxo',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  @IsEnum(TaskStatus, {
    message: 'O status deve ser TODO, IN_PROGRESS ou DONE.',
  })
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Data de início da tarefa',
    example: '2024-03-20T00:00:00.000Z',
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Data de término da tarefa',
    example: '2024-03-25T00:00:00.000Z',
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
}
