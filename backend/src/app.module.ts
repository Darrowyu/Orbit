import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { TasksModule } from './tasks/tasks.module';
import { ProjectsModule } from './projects/projects.module';
import { AiModule } from './ai/ai.module';
import { GatewayModule } from './gateway/gateway.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { UploadModule } from './upload/upload.module';
import { CommentsModule } from './comments/comments.module';
import { AuditModule } from './audit/audit.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { LabelsModule } from './labels/labels.module';
import { SearchModule } from './search/search.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { MilestonesModule } from './milestones/milestones.module';
import { MentionsModule } from './mentions/mentions.module';
import { TemplatesModule } from './templates/templates.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { ReportsModule } from './reports/reports.module';
import { RecurringModule } from './recurring/recurring.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    ProjectsModule,
    TasksModule,
    AiModule,
    GatewayModule,
    NotificationsModule,
    AdminModule,
    UploadModule,
    CommentsModule,
    AuditModule,
    SchedulerModule,
    LabelsModule,
    SearchModule,
    AttachmentsModule,
    MilestonesModule,
    MentionsModule,
    TemplatesModule,
    TimeEntriesModule,
    ReportsModule,
    RecurringModule,
  ],
})
export class AppModule { }
