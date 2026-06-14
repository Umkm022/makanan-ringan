import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(resolve(__dirname, '..', 'supabase-config.json'), 'utf8'));
const supabase = createClient(cfg.supabaseUrl, cfg.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const EXPORT_PATH = resolve(__dirname, 'supabase-export-2026-06-13.json');
const MAPPING_PATH = resolve(__dirname, 'id-mapping.json');

async function main() {
  const data = JSON.parse(readFileSync(EXPORT_PATH, 'utf8'));
  const mapping = JSON.parse(readFileSync(MAPPING_PATH, 'utf8'));

  const users = data['01_USERS'] || [];
  console.log(`Found ${users.length} users to create in Auth.\n`);

  for (const user of users) {
    const newId = mapping[user.user_id]?.new_id;
    if (!newId) {
      console.error(`  ✗ ${user.user_id}: no UUID mapping found, skipping`);
      continue;
    }

    // Check if user already has auth_id set
    const { data: existing } = await supabase
      .from('users')
      .select('auth_id')
      .eq('id', newId)
      .single();

    if (existing?.auth_id) {
      console.log(`  ∼ ${user.username}: already has auth_id, skipping`);
      continue;
    }

    // Create user in Supabase Auth
    const { data: authUser, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'seblak123',   // temporary password — force reset on first login
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        username: user.username,
        role: user.role,
      },
    });

    if (error) {
      console.error(`  ✗ ${user.username} (${user.email}): ${error.message}`);
      continue;
    }

    // Link auth_id to users table
    const { error: updateErr } = await supabase
      .from('users')
      .update({ auth_id: authUser.user.id })
      .eq('id', newId);

    if (updateErr) {
      console.error(`  ✗ ${user.username}: failed to update auth_id: ${updateErr.message}`);
    } else {
      console.log(`  ✓ ${user.username} (${user.email}) — auth_id linked`);
    }
  }

  // Summary
  console.log('\n--- Users in Auth ---');
  const { data: authList, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Failed to list auth users:', listErr.message);
  } else {
    for (const u of authList.users) {
      console.log(`  ${u.email} (${u.user_metadata?.role || 'N/A'}) — ${u.confirmed_at ? 'confirmed' : 'pending'}`);
    }
  }

  console.log('\nDone! Temporary password for all users: seblak123');
  console.log('Tell users to change password on first login.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
