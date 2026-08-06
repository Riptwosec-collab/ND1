import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const required = [
  'index.html','404.html','.nojekyll','assets/css/variables.css','assets/css/base.css','assets/css/layout.css',
  'assets/css/components.css','assets/css/pages.css','assets/css/responsive.css','assets/css/work-links-v7.css',
  'assets/js/navigation.js','assets/js/app.js','assets/js/router.js','assets/js/storage.js','assets/js/utils.js',
  'assets/js/modal.js','assets/js/toast.js','assets/js/dashboard.js','assets/js/checklist.js','assets/js/links.js',
  'assets/js/work-links-v7.js','.github/workflows/deploy-pages.yml','package.json','README.md','QA_REPORT.md','DELIVERY.md'
];
const retired = ['assets/js/report.js', 'assets/js/history.js', 'assets/js/settings.js'];
const errors = [];
for (const file of required) { try { await stat(new URL(file, root)); } catch { errors.push(`Missing: ${file}`); } }
for (const file of retired) { try { await stat(new URL(file, root)); errors.push(`Retired system file still exists: ${file}`); } catch { /* expected */ } }

async function walk(dir) {
  const output = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await walk(full)); else output.push(full);
  }
  return output;
}
const files = await walk(rootPath);
for (const file of files) {
  const rel = relative(rootPath, file);
  const extension = extname(file).toLowerCase();
  if (['.cmd','.bat','.ps1','.exe','.msi'].includes(extension)) errors.push(`Forbidden executable/script file: ${rel}`);
  if (!['.js','.mjs','.html'].includes(extension)) continue;
  const text = await readFile(file, 'utf8');
  const evalPattern = new RegExp('\\b' + 'e' + 'val' + '\\s*\\(');
  const functionPattern = new RegExp('new' + '\\s+' + 'Fun' + 'ction' + '\\s*\\(');
  if (evalPattern.test(text)) errors.push(`Forbidden dynamic evaluation found: ${rel}`);
  if (functionPattern.test(text)) errors.push(`Forbidden function constructor found: ${rel}`);
  if (/\.innerHTML\s*=/.test(text)) errors.push(`innerHTML assignment found: ${rel}`);
  if (/src=["']\/assets\//.test(text) || /href=["']\/assets\//.test(text)) errors.push(`Absolute asset path found: ${rel}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`PASS: checked ${files.length} files. Retired Report, History and Settings modules are absent.`);
