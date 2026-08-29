import {
  IsNumber,
  IsOptional,
  IsDateString,
  IsString,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoalStatus } from '../../../generated/prisma/client';

export class CreateWeightGoalDto {
  @ApiProperty({
    description: 'Peso alvo/objetivo em kg (entre 20.00 e 400.00)',
    example: 72.0,
    minimum: 20.0,
    maximum: 400.0,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'O peso alvo deve ser um número válido com até 2 casas decimais.',
    },
  )
  @Min(20.0, { message: 'O peso alvo mínimo permitido é 20.00 kg.' })
  @Max(400.0, { message: 'O peso alvo máximo permitido é 400.00 kg.' })
  targetWeight!: number;

  @ApiPropertyOptional({
    description:
      'Peso inicial de partida em kg. Se omitido, o sistema utilizará o peso registrado mais recente do usuário.',
    example: 80.5,
    minimum: 20.0,
    maximum: 400.0,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'O peso inicial deve ser um número válido com até 2 casas decimais.',
    },
  )
  @Min(20.0, { message: 'O peso inicial mínimo permitido é 20.00 kg.' })
  @Max(400.0, { message: 'O peso inicial máximo permitido é 400.00 kg.' })
  @IsOptional()
  startWeight?: number;

  @ApiPropertyOptional({
    description:
      'Data de início da meta no formato ISO (YYYY-MM-DD ou ISO 8601). Se omitido, assume a data atual.',
    example: '2026-08-29T00:00:00.000Z',
  })
  @IsDateString({}, { message: 'startDate deve ser uma data ISO válida.' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'Data limite planejada para atingir o peso objetivo no formato ISO.',
    example: '2026-12-31T00:00:00.000Z',
  })
  @IsDateString({}, { message: 'targetDate deve ser uma data ISO válida.' })
  @IsOptional()
  targetDate?: string;

  @ApiPropertyOptional({
    description:
      'Meta planejada de ritmo de perda semanal em kg (ex: 0.50 para 500g por semana).',
    example: 0.5,
    minimum: 0.05,
    maximum: 3.0,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A taxa semanal deve ser um número válido.' },
  )
  @Min(0.05, {
    message: 'O ritmo semanal mínimo recomendado é 0.05 kg/semana.',
  })
  @Max(3.0, {
    message: 'O ritmo semanal máximo seguro é de 3.00 kg/semana.',
  })
  @IsOptional()
  weeklyRateGoal?: number;

  @ApiPropertyOptional({
    description: 'Status inicial da meta',
    enum: GoalStatus,
    default: GoalStatus.ACTIVE,
  })
  @IsEnum(GoalStatus, {
    message: 'Status inválido. Use ACTIVE, COMPLETED ou ABANDONED.',
  })
  @IsOptional()
  status?: GoalStatus = GoalStatus.ACTIVE;

  @ApiPropertyOptional({
    description:
      'Observações, protocolo ou anotações contextuais sobre esta meta',
    example: 'Protocolo de cutting de 16 semanas para definição',
  })
  @IsString({ message: 'As observações devem ser uma string.' })
  @IsOptional()
  notes?: string;
}
