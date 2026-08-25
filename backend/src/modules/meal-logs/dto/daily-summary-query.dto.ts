import { IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DailySummaryQueryDto {
  @ApiPropertyOptional({
    description:
      'Data alvo do painel diário (Formato YYYY-MM-DD). Se omitido, usa a data atual.',
    example: '2026-08-25',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'A data deve estar estritamente no formato YYYY-MM-DD.',
  })
  date?: string;
}
