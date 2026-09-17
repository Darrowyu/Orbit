-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "mention" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "projectMemberRemoved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "projectRoleChanged" BOOLEAN NOT NULL DEFAULT true;
