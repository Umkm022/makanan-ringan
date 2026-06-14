import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(resolve(__dirname, '..', 'supabase-config.json'), 'utf8'));
const supabase = createClient(cfg.supabaseUrl, cfg.serviceRoleKey);

async function main() {
  // sales still has data from previous failed FK delete, clean it now
  const { error: se } = await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (se) console.error(`sales: ${se.message}`);
  else console.log('✓ sales cleared');

  // also clean customer_groups just in case
  const { error: cge } = await supabase.from('customer_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (cge) console.error(`customer_groups: ${cge.message}`);
  else console.log('✓ customer_groups cleared');

  // Verify
  const tables = ['_migration_map','notifications','activity_logs','sales_targets','visit_details','visits','returns','restocks','shipment_details','shipments','invoice_details','invoices','receivables','payments','commissions','expenses','bank_accounts','cash_transactions','warehouse_stock','productions','consignment_stock','stock_mutations','products','settings','customers','customer_groups','sales','users','categories'];
  for (const t of tables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${count}`);
  }
}

main().catch(console.error);
