import { IsUUID } from 'class-validator';

export class StartSessionDto {
  @IsUUID('4', { message: 'O ID do plano de treino deve ser um UUID válido.' })
  workoutPlanId!: string;
}
