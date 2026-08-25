import { IsOptional, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindWeightLogsQueryDto {
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
    description: 'Data inicial do filtro (ISO 8601 ou YYYY-MM-DD)',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'startDate deve ser uma data ISO válida.' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data final do filtro (ISO 8601 ou YYYY-MM-DD)',
    example: '2026-08-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'endDate deve ser uma data ISO válida.' })
  endDate?: string;
}
