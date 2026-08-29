-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "WeightGoal" (
    "id" TEXT NOT NULL,
    "startWeight" DECIMAL(6,2) NOT NULL,
    "targetWeight" DECIMAL(6,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetDate" TIMESTAMP(3),
    "weeklyRateGoal" DECIMAL(4,2),
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WeightGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeightGoal_userId_status_deletedAt_idx" ON "WeightGoal"("userId", "status", "deletedAt");

-- AddForeignKey
ALTER TABLE "WeightGoal" ADD CONSTRAINT "WeightGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
