/**
 * In-memory MongoDB for tests (no local MongoDB needed, works in GitHub Actions).
 *   beforeAll(startDB); afterEach(clearDB); afterAll(stopDB);
 * The first run downloads a MongoDB binary (~100 MB), later runs use the cache.
 */
const mongoose = require('mongoose');
const os = require('os');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

async function startDB() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), {
    runtimeAdapters: { os },
  });
}

async function clearDB() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

async function stopDB() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

module.exports = { startDB, clearDB, stopDB };
