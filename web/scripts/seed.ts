import { seedCatalog } from "../lib/db/seed";

async function main(): Promise<void> {
  await seedCatalog();
  console.log("Catalog seed completed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
