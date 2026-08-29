import { PartialType } from '@nestjs/swagger';
import { CreateWeightGoalDto } from './create-weight-goal.dto';

export class UpdateWeightGoalDto extends PartialType(CreateWeightGoalDto) {}
