import { Module } from '@nestjs/common';
import { WeightLogsService } from './weight-logs.service';
import { WeightLogsController } from './weight-logs.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WeightLogsController],
  providers: [WeightLogsService],
  exports: [WeightLogsService],
})
export class WeightLogsModule {}
