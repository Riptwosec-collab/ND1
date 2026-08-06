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
  './assets/js/netflow-scripts.js'
];
for (const marker of required) {
  if (!html.includes(marker)) errors.push(`Built HTML missing: ${marker}`);
}
for (const retired of ['data-route="report"','data-route="history"','data-route="settings"']) {
  if (html.includes(retired)) errors.push(`Retired route remains: ${retired}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('PASS: built landing page, four routes, UIH path and NetFlow script controls are present.');
