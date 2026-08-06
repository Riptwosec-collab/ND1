import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const required = [
  'index.html','404.html','.nojekyll','assets/css/variables.css','assets/css/base.css','assets/css/layout.css',
  'assets/css/components.css','assets/css/pages.css','assets/css/responsive.css','assets/css/work-links-v7.css',
  'assets/css/task-checklist-v7.css','assets/css/night-helpdesk-theme.css','assets/css/night-helpdesk-scene.css',
  'assets/images/night-shift-helpdesk-bg.svg','assets/js/navigation.js','assets/js/app.js','assets/js/router.js',
  'assets/js/storage.js','assets/js/utils.js','assets/js/modal.js','assets/js/toast.js','assets/js/dashboard.js',
  'assets/js/links.js','assets/js/work-links-v7.js','assets/js/netflow-scripts.js','assets/js/task-checklist-v7.js',
  '.github/workflows/deploy-pages.yml','package.json','README.md','QA_REPORT.md','DELIVERY.md',
  'scripts/build-static.mjs','scripts/serve.mjs','scripts/test-data.mjs','scripts/test-spec.mjs'
];
const retired = ['assets/js/report.js','assets/js/history.js','assets/js/settings.js','assets/js/checklist.js'];
const errors = [];

for (const file of required) {
  try { await stat(new URL(file, root)); }
  catch { errors.push(`Missing: ${file}`); }
}
for (const file of retired) {
  try { await stat(new URL(file, root)); errors.push(`Retired system file still exists: ${file}`); }
  catch { /* expected */ }
}

async function walk(dir) {
  const output = [];
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = join(dir,entry.name);
    if (entry.isDirectory()) output.push(...await walk(full));
    else output.push(full);
  }
  return output;
}

const files = await walk(rootPath);
for (const file of files) {
  const rel = relative(rootPath,file);
  const extension = extname(file).toLowerCase();
  if (['.cmd','.bat','.ps1','.exe','.msi'].includes(extension)) errors.push(`Forbidden executable/script file: ${rel}`);
  if (!['.js','.mjs','.html'].includes(extension)) continue;
  const text = await readFile(file,'utf8');
  const evalPattern = new RegExp('\\b'+'e'+'val'+'\\s*\\(');
  const functionPattern = new RegExp('new'+'\\s+'+'Fun'+'ction'+'\\s*\\(');
  if (evalPattern.test(text)) errors.push(`Forbidden dynamic evaluation found: ${rel}`);
  if (functionPattern.test(text)) errors.push(`Forbidden function constructor found: ${rel}`);
  if (/\.innerHTML\s*=/.test(text)) errors.push(`innerHTML assignment found: ${rel}`);
  if (/src=["']\/assets\//.test(text) || /href=["']\/assets\//.test(text)) errors.push(`Absolute asset path found: ${rel}`);
}

const buildScript = await readFile(new URL('scripts/build-static.mjs',root),'utf8');
const netflowScript = await readFile(new URL('assets/js/netflow-scripts.js',root),'utf8');
const dashboardScript = await readFile(new URL('assets/js/dashboard.js',root),'utf8');
const sceneCss = await readFile(new URL('assets/css/night-helpdesk-scene.css',root),'utf8');
for (const marker of ['data-route="todo"','id="tcTodoList"','id="tcCheckCategories"','task-checklist-v7.js','class="helpdesk-hero"']) {
  if (!buildScript.includes(marker)) errors.push(`Build marker missing: ${marker}`);
}
if (!buildScript.includes('copyNetflowChromeScript') || !buildScript.includes('copyNetflowEdgeScript')) errors.push('NetFlow copy buttons are missing');
if (!buildScript.includes('\\\\10.1.1.94\\share noc\\รายงานประจำวัน')) errors.push('UIH path is missing or incorrect');
if ((netflowScript.match(/NetflowNodeDetails\.aspx\?NetObject=NN:/g) || []).length !== 14) errors.push('NetFlow script must contain exactly 14 URLs');
if (!netflowScript.includes('Google\\Chrome\\Application\\chrome.exe')) errors.push('Chrome PowerShell path is missing');
if (!netflowScript.includes('Microsoft\\Edge\\Application\\msedge.exe')) errors.push('Edge PowerShell path is missing');
if (!dashboardScript.includes('shiftCountdown') || !dashboardScript.includes('20, 30') || !dashboardScript.includes('8, 30')) errors.push('20:30–08:30 countdown logic is missing');
if (!dashboardScript.includes('night-helpdesk-scene.css')) errors.push('Dashboard does not load the reference scene stylesheet');
if (!sceneCss.includes('../images/night-shift-helpdesk-bg.svg')) errors.push('Reference scene background is not connected to the landing page');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`PASS: checked ${files.length} files. Background scene, 20:30–08:30 countdown, routes, UIH path and NetFlow tools are valid.`);
