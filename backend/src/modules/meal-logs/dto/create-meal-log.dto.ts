import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MealType } from '../../../generated/prisma/client';
import { AddMealItemDto } from './add-meal-item.dto';

export class CreateMealItemInputDto extends AddMealItemDto {}

export class CreateMealLogDto {
  @ApiProperty({
    description: 'Data de registro da refeição (Formato YYYY-MM-DD)',
    example: '2026-08-25',
  })
  @IsNotEmpty({ message: 'A data da refeição é obrigatória.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'A data deve estar estritamente no formato YYYY-MM-DD.',
  })
  date!: string;

  @ApiPropertyOptional({
    description: 'Tipo da refeição',
    enum: MealType,
    default: MealType.LUNCH,
  })
  @IsEnum(MealType, {
    message:
      'Tipo de refeição inválido. Use: BREAKFAST, MORNING_SNACK, LUNCH, AFTERNOON_SNACK, DINNER, SUPPER ou SNACK.',
  })
  @IsOptional()
  mealType?: MealType = MealType.LUNCH;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre a refeição',
    example: 'Almoço pós-treino com bastante salada',
  })
  @IsString({ message: 'As notas devem ser uma string.' })
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Lista inicial de alimentos consumidos nesta refeição',
    type: [CreateMealItemInputDto],
  })
  @IsArray({
    message: 'Os itens da refeição devem ser fornecidos em um array.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateMealItemInputDto)
  @IsOptional()
  items?: CreateMealItemInputDto[];
}
