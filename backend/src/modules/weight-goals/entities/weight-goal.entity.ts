import { GoalStatus } from '../../../generated/prisma/client';

export class WeightGoal {
  id!: string;
  startWeight!: number;
  targetWeight!: number;
  startDate!: Date;
  targetDate?: Date | null;
  weeklyRateGoal?: number | null;
  status!: GoalStatus;
  notes?: string | null;
  userId!: string;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date | null;
}
