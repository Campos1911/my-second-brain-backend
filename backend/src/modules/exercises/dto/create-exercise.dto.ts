import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateExerciseDto {
  /**
   * Nome do exercício.
   * @example "Supino Reto"
   */
  @IsString()
  @IsNotEmpty({ message: 'O nome do exercício é obrigatório.' })
  name!: string;

  /**
   * ID da categoria FITNESS correspondente.
   * @example "a8c90be6-7d1c-4b5b-80df-4f40bb8be452"
   */
  @IsUUID('4', { message: 'A categoria deve ser um UUID válido.' })
  categoryId!: string;
}
