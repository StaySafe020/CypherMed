-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "birthCertificate" TEXT,
ADD COLUMN     "guardianTransferredAt" TIMESTAMP(3),
ADD COLUMN     "isMinor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nationalId" TEXT;

-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "guardianWallet" TEXT NOT NULL,
    "guardianPatientId" TEXT,
    "relationship" TEXT NOT NULL,
    "canApprove" BOOLEAN NOT NULL DEFAULT true,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canCreate" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BirthRegistration" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "birthCertificateId" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "birthPlace" TEXT NOT NULL,
    "birthWeight" DOUBLE PRECISION,
    "birthLength" DOUBLE PRECISION,
    "motherName" TEXT,
    "fatherName" TEXT,
    "attendingPhysician" TEXT,
    "registeredBy" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "BirthRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_patientId_guardianWallet_key" ON "Guardian"("patientId", "guardianWallet");

-- CreateIndex
CREATE UNIQUE INDEX "BirthRegistration_patientId_key" ON "BirthRegistration"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "BirthRegistration_birthCertificateId_key" ON "BirthRegistration"("birthCertificateId");

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_guardianPatientId_fkey" FOREIGN KEY ("guardianPatientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
