import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(resolve(__dirname, '..', 'supabase-config.json'), 'utf8'));
const supabase = createClient(cfg.supabaseUrl, cfg.serviceRoleKey);

// Load migration map to know which IDs belong to this export
const mapData = JSON.parse(readFileSync(resolve(__dirname, 'id-mapping.json'), 'utf8'));
const mappedIds = new Set(Object.values(mapData).map(v => v.new_id));

async function main() {
  // 1. Delete categories NOT in migration map (seed duplicates)
  const { data: cats } = await supabase.from('categories').select('id,name');
  for (const c of cats || []) {
    if (!mappedIds.has(c.id)) {
      await supabase.from('categories').delete().eq('id', c.id);
      console.log(`Deleted category: ${c.name}`);
    }
  }

  // 2. Delete visits NOT in migration map (from 2nd run, no map entries)
  const { data: visits } = await supabase.from('visits').select('id');
  const visitIdsFromMap = Object.entries(mapData).filter(([k]) => k.startsWith('__VISIT_')).map(([k,v]) => v.new_id);
  for (const v of visits || []) {
    if (!visitIdsFromMap.includes(v.id)) {
      await supabase.from('visits').delete().eq('id', v.id);
      console.log(`Deleted visit: ${v.id.slice(0,8)}...`);
    }
  }

  // Verify
  const tables = ['categories', 'users', 'sales', 'customers', 'products', 'settings', 'productions', 'warehouse_stock', 'visits', 'activity_logs', 'sales_targets'];
  let total = 0;
  for (const t of tables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${count}`);
    total += count;
  }
  console.log(`Total: ${total}`);
}

main().catch(console.error);
