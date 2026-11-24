import { getConfig, resetConfig } from "./lib/config";
import { closeDb, useDatabase } from "./lib/db";
import { seedDemo } from "./lib/seed";

async function main() {
  resetConfig();
  const { dbFile } = getConfig();
  const db = useDatabase(dbFile);
  try {
    await seedDemo(db);
    console.log("演示账号 mina / leo / ava，密码 password123");
  } finally {
    closeDb();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
