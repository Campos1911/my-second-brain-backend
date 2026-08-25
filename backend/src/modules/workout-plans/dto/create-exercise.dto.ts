import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateExerciseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUUID('4', { message: 'A categoria deve ser um UUID válido.' })
  categoryId!: string;
}
