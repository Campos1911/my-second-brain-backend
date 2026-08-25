import {
  IsUUID,
  IsInt,
  IsNumber,
  Min,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class LogSetDto {
  @IsUUID('4', { message: 'O ID do exercício deve ser um UUID válido.' })
  exerciseId!: string;

  @IsInt({ message: 'O número de repetições deve ser um número inteiro.' })
  @Min(1, { message: 'A série deve possuir no mínimo 1 repetição.' })
  reps!: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'O peso deve ser um número válido com até duas casas decimais.',
    },
  )
  @Min(0, { message: 'O peso não pode ser um valor negativo.' })
  weight!: number;

  @IsBoolean({ message: 'O indicador "até a falha" deve ser um booleano.' })
  @IsOptional()
  toFailure?: boolean = false;
}
