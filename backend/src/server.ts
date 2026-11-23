import app from './app.js';
import { config } from './config/index.js';
import { startMockServices } from './mockServices.js';
import { dbStore } from './data/dbStore.js';
import { persistenceEnabled, restoreSnapshot, SNAPSHOT_PATH, startAutoSave } from './data/storePersistence.js';

const PORT = config.port;

async function start() {
  // Keep promos across restarts: load the saved store, then keep saving changes
  await dbStore.initStore();
  if (persistenceEnabled()) {
    try {
      const restored = restoreSnapshot(dbStore);
      console.log(
        restored === null
          ? `💾 Store snapshot: none yet, starting from seed data (${SNAPSHOT_PATH})`
          : `💾 Store snapshot: restored ${restored} promo list(s) from ${SNAPSHOT_PATH}`
      );
    } catch (err) {
      console.error(`💾 Store snapshot could not be read, starting from seed data: ${(err as Error).message}`);
    }
    startAutoSave(dbStore);
  }

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🌲 SPAR PROMO APPROVAL SYSTEM - BACKEND API`);
    console.log(`=======================================================`);
    console.log(`🚀 Server running on: http://localhost:${PORT}`);
    console.log(`📡 Health Check:      http://localhost:${PORT}/api/health`);
    console.log(`🔒 Environment:       ${config.nodeEnv}`);
    console.log(`=======================================================`);

    // Mock Product Master (8001) & Sales (8000) APIs are opt-in only. When they ran by
    // default they shadowed the real APIs on the same ports and staff saw invented data.
    if (process.env.USE_MOCK_EXTERNAL_APIS === 'true') {
      console.log('⚠️  USE_MOCK_EXTERNAL_APIS=true - serving MOCK product & sales data');
      startMockServices();
    } else {
      console.log(`📦 Product Master API: ${config.productMaster.url}`);
      console.log(`💳 Sales API:          ${config.sales.url}`);
    }
  });
}

start();
