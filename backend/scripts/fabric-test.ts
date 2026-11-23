/**
 * Check the Fabric settings in backend/.env without restarting the backend.
 *   npm run fabric:test                 -> connect and list tables
 *   npm run fabric:test -- dbo Sales    -> also show columns + 5 rows of dbo.Sales
 */
import { fabricClient } from '../src/integrations/fabric/fabric.client.js';

async function main() {
  const missing = fabricClient.missingSettings();
  if (missing.length) {
    console.error(`Fill these in backend/.env first: ${missing.join(', ')}`);
    process.exit(1);
  }

  const health = await fabricClient.checkHealth();
  if (health.status !== 'connected') {
    console.error(`Could not connect: ${health.message}`);
    process.exit(1);
  }
  console.log('Connected to Fabric.\n');

  const tables = await fabricClient.listTables();
  console.log(`${tables.length} tables/views:`);
  for (const t of tables) console.log(`  ${t.schema}.${t.name}  (${t.type})`);

  const [schema, table] = process.argv.slice(2);
  if (schema && table) {
    console.log(`\nColumns of ${schema}.${table}:`);
    console.table(await fabricClient.listColumns(schema, table));
    console.log(`First 5 rows:`);
    console.table(await fabricClient.previewTable(schema, table, 5));
  }

  await fabricClient.close();
}

main().catch(async (err) => {
  console.error(err.message);
  await fabricClient.close();
  process.exit(1);
});
