import app from './app.js';
import { config } from './config/index.js';
import { startMockServices } from './mockServices.js';

const PORT = config.port;

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

