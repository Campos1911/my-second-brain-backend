import { IsOptional, IsString, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindExercisesQueryDto {
  /**
   * Número da página para paginação.
   * @example 1
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Quantidade de itens por página.
   * @example 20
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  /**
   * Filtro de busca parcial case-insensitive no nome do exercício.
   * @example "Supino"
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Filtro pelo ID da categoria.
   * @example "a8c90be6-7d1c-4b5b-80df-4f40bb8be452"
   */
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  /**
   * Filtro pelo ID de um plano de treino associado (busca via relacionamento Many-to-Many).
   * @example "b9d01ce7-8e2d-5c6c-91ef-5f51cc9cf563"
   */
  @IsOptional()
  @IsUUID('4')
  workoutPlanId?: string;
}
