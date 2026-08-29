import { Module } from '@nestjs/common';
import { WeightGoalsService } from './weight-goals.service';
import { WeightGoalsController } from './weight-goals.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WeightGoalsController],
  providers: [WeightGoalsService],
  exports: [WeightGoalsService],
})
export class WeightGoalsModule {}
