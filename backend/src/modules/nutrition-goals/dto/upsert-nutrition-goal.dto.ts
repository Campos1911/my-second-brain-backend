import { IsNumber, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertNutritionGoalDto {
  @ApiProperty({
    description: 'Meta calórica diária em kcal',
    example: 2000.0,
    minimum: 500,
    maximum: 10000,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'As calorias devem ser um número válido.' },
  )
  @Min(500, { message: 'A meta calórica mínima permitida é 500 kcal.' })
  @Max(10000, { message: 'A meta calórica máxima permitida é 10.000 kcal.' })
  targetCalories!: number;

  @ApiProperty({
    description: 'Meta diária de proteínas em gramas',
    example: 160.0,
    minimum: 0,
    maximum: 1000,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A quantidade de proteína deve ser um número válido.' },
  )
  @Min(0, { message: 'A quantidade de proteína não pode ser negativa.' })
  @Max(1000, { message: 'A meta de proteína máxima é 1000g.' })
  targetProtein!: number;

  @ApiProperty({
    description: 'Meta diária de carboidratos em gramas',
    example: 200.0,
    minimum: 0,
    maximum: 1500,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A quantidade de carboidratos deve ser um número válido.' },
  )
  @Min(0, { message: 'A quantidade de carboidratos não pode ser negativa.' })
  @Max(1500, { message: 'A meta de carboidratos máxima é 1500g.' })
  targetCarbs!: number;

  @ApiProperty({
    description: 'Meta diária de gorduras em gramas',
    example: 60.0,
    minimum: 0,
    maximum: 500,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A quantidade de gordura deve ser um número válido.' },
  )
  @Min(0, { message: 'A quantidade de gordura não pode ser negativa.' })
  @Max(500, { message: 'A meta de gordura máxima é 500g.' })
  targetFat!: number;

  @ApiPropertyOptional({
    description: 'Meta diária de fibras alimentares em gramas',
    example: 28.0,
    minimum: 0,
    maximum: 200,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A quantidade de fibras deve ser um número válido.' },
  )
  @Min(0, { message: 'A quantidade de fibras não pode ser negativa.' })
  @Max(200, { message: 'A meta de fibras máxima é 200g.' })
  @IsOptional()
  targetFiber?: number;

  @ApiPropertyOptional({
    description: 'Meta de peso corporal alvo em kg',
    example: 75.0,
    minimum: 20.0,
    maximum: 400.0,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'O peso alvo deve ser um número válido.' },
  )
  @Min(20.0, { message: 'O peso alvo mínimo permitido é 20.00 kg.' })
  @Max(400.0, { message: 'O peso alvo máximo permitido é 400.00 kg.' })
  @IsOptional()
  targetWeight?: number;
}
