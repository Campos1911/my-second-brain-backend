import { PartialType } from '@nestjs/mapped-types';
import { CreateRecurringTransactionDto } from './create-recurring-transaction.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateRecurringTransactionDto extends PartialType(
  CreateRecurringTransactionDto,
) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
