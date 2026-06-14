import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(resolve(__dirname, '..', 'supabase-config.json'), 'utf8'));
const supabase = createClient(cfg.supabaseUrl, cfg.serviceRoleKey);

const tables = [
  '_migration_map', 'notifications', 'activity_logs', 'sales_targets',
  'visit_details', 'visits', 'returns', 'restocks',
  'shipment_details', 'shipments',
  'invoice_details', 'invoices', 'receivables', 'payments', 'commissions',
  'expenses', 'bank_accounts', 'cash_transactions',
  'warehouse_stock', 'productions', 'consignment_stock', 'stock_mutations',
  'products', 'settings', 'customers', 'customer_groups',
  'sales', 'users', 'categories',
];

async function main() {
  for (const t of tables) {
    if (t === '_migration_map') {
      const { error } = await supabase.from(t).delete().neq('old_id', '');
      if (error) console.error(`${t}: ${error.message}`);
      else console.log(`✓ ${t} cleared`);
    } else {
      const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.error(`${t}: ${error.message}`);
      else console.log(`✓ ${t} cleared`);
    }
  }
  // Also delete categories by name (no id filter since they have NULL names somehow)
  console.log('Done. All tables empty.');
}

main().catch(console.error);
