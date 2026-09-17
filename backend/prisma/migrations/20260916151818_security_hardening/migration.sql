-- security_hardening：级联策略修正（审计/评论/工时/登录日志删用户置空）、裸外键补齐、索引体系完善、
-- Task.completedAt/order 新增、邮箱大小写不敏感唯一约束

-- 前置数据清理：裸外键补齐前，将悬空引用置 NULL（历史上硬删用户可能留下指向已删用户的值，直接加 FK 会失败）
UPDATE "Attachment" SET "uploaderId" = NULL WHERE "uploaderId" IS NOT NULL AND "uploaderId" NOT IN (SELECT "id" FROM "User");
UPDATE "TaskTemplate" SET "createdBy" = NULL WHERE "createdBy" IS NOT NULL AND "createdBy" NOT IN (SELECT "id" FROM "User");
UPDATE "RecurringTask" SET "createdBy" = NULL WHERE "createdBy" IS NOT NULL AND "createdBy" NOT IN (SELECT "id" FROM "User");

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_userId_fkey";

-- DropForeignKey
ALTER TABLE "LoginLog" DROP CONSTRAINT "LoginLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "TimeEntry" DROP CONSTRAINT "TimeEntry_userId_fkey";

-- DropIndex
DROP INDEX "BoardColumn_teamId_idx";

-- DropIndex
DROP INDEX "Label_teamId_idx";

-- DropIndex
DROP INDEX "LoginLog_userId_idx";

-- DropIndex
DROP INDEX "Task_teamId_isArchived_idx";

-- AlterTable
ALTER TABLE "Attachment" ALTER COLUMN "uploaderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Comment" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LoginLog" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RecurringTask" ALTER COLUMN "createdBy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- 历史 DONE 任务回填 completedAt（报表口径统一以 completedAt 为准）
UPDATE "Task" SET "completedAt" = "updatedAt" WHERE "status" = 'DONE' AND "completedAt" IS NULL;

-- AlterTable
ALTER TABLE "TaskTemplate" ALTER COLUMN "createdBy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TimeEntry" ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Attachment_uploaderId_idx" ON "Attachment"("uploaderId");

-- CreateIndex
CREATE INDEX "BoardColumn_teamId_order_idx" ON "BoardColumn"("teamId", "order");

-- CreateIndex
CREATE INDEX "LoginLog_userId_createdAt_idx" ON "LoginLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Mention_userId_sourceType_sourceId_key" ON "Mention"("userId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "Subtask_taskId_idx" ON "Subtask"("taskId");

-- CreateIndex
CREATE INDEX "Task_teamId_isArchived_status_idx" ON "Task"("teamId", "isArchived", "status");

-- CreateIndex
CREATE INDEX "Task_assigneeId_isArchived_idx" ON "Task"("assigneeId", "isArchived");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_milestoneId_idx" ON "Task"("milestoneId");

-- CreateIndex
CREATE INDEX "TaskLabel_labelId_idx" ON "TaskLabel"("labelId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_role_idx" ON "TeamMember"("teamId", "role");

-- 邮箱大小写不敏感唯一约束（应用层已统一小写存储，此处 DB 层兜底）
-- 历史数据统一小写化；若存在仅大小写不同的重复账号，索引创建会明确报错，需人工合并账号后重放
UPDATE "User" SET "email" = LOWER("email");
CREATE UNIQUE INDEX "User_email_lower_key" ON "User"(LOWER("email"));

-- AddForeignKey
ALTER TABLE "LoginLog" ADD CONSTRAINT "LoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTask" ADD CONSTRAINT "RecurringTask_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
