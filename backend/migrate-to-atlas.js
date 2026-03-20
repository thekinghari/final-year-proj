/**
 * Migration script: local MongoDB → Atlas
 * Exports users + projects from localhost and imports into Atlas
 */
require('dotenv').config();
const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://localhost:27017/blue-carbon-registry';
const ATLAS_URI = process.env.MONGO_URI;

const COLLECTIONS = ['users', 'projects'];

async function migrate() {
  console.log('🔄 Connecting to local MongoDB...');
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();

  console.log('🔄 Connecting to Atlas...');
  const atlasConn = await mongoose.createConnection(ATLAS_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();

  for (const name of COLLECTIONS) {
    const localCol = localConn.db.collection(name);
    const atlasCol = atlasConn.db.collection(name);

    const docs = await localCol.find({}).toArray();
    console.log(`\n📦 Collection: ${name} — ${docs.length} documents found locally`);

    if (docs.length === 0) {
      console.log(`   ⏭️  Skipping (empty)`);
      continue;
    }

    // Check existing docs in Atlas to avoid duplicates
    const existingIds = new Set(
      (await atlasCol.find({}, { projection: { _id: 1 } }).toArray()).map(d => d._id.toString())
    );

    const newDocs = docs.filter(d => !existingIds.has(d._id.toString()));
    console.log(`   ✅ ${existingIds.size} already in Atlas, inserting ${newDocs.length} new`);

    if (newDocs.length > 0) {
      await atlasCol.insertMany(newDocs, { ordered: false });
      console.log(`   ✅ Inserted ${newDocs.length} documents into Atlas`);
    }
  }

  await localConn.close();
  await atlasConn.close();
  console.log('\n🎉 Migration complete!');
}

migrate().catch(e => {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
});
