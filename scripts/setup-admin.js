#!/usr/bin/env node
/**
 * scripts/setup-admin.js
 *
 * One-time setup script to seed or reset the admin credentials.
 * Usage:
 *   node scripts/setup-admin.js
 *   node scripts/setup-admin.js "mongodb+srv://..."
 *
 * The script will create or update the AdminSettings document with:
 *   username: admin
 *   password: 1234 (bcrypt hashed, cost factor 12)
 *
 * Run this whenever you need to reset the admin password.
 */

'use strict';

const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

// Allow passing the URI as a CLI arg, fall back to env var
const MONGODB_URI =
  process.argv[2] || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error(
    '[setup-admin] ERROR: No MongoDB URI provided.\n' +
    'Usage: node scripts/setup-admin.js "<mongodb-uri>"\n' +
    'Or set the MONGODB_URI environment variable.'
  );
  process.exit(1);
}

const AdminSettingsSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

async function main() {
  console.log('[setup-admin] Connecting to MongoDB...');

  await mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
  });

  console.log('[setup-admin] Connected.');

  const AdminSettings =
    mongoose.models.AdminSettings ||
    mongoose.model('AdminSettings', AdminSettingsSchema);

  const DEFAULT_USERNAME = 'admin';
  const DEFAULT_PASSWORD = '1234';
  const SALT_ROUNDS = 12;

  console.log(`[setup-admin] Hashing password (cost=${SALT_ROUNDS})...`);
  const passwordHash = await bcryptjs.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  const existing = await AdminSettings.findOne();

  if (existing) {
    existing.username = DEFAULT_USERNAME;
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(
      `[setup-admin] ✅ Admin credentials updated successfully.\n` +
      `  Username : ${DEFAULT_USERNAME}\n` +
      `  Password : ${DEFAULT_PASSWORD}`
    );
  } else {
    await AdminSettings.create({
      username: DEFAULT_USERNAME,
      passwordHash,
    });
    console.log(
      `[setup-admin] ✅ Admin credentials seeded successfully.\n` +
      `  Username : ${DEFAULT_USERNAME}\n` +
      `  Password : ${DEFAULT_PASSWORD}`
    );
  }

  await mongoose.disconnect();
  console.log('[setup-admin] Disconnected. Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[setup-admin] Fatal error:', err);
  process.exit(1);
});
