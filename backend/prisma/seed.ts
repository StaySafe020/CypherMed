import prisma from "../src/prisma";

async function main() {
  // Create a test patient using Prisma Client. Run this after `prisma migrate dev`.
  const existing = await prisma.patient.findFirst({ where: { wallet: "TEST_WALLET_PUBKEY" } });
  if (existing) {
    console.log("Test patient already exists:", existing.id);
    return;
  }

  const patient = await prisma.patient.create({
    data: {
      wallet: "TEST_WALLET_PUBKEY",
      name: "Test Patient",
      dob: new Date("1990-01-01T00:00:00Z"),
      emergencyContact: null,
    },
  });

  console.log("Created test patient with id:", patient.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
