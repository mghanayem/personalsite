import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";

const hash = await bcrypt.hash("admin", 12);
await db.update(usersTable).set({ username: "Admin", passwordHash: hash });
console.log("✅ Admin credentials reset — username: Admin / password: admin");
process.exit(0);
