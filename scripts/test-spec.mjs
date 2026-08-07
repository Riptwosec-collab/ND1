import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['./scripts/build-static.mjs'], {
  cwd: new URL('../', import.meta.url),
  encoding: 'utf8'
});
if (result.status !== 0) {
  console.error(result.stdout || '');
  console.error(result.stderr || 'Build failed');
  process.exit(result.status || 1);
}

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../dist/assets/js/dashboard.js', import.meta.url), 'utf8');
const sceneCss = await readFile(new URL('../dist/assets/css/night-helpdesk-scene.css', import.meta.url), 'utf8');
const sceneSvg = await readFile(new URL('../dist/assets/images/night-shift-helpdesk-bg.svg', import.meta.url), 'utf8');
const referenceCss = await readFile(new URL('../dist/assets/css/home-reference-v17.css', import.meta.url), 'utf8');
const referenceSvg = await readFile(new URL('../dist/assets/images/command-center-master.svg', import.meta.url), 'utf8');
const errors = [];
const required = [
  'class="helpdesk-hero"',
  'href="#checklist"',
  'href="#work-links"',
  'href="#todo"',
  'data-route="checklist"',
  'data-route="work-links"',
  'data-route="todo"',
  'id="copyNetflowChromeScript"',
  'id="copyNetflowEdgeScript"',
  '\\\\10.1.1.94\\share noc\\รายงานประจำวัน',
  './assets/css/night-helpdesk-theme.css',
  './assets/css/home-reference-v17.css?v=20260807-17',
  './assets/js/netflow-scripts.js'
];
for (const marker of required) {
  if (!html.includes(marker)) errors.push(`Built HTML missing: ${marker}`);
}
for (const retired of ['data-route="report"','data-route="history"','data-route="settings"']) {
  if (html.includes(retired)) errors.push(`Retired route remains: ${retired}`);
}
if (!dashboard.includes('night-helpdesk-scene.css')) errors.push('Built dashboard does not load the scene stylesheet');
if (!sceneCss.includes('../images/night-shift-helpdesk-bg.svg')) errors.push('Built scene CSS does not reference the legacy background asset');
if (!sceneSvg.includes('connected world map') || !sceneSvg.includes('monitoring consoles')) errors.push('Built command-center SVG is incomplete');
if (!referenceCss.includes('command-center-master.svg?v=20260807-17')) errors.push('Master Home CSS does not reference the supplied visual reference');
if (!referenceCss.includes('hero-menu-link') || !referenceCss.includes('hero-command-panel')) errors.push('Master Home overlay styling is incomplete');
if (!referenceSvg.includes('data:image/jpeg;base64,')) errors.push('Master command-center reference image is not embedded');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('PASS: master Home reference, original routes, UIH path and NetFlow controls are present in the built site.');
