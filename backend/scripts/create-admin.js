/**
 * Create (or update) an admin user directly in the database.
 *
 * Usage:
 *   cd backend
 *   node scripts/create-admin.js <email> <password> [name]
 *
 * Example:
 *   node scripts/create-admin.js admin@example.com 'MyStrongPassw0rd!' "Anthony"
 *
 * The password is bcrypt-hashed (cost 12, same as the app) before storage.
 * If the email already exists, its password is reset and isAdmin is set true.
 */
const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require(path.join(__dirname, '..', 'node_modules', 'bcrypt'));
const { Client } = require(path.join(__dirname, '..', 'node_modules', 'pg'));

async function main() {
  const [, , email, password, name] = process.argv;

  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.js <email> <password> [name]');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('Password must be at least 12 characters (the app enforces this).');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const result = await client.query(
    `INSERT INTO users (email, name, "passwordHash", "isAdmin", "authProvider")
     VALUES ($1, $2, $3, true, 'email')
     ON CONFLICT (email) DO UPDATE
       SET "passwordHash" = EXCLUDED."passwordHash",
           "isAdmin" = true,
           name = EXCLUDED.name
     RETURNING email, "isAdmin"`,
    [email, name || 'Admin', passwordHash],
  );

  await client.end();

  const row = result.rows[0];
  console.log(`\n✅ Admin ready: ${row.email} (isAdmin=${row.isAdmin})`);
  console.log('   Log in at http://localhost:5173 with this email and password.\n');
}

main().catch((err) => {
  console.error('Failed to create admin:', err.message);
  process.exit(1);
});
