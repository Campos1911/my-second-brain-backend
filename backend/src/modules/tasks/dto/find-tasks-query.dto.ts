import { IsOptional, IsInt, Min, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskPriority } from './create-task.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../../../generated/prisma/client'; // <-- Importado

export class FindTasksQueryDto {
  @ApiPropertyOptional({
    description: 'Número da página para paginação',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de itens por página',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Termo de busca para filtrar por título ou descrição',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por prioridade',
    enum: TaskPriority,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Filtrar por status', enum: TaskStatus }) // <-- Novo filtro
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;
}
