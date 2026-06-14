import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(resolve(__dirname, '..', 'supabase-config.json'), 'utf8'));
const supabase = createClient(cfg.supabaseUrl, cfg.serviceRoleKey);

// Use raw query via REST API
const tables = [
  'categories', 'users', 'sales', 'customers', 'products', 'settings',
  'productions', 'warehouse_stock', 'consignment_stock', 'stock_mutations',
  'visits', 'visit_details', 'returns', 'restocks', 'shipments', 'shipment_details',
  'invoices', 'invoice_details', 'receivables', 'payments', 'commissions',
  'expenses', 'bank_accounts', 'cash_transactions', 'sales_targets',
  'activity_logs', 'notifications', '_migration_map'
];

async function main() {
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`--- ${table} ---`);
      console.log(`  ERROR: ${error.message}`);
      continue;
    }

    // Try to get at least 1 row to see columns
    const { data: row, error: rowError } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (rowError) {
      console.log(`--- ${table} ---`);
      console.log(`  ERROR: ${rowError.message}`);
      continue;
    }

    console.log(`--- ${table} (${data?.length ?? '?'} rows) ---`);
    if (row && row.length > 0) {
      for (const col of Object.keys(row[0])) {
        const val = row[0][col];
        const type = val === null ? 'null' : typeof val;
        console.log(`  ${col}: ${type}`);
      }
    } else {
      console.log(`  Could not determine columns (no rows)`);
    }
  }
}

main().catch(console.error);
