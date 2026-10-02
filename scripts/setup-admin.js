#!/usr/bin/env node
/**
 * scripts/setup-admin.js
 *
 * Setup script to seed or reset the admin and upper admin credentials.
 * Usage:
 *   node --env-file=.env.local scripts/setup-admin.js
 *   node scripts/setup-admin.js "<mongodb-uri>"
 *
 * The script will create or update:
 *   1. Upper Admin: bibek / bib@k2005 (role: upper_admin)
 *   2. Admin:       admin / 1234      (role: admin)
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
    'Or set the MONGODB_URI environment variable (or run with --env-file=.env.local).'
  );
  process.exit(1);
}

const AdminSettingsSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['upper_admin', 'admin'], default: 'admin' },
    name: { type: String, trim: true },
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

  const SALT_ROUNDS = 12;

  // 1. Setup Upper Admin (bibek)
  console.log('[setup-admin] Setting up Upper Admin (bibek)...');
  const bibekHash = await bcryptjs.hash('bib@k2005', SALT_ROUNDS);
  const existingBibek = await AdminSettings.findOne({ username: 'bibek' });

  if (existingBibek) {
    existingBibek.passwordHash = bibekHash;
    existingBibek.role = 'upper_admin';
    existingBibek.name = 'Upper Admin (Bibek)';
    await existingBibek.save();
    console.log('  ✅ Upper Admin updated: username "bibek", role "upper_admin"');
  } else {
    await AdminSettings.create({
      username: 'bibek',
      passwordHash: bibekHash,
      role: 'upper_admin',
      name: 'Upper Admin (Bibek)',
    });
    console.log('  ✅ Upper Admin created: username "bibek", role "upper_admin"');
  }

  // 2. Setup Admin (admin)
  console.log('[setup-admin] Setting up Admin (admin)...');
  const existingAdmin = await AdminSettings.findOne({ username: 'admin' });

  if (existingAdmin) {
    existingAdmin.role = 'admin';
    if (!existingAdmin.name) existingAdmin.name = 'Admin';
    await existingAdmin.save();
    console.log('  ✅ Admin updated: username "admin", role "admin" (retained existing password)');
  } else {
    const adminHash = await bcryptjs.hash('1234', SALT_ROUNDS);
    await AdminSettings.create({
      username: 'admin',
      passwordHash: adminHash,
      role: 'admin',
      name: 'Admin',
    });
    console.log('  ✅ Admin created: username "admin", password "1234", role "admin"');
  }

  console.log('\n--- Accounts Summary ---');
  console.log('👑 Upper Admin: bibek / bib@k2005 (role: upper_admin)');
  console.log('🛡️ Admin:       admin / [existing password or 1234] (role: admin)\n');

  await mongoose.disconnect();
  console.log('[setup-admin] Disconnected. Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[setup-admin] Fatal error:', err);
  process.exit(1);
});
