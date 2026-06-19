import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { sep } from 'path';

const html = readFileSync('frontend/index.html', 'utf8');
const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
console.log('Total script blocks:', scripts ? scripts.length : 0);
if (scripts) {
  const tmpDir = mkdtempSync(tmpdir() + sep + 'check-syntax-');
  let i = 0;
  for (const s of scripts) {
    i++;
    if (s.includes('src=')) {
      const m = s.match(/src="([^"]+)"/);
      console.log('Script #' + i + ': external (' + (m ? m[1] : '?') + ')');
      continue;
    }
    const code = s.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
    const tmpFile = tmpDir + '\\check-script-' + i + '.mjs';
    writeFileSync(tmpFile, code, 'utf8');
    try {
      execSync('node --check "' + tmpFile + '" 2>&1', { stdio: 'pipe', encoding: 'utf8', timeout: 10000 });
      console.log('Script #' + i + ': OK (' + code.split('\n').length + ' lines)');
    } catch(e) {
      console.log('Script #' + i + ': SYNTAX ERROR');
      console.log(e.stderr || e.message);
      // Show context around the error line
      const lineMatch = (e.stderr || e.message).match(/\.mjs:(\d+)/);
      if (lineMatch) {
        const lineNum = parseInt(lineMatch[1]);
        const lines = code.split('\n');
        console.log('\nContext:');
        for (let j = Math.max(0,lineNum-5); j < Math.min(lines.length, lineNum+3); j++) {
          const prefix = j === lineNum-1 ? '>>> ' : '    ';
          console.log(prefix + (j+1) + ': ' + lines[j]);
        }
      }
    }
    try { rmSync(tmpFile); } catch(e) {}
  }
  try { rmSync(tmpDir, { recursive: true }); } catch(e) {}
}
