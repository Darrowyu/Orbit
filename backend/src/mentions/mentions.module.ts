import { Module } from '@nestjs/common';
import { MentionsService } from './mentions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [MentionsService],
  exports: [MentionsService],
})
export class MentionsModule {}
