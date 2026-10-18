CREATE TABLE "enrollment_history" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sectionId" TEXT,
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousClass" TEXT,
    "remarks" TEXT,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "enrollment_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "enrollment_history_sessionId_idx" ON "enrollment_history"("sessionId");
CREATE UNIQUE INDEX "enrollment_history_studentId_sessionId_key" ON "enrollment_history"("studentId", "sessionId");
ALTER TABLE "enrollment_history" ADD CONSTRAINT "enrollment_history_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
