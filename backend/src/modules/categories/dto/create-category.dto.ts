import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { CategoryType } from '../../../generated/prisma/client';

export class CreateCategoryDto {
  /**
   * Nome identificador da categoria.
   * @example "Alimentação"
   */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * Destinação e fluxo operacional da categoria (INCOME, EXPENSE ou FITNESS).
   * @example "EXPENSE"
   */
  @IsEnum(CategoryType, {
    message: 'Tipo de categoria inválido. Use: INCOME, EXPENSE ou FITNESS',
  })
  type!: CategoryType;
}
