-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskAssigned" BOOLEAN NOT NULL DEFAULT true,
    "taskStatusChanged" BOOLEAN NOT NULL DEFAULT true,
    "taskDueSoon" BOOLEAN NOT NULL DEFAULT true,
    "taskOverdue" BOOLEAN NOT NULL DEFAULT true,
    "newComment" BOOLEAN NOT NULL DEFAULT true,
    "projectMemberAdded" BOOLEAN NOT NULL DEFAULT true,
    "teamJoined" BOOLEAN NOT NULL DEFAULT true,
    "browserPush" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
