import { Module } from '@nestjs/common';
import { NutritionGoalsService } from './nutrition-goals.service';
import { NutritionGoalsController } from './nutrition-goals.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NutritionGoalsController],
  providers: [NutritionGoalsService],
  exports: [NutritionGoalsService],
})
export class NutritionGoalsModule {}
