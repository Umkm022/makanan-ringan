import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(resolve(__dirname, 'index.html'), 'utf8');

console.log('bridge.handleApi:', content.includes('bridge.handleApi') ? 'YES' : 'NO');
console.log('bridge._actions:', content.includes('bridge._actions') ? 'YES' : 'NO');
console.log('_supabase.auth:', content.includes('_supabase.auth') ? 'YES' : 'NO');
console.log('async function doLogin:', content.includes('async function doLogin') ? 'YES' : 'NO');
console.log('initAuth:', content.includes('initAuth') ? 'YES' : 'NO');
console.log('Leaflet CDN:', content.includes('unpkg.com/leaflet') ? 'YES' : 'NO');

const loginIdx = content.indexOf('onclick="doLogin');
if (loginIdx > 0) {
  const ctx = content.substring(Math.max(0, loginIdx - 40), loginIdx + 60);
  console.log('Login button context:', ctx);
} else {
  console.log('Login button onclick="doLogin NOT found');
}

const oldApi = content.indexOf('function api(action');
if (oldApi > 0) {
  console.log('WARNING: Old api() still present!');
} else {
  console.log('Old api() removed: YES');
}

const lines = content.split('\n').length;
console.log('Total lines:', lines);
console.log('File size:', content.length, 'bytes');

// Count bridge action handlers
const actions = content.match(/bridge\._actions\['/g);
console.log('Bridge actions defined:', actions ? actions.length : 0);
