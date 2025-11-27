import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
