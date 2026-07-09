/**
 * Full database backup to Extended-JSON files (no mongodump required).
 *
 * Dumps every collection in the connected database to
 *   server/backups/<timestamp>/<collection>.json
 * using canonical Extended JSON so ObjectIds/Dates are preserved and restorable.
 *
 * Usage: node scripts/backupDatabase.js
 */ 
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { EJSON } from 'bson';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set in server/.env');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`Connected to DB: ${db.databaseName}`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(__dirname, '..', 'backups', `${db.databaseName}-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`Backup folder: ${outDir}\n`);

  const collections = await db.listCollections().toArray();
  const manifest = {};
  for (const { name } of collections) {
    const docs = await db.collection(name).find({}).toArray();
    const file = path.join(outDir, `${name}.json`);
    fs.writeFileSync(file, EJSON.stringify(docs, null, 2, { relaxed: false }));
    manifest[name] = docs.length;
    console.log(`  ${name.padEnd(24)} ${String(docs.length).padStart(6)} docs`);
  }

  fs.writeFileSync(
    path.join(outDir, '_manifest.json'),
    JSON.stringify({ database: db.databaseName, createdAt: stamp, counts: manifest }, null, 2)
  );

  await mongoose.disconnect();
  console.log(`\nBackup complete: ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
