import { Module } from '@nestjs/common';
import { MealLogsService } from './meal-logs.service';
import { MealLogsController } from './meal-logs.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MealLogsController],
  providers: [MealLogsService],
  exports: [MealLogsService],
})
export class MealLogsModule {}
