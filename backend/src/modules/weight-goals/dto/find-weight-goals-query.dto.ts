import { IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GoalStatus } from '../../../generated/prisma/client';

export class FindWeightGoalsQueryDto {
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
    description: 'Filtrar por status da meta',
    enum: GoalStatus,
  })
  @IsOptional()
  @IsEnum(GoalStatus, {
    message: 'Status inválido. Use ACTIVE, COMPLETED ou ABANDONED.',
  })
  status?: GoalStatus;
}
