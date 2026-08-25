import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServingUnit } from '../../../generated/prisma/client';

export class CreateFoodDto {
  @ApiProperty({
    description: 'Nome do alimento',
    example: 'Peito de Frango Grelhado',
  })
  @IsString({ message: 'O nome deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome do alimento é obrigatório.' })
  @MinLength(2, { message: 'O nome deve ter no mínimo 2 caracteres.' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Marca ou fabricante do alimento',
    example: 'Sadia',
  })
  @IsString({ message: 'A marca deve ser uma string.' })
  @IsOptional()
  brand?: string;

  @ApiProperty({
    description: 'Tamanho da porção de referência',
    example: 100,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A porção deve ser um número válido.' },
  )
  @Min(0.01, { message: 'O tamanho da porção deve ser maior que zero.' })
  servingSize!: number;

  @ApiPropertyOptional({
    description: 'Unidade de medida da porção',
    enum: ServingUnit,
    default: ServingUnit.GRAM,
  })
  @IsEnum(ServingUnit, {
    message:
      'Unidade inválida. Use: GRAM, MILLILITER, UNIT, TABLESPOON, TEASPOON, SCOOP ou CUP.',
  })
  @IsOptional()
  servingUnit?: ServingUnit = ServingUnit.GRAM;

  @ApiProperty({
    description: 'Calorias da porção (kcal)',
    example: 165,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'As calorias devem ser um número válido.' },
  )
  @Min(0, { message: 'As calorias não podem ser negativas.' })
  calories!: number;

  @ApiProperty({
    description: 'Quantidade de proteínas (g)',
    example: 31.0,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A quantidade de proteínas deve ser um número válido.' },
  )
  @Min(0, { message: 'A quantidade de proteínas não pode ser negativa.' })
  protein!: number;

  @ApiProperty({
    description: 'Quantidade de carboidratos (g)',
    example: 0,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A quantidade de carboidratos deve ser um número válido.' },
  )
  @Min(0, { message: 'A quantidade de carboidratos não pode ser negativa.' })
  carbs!: number;

  @ApiProperty({
    description: 'Quantidade de gorduras totais (g)',
    example: 3.6,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A quantidade de gorduras deve ser um número válido.' },
  )
  @Min(0, { message: 'A quantidade de gorduras não pode ser negativa.' })
  fat!: number;

  @ApiPropertyOptional({
    description: 'Quantidade de fibras alimentares (g)',
    example: 0,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A quantidade de fibras deve ser um número válido.' },
  )
  @Min(0, { message: 'A quantidade de fibras não pode ser negativa.' })
  @IsOptional()
  fiber?: number;
}