import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.PROJECT_ROOT
  ? resolve(process.env.PROJECT_ROOT)
  : fileURLToPath(new URL('../', import.meta.url));
const sourceDir = join(root, 'source');
const outputDir = join(root, 'dist');

const partNames = (await readdir(sourceDir))
  .filter(name => /^index\.part\d+\.html$/.test(name))
  .sort((a, b) => a.localeCompare(b, 'en'));
if (!partNames.length) throw new Error('No direct index source parts found');

const index = (await Promise.all(partNames.map(name => readFile(join(sourceDir, name), 'utf8')))).join('');
if (!index.includes('id="app-shell"') || !index.includes('./assets/js/app.js')) {
  throw new Error('Direct index source is incomplete');
}
if (!index.includes('./assets/js/navigation.js')) {
  throw new Error('Independent navigation script is missing');
}
if (index.includes('archive/part') || index.includes('Failed to fetch') || index.includes('atob(')) {
  throw new Error('Runtime archive loader was found in direct index');
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, 'index.html'), index, 'utf8');
await cp(join(root, 'assets'), join(outputDir, 'assets'), { recursive: true });
await cp(join(root, '404.html'), join(outputDir, '404.html'));
await writeFile(join(outputDir, '.nojekyll'), '', 'utf8');

const requiredAssets = [
  'assets/css/variables.css', 'assets/css/base.css', 'assets/css/layout.css',
  'assets/css/components.css', 'assets/css/pages.css', 'assets/css/responsive.css',
  'assets/js/navigation.js', 'assets/js/app.js', 'assets/js/router.js', 'assets/js/storage.js', 'assets/js/utils.js',
  'assets/js/modal.js', 'assets/js/toast.js', 'assets/js/dashboard.js', 'assets/js/checklist.js',
  'assets/js/links.js', 'assets/js/report.js', 'assets/js/history.js', 'assets/js/settings.js',
  'assets/icons/noc-mark.svg'
];
await Promise.all(requiredAssets.map(path => readFile(join(outputDir, path))));
console.log(`PASS: built direct dashboard in dist/ from ${partNames.length} HTML parts and ${requiredAssets.length} assets.`);
