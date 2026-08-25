import { Module } from '@nestjs/common';
import { WorkoutSessionsService } from './workout-sessions.service';
import { WorkoutSessionsController } from './workout-sessions.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorkoutSessionsController],
  providers: [WorkoutSessionsService],
  exports: [WorkoutSessionsService],
})
export class WorkoutSessionsModule {}
