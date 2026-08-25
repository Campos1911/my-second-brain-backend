import { IsOptional, IsInt, Min, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindFoodsQueryDto {
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
    description: 'Quantidade de itens por página',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O limite deve ser um número inteiro.' })
  @Min(1, { message: 'O limite mínimo é 1.' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Termo de busca para filtrar por nome ou marca',
    example: 'frango',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar exclusivamente alimentos criados pelo usuário autenticado',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'O campo onlyMine deve ser um booleano.' })
  onlyMine?: boolean;
}