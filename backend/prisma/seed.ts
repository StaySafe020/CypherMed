import prisma from "../src/prisma";

async function main() {
  // Seeding removed - use real patient data from authentication
  console.log("Seed function: no mock data to create");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
