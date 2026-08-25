import {
  IsNumber,
  IsOptional,
  IsDateString,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWeightLogDto {
  @ApiProperty({
    description: 'Peso corporal registrado em kg (entre 20.00 e 400.00)',
    example: 78.5,
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

  @ApiPropertyOptional({
    description:
      'Data e hora da pesagem no formato ISO 8601. Se omitido, assume a data/hora atual.',
    example: '2026-08-25T08:00:00.000Z',
  })
  @IsDateString(
    {},
    { message: 'A data deve ser uma string de data ISO válida.' },
  )
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    description: 'Observações contextuais sobre a pesagem',
    example: 'Pesagem matinal em jejum',
  })
  @IsString({ message: 'As observações devem ser uma string.' })
  @IsOptional()
  notes?: string;
}
