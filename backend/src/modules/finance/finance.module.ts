import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './finance.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService],
  imports: [PrismaModule],
})
export class FinanceModule {}
