-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LoginLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginLog_userId_idx" ON "LoginLog"("userId");

-- AddForeignKey
ALTER TABLE "LoginLog" ADD CONSTRAINT "LoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
