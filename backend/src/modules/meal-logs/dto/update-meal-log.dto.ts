import { IsOptional, IsEnum, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MealType } from '../../../generated/prisma/client';

export class UpdateMealLogDto {
  @ApiPropertyOptional({
    description: 'Data de registro da refeição (Formato YYYY-MM-DD)',
    example: '2026-08-25',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'A data deve estar estritamente no formato YYYY-MM-DD.',
  })
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    description: 'Tipo da refeição',
    enum: MealType,
  })
  @IsEnum(MealType, {
    message:
      'Tipo de refeição inválido. Use: BREAKFAST, MORNING_SNACK, LUNCH, AFTERNOON_SNACK, DINNER, SUPPER ou SNACK.',
  })
  @IsOptional()
  mealType?: MealType;

  @ApiPropertyOptional({
    description: 'Observações adicionais',
    example: 'Almoço atualizado sem sobremesa',
  })
  @IsString({ message: 'As notas devem ser uma string.' })
  @IsOptional()
  notes?: string;
}
