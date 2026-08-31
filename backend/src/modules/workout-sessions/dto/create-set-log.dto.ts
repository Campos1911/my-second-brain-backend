import { IsUUID, IsInt, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSetLogDto {
  @ApiProperty({ description: 'ID do exercício realizado' })
  @IsUUID('4', { message: 'O ID do exercício deve ser um UUID válido.' })
  exerciseId!: string;

  @ApiProperty({ description: 'Número de repetições realizadas', example: 10 })
  @IsInt()
  @Min(1, { message: 'As repetições devem ser no mínimo 1.' })
  reps!: number;

  @ApiProperty({ description: 'Carga utilizada (kg)', example: 60.5 })
  @IsNumber({}, { message: 'O peso deve ser um número decimal válido.' })
  @Min(0, { message: 'O peso não pode ser negativo.' })
  weight!: number;

  @ApiPropertyOptional({ description: 'Indica se a série foi até a falha concêntrica', default: false })
  @IsOptional()
  @IsBoolean()
  toFailure?: boolean = false;
}
