import { Module } from '@nestjs/common';
import { RecurringTransactionsService } from './recurring-transactions.service';
import { RecurringTransactionsController } from './recurring-transactions.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  controllers: [RecurringTransactionsController],
  providers: [RecurringTransactionsService],
  imports: [PrismaModule],
  exports: [RecurringTransactionsService],
})
export class RecurringTransactionsModule {}
