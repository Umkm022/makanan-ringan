import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPS_SCRIPT = resolve(__dirname, '..', 'apps-script');
const OUTPUT = resolve(__dirname, 'index.html');

function readFile(path) {
  try { return readFileSync(path, 'utf8'); }
  catch { return `<!-- INCLUDE FAILED: ${path} -->`; }
}

function resolveIncludes(content, baseDir) {
  return content.replace(/<\?!= include\(['"](.+?)['"]\) \?>/g, (_, filePath) => {
    const fullPath = resolve(baseDir, filePath);
    let fc = readFile(fullPath);
    if (fc.includes('<?!=')) fc = resolveIncludes(fc, dirname(fullPath));
    return fc;
  });
}

function build() {
  console.log('Building frontend...');
  let html = readFileSync(resolve(APPS_SCRIPT, 'index.html'), 'utf8');
  console.log(`  Read index.html (${html.length} bytes)`);

  // Resolve includes
  html = resolveIncludes(html, APPS_SCRIPT);

  // Normalize line endings to \n
  html = html.replace(/\r\n/g, '\n');

  // Replace GAS template vars
  html = html.replace(/<\?!= ScriptApp\.getService\(\)\.getUrl\(\) \?>/g, './');
  html = html.replace('<base target="_top">', '<base href="./">');

  // Replace main api() function: google.script.run...handleApi → bridge._routeAction
  html = html.replace(
`  google.script.run.withSuccessHandler(function(r){
    if(called)return;called=true;
    _apiLoadingCount--;if(!_apiLoadingCount&&lb)lb.style.opacity='0';
    if(r)callback(r);else callback({success:false,message:'Server returned null for: '+action,data:null});
  }).withFailureHandler(function(e){
    if(called)return;called=true;
    _apiLoadingCount--;if(!_apiLoadingCount&&lb)lb.style.opacity='0';
    toast('Error: '+e.message);
    callback({success:false,message:e.message,data:null});
  }).handleApi(JSON.stringify(params));`,
`  bridge._routeAction(action,params).then(function(r){
    if(called)return;called=true;
    _apiLoadingCount--;if(!_apiLoadingCount&&lb)lb.style.opacity='0';
    if(r)callback(r);else callback({success:false,message:'Server returned null for: '+action,data:null});
  }).catch(function(e){
    if(called)return;called=true;
    _apiLoadingCount--;if(!_apiLoadingCount&&lb)lb.style.opacity='0';
    toast('Error: '+(e.message||'Unknown'));
    callback({success:false,message:(e&&e.message)||'Unknown',data:null});
  });`
  );

  // Inject Supabase JS SDK + bridge code in head (before any body scripts run)
  const supabaseSdk = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>';
  const bridgeJs = readFileSync(resolve(__dirname, 'supabase-bridge.js'), 'utf8');
  const authJs = readFileSync(resolve(__dirname, 'auth.js'), 'utf8');
  const inlineScript = '<script>\n' + bridgeJs + '\n' + authJs + '\n</script>';

  html = html.replace('</head>', '  ' + supabaseSdk + '\n  ' + inlineScript + '\n</head>');

  writeFileSync(OUTPUT, html, 'utf8');
  console.log(`  Written to ${OUTPUT} (${html.length} bytes)`);
  console.log('Done!');
}

build();
