import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "./db";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function updateAllPasswords() {
  const newPassword = "#Witrey001!@";
  const hashedPassword = await hashPassword(newPassword);
  
  console.log("🔐 Generated password hash:", hashedPassword.substring(0, 20) + "...");
  
  // Get all users  
  const result = await db.execute({ sql: `SELECT id, email FROM users`, args: [] });
  
  console.log(`📊 Found ${result.rows.length} users to update`);
  
  // Update each user's password
  for (const user of result.rows) {
    await db.execute({
      sql: `UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [hashedPassword, user.id]
    });
    console.log(`✅ Updated password for: ${user.email}`);
  }
  
  console.log("🎉 All passwords updated successfully!");
  process.exit(0);
}

updateAllPasswords().catch(console.error);