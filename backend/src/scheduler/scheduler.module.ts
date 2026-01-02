import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule, PrismaModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
