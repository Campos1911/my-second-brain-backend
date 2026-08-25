import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsUUID,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class WorkoutPlanExerciseInputDto {
  @ApiProperty({
    description: 'ID do exercício estruturado',
    example: 'a8c90be6-7d1c-4b5b-80df-4f40bb8be452',
  })
  @IsUUID('4', { message: 'O ID do exercício deve ser um UUID válido.' })
  exerciseId!: string;

  @ApiProperty({
    description: 'Séries recomendadas para o exercício',
    example: 4,
  })
  @IsInt({ message: 'A quantidade de séries deve ser um número inteiro.' })
  @Min(1, { message: 'O plano deve recomendar ao menos 1 série.' })
  targetSets!: number;

  @ApiProperty({
    description: 'Meta mínima de repetições planejada',
    example: 8,
  })
  @IsInt({
    message: 'O número de repetições mínimas deve ser um número inteiro.',
  })
  @Min(1, { message: 'A meta mínima deve ser ao menos 1 repetição.' })
  targetMinReps!: number;

  @ApiProperty({
    description: 'Meta máxima de repetições planejada',
    example: 12,
  })
  @IsInt({
    message: 'O número de repetições máximas deve ser um número inteiro.',
  })
  @Min(1, { message: 'A meta máxima deve ser ao menos 1 repetição.' })
  targetMaxReps!: number;
}

export class CreateWorkoutPlanDto {
  @ApiProperty({
    description: 'Nome identificador do plano de treino',
    example: 'Treino A - Peito & Tríceps',
  })
  @IsString()
  @IsNotEmpty({ message: 'O nome do plano de treino não pode ser vazio.' })
  name!: string;

  @ApiProperty({
    description:
      'Lista obrigatória contendo os exercícios com suas respectivas metas',
    type: [WorkoutPlanExerciseInputDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkoutPlanExerciseInputDto)
  exercises!: WorkoutPlanExerciseInputDto[];
}
