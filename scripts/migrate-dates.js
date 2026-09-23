const mongoose = require('mongoose');
const ND = require('nepali-date-converter').default || require('nepali-date-converter');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const entries = await mongoose.connection.db.collection('milkentries').find().toArray();
  console.log(`Found ${entries.length} entries to check`);

  for (const e of entries) {
    if (e.date && (e.date.startsWith('202') || e.date.startsWith('201') || e.date.startsWith('200'))) {
      try {
        const bs = new ND(new Date(e.date + 'T00:00:00')).format('YYYY-MM-DD');
        console.log(`Migrating entry ${e._id}: ${e.date} -> ${bs}`);
        await mongoose.connection.db.collection('milkentries').updateOne(
          { _id: e._id },
          { $set: { date: bs } }
        );
      } catch (err) {
        console.error(`Failed to convert ${e.date}:`, err.message);
      }
    }
  }

  console.log('Migration complete!');
  await mongoose.disconnect();
}

migrate().catch(console.error);
