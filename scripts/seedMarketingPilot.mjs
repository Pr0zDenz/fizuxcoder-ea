import { eq } from "drizzle-orm";
import { getDb } from "../server/db.ts";
import { seedTwoWeekThreadsPilot } from "../server/marketingStudio.ts";
import { users } from "../drizzle/schema.ts";

const OWNER_EMAIL = "xtr0zen@gmail.com";

const db = await getDb();
if (!db) throw new Error("Database is unavailable");

const [owner] = await db
  .select({ id: users.id, role: users.role })
  .from(users)
  .where(eq(users.email, OWNER_EMAIL))
  .limit(1);

if (!owner || owner.role !== "admin") {
  throw new Error("The configured marketing-pilot owner is not an administrator");
}

const result = await seedTwoWeekThreadsPilot(owner.id);
console.log(JSON.stringify({ ownerUserId: owner.id, ...result }));
