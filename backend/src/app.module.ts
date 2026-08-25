import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { FinanceModule } from './modules/finance/finance.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { RecurringTransactionsModule } from './modules/recurring-transactions/recurring-transactions.module';
import { WorkoutPlansModule } from './modules/workout-plans/workout-plans.module';
import { WorkoutSessionsModule } from './modules/workout-sessions/workout-sessions.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { FoodsModule } from './modules/foods/foods.module';
import { MealLogsModule } from './modules/meal-logs/meal-logs.module';
import { WeightLogsModule } from './modules/weight-logs/weight-logs.module';
import { validate } from './common/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    PrismaModule,
    UsersModule,
    AuthModule,
    FinanceModule,
    CategoriesModule,
    RecurringTransactionsModule,
    WorkoutPlansModule,
    WorkoutSessionsModule,
    ExercisesModule,
    TasksModule,
    FoodsModule,
    MealLogsModule,
    WeightLogsModule, // <-- ADICIONADO AQUI
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
