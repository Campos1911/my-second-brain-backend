import {
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BiologicalSex, ActivityLevel } from '../../../generated/prisma/client';

export class CalculateNutritionGoalDto {
  @ApiProperty({
    description: 'Peso atual em kg (ex: 80.5)',
    example: 80.5,
    minimum: 20.0,
    maximum: 400.0,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'O peso deve ser um número válido com até 2 casas decimais.' },
  )
  @Min(20.0, { message: 'O peso mínimo permitido é 20.00 kg.' })
  @Max(400.0, { message: 'O peso máximo permitido é 400.00 kg.' })
  weight!: number;

  @ApiProperty({
    description: 'Altura em centímetros (ex: 175.0)',
    example: 175.0,
    minimum: 50.0,
    maximum: 280.0,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A altura deve ser um número válido em cm.' },
  )
  @Min(50.0, { message: 'A altura mínima permitida é 50 cm.' })
  @Max(280.0, { message: 'A altura máxima permitida é 280 cm.' })
  height!: number;

  @ApiProperty({
    description: 'Idade em anos completos',
    example: 28,
    minimum: 10,
    maximum: 120,
  })
  @Type(() => Number)
  @IsInt({ message: 'A idade deve ser um número inteiro.' })
  @Min(10, { message: 'A idade mínima permitida é 10 anos.' })
  @Max(120, { message: 'A idade máxima permitida é 120 anos.' })
  age!: number;

  @ApiProperty({
    description: 'Sexo biológico para a fórmula metabólica',
    enum: BiologicalSex,
    example: BiologicalSex.MALE,
  })
  @IsEnum(BiologicalSex, {
    message: 'Sexo biológico inválido. Use MALE ou FEMALE.',
  })
  sex!: BiologicalSex;

  @ApiProperty({
    description: 'Nível de atividade física diária',
    enum: ActivityLevel,
    example: ActivityLevel.MODERATELY_ACTIVE,
  })
  @IsEnum(ActivityLevel, {
    message:
      'Nível de atividade física inválido. Use: SEDENTARY, LIGHTLY_ACTIVE, MODERATELY_ACTIVE, VERY_ACTIVE ou EXTRA_ACTIVE.',
  })
  activityLevel!: ActivityLevel;

  @ApiPropertyOptional({
    description: 'Meta de perda de peso em kg por mês (ex: 2.0 para perder 2kg/mês)',
    example: 2.0,
    default: 0,
    minimum: 0,
    maximum: 10,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A meta de perda de peso deve ser um número válido.' },
  )
  @Min(0, { message: 'A meta de perda de peso não pode ser negativa.' })
  @Max(10, { message: 'A meta mensal máxima segura recomendada é de 10 kg.' })
  @IsOptional()
  weightLossGoalKgPerMonth?: number = 0;

  @ApiPropertyOptional({
    description: 'Gramas de proteína por kg de peso corporal (padrão: 2.0 g/kg)',
    example: 2.0,
    default: 2.0,
    minimum: 0.5,
    maximum: 4.0,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A cota de proteína por kg deve ser um número válido.' },
  )
  @Min(0.5, { message: 'A cota mínima de proteína é 0.5 g/kg.' })
  @Max(4.0, { message: 'A cota máxima de proteína é 4.0 g/kg.' })
  @IsOptional()
  proteinPerKg?: number = 2.0;

  @ApiPropertyOptional({
    description: 'Gramas de gordura por kg de peso corporal (padrão: 0.8 g/kg)',
    example: 0.8,
    default: 0.8,
    minimum: 0.2,
    maximum: 2.5,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A cota de gordura por kg deve ser um número válido.' },
  )
  @Min(0.2, { message: 'A cota mínima de gordura é 0.2 g/kg.' })
  @Max(2.5, { message: 'A cota máxima de gordura é 2.5 g/kg.' })
  @IsOptional()
  fatPerKg?: number = 0.8;
}
