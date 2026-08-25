import { IsOptional, IsEnum, IsInt, Min, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MealType } from '../../../generated/prisma/client';

export class FindMealLogsQueryDto {
  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A página deve ser um número inteiro.' })
  @Min(1, { message: 'A página mínima é 1.' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O limite deve ser um número inteiro.' })
  @Min(1, { message: 'O limite mínimo é 1.' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filtrar por data específica (YYYY-MM-DD)',
    example: '2026-08-25',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'A data deve estar estritamente no formato YYYY-MM-DD.',
  })
  date?: string;

  @ApiPropertyOptional({
    description: 'Data inicial do período (YYYY-MM-DD)',
    example: '2026-08-01',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'A data inicial deve estar estritamente no formato YYYY-MM-DD.',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data final do período (YYYY-MM-DD)',
    example: '2026-08-31',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'A data final deve estar estritamente no formato YYYY-MM-DD.',
  })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de refeição',
    enum: MealType,
  })
  @IsOptional()
  @IsEnum(MealType, {
    message: 'Tipo de refeição inválido.',
  })
  mealType?: MealType;
}
