import { readFile } from 'node:fs/promises';
import { getShiftCountdownState } from '../assets/js/dashboard.js';

const script = await readFile(new URL('../assets/js/netflow-scripts.js', import.meta.url), 'utf8');
const urls = script.match(/https:\/\/nocorion\.rd\.go\.th\/Orion\/TrafficAnalysis\/NetflowNodeDetails\.aspx\?NetObject=NN:\d+/g) || [];
const unique = new Set(urls);
const requiredNodes = ['3677','3723','7163','3843','3841','2597','3853','3854','3855','3856','3861','3863','3865','3866'];
const errors = [];

if (urls.length !== 14) errors.push(`Expected 14 NetFlow URLs, found ${urls.length}`);
if (unique.size !== 14) errors.push('NetFlow URLs contain duplicates');
for (const node of requiredNodes) {
  if (!urls.some(url => url.endsWith(`NN:${node}`))) errors.push(`Missing NetFlow node ${node}`);
}
if (!script.includes('$chromePaths = @(') || !script.includes('chrome.exe')) errors.push('Chrome PowerShell script is incomplete');
if (!script.includes('$edgePaths = @(') || !script.includes('msedge.exe')) errors.push('Edge PowerShell script is incomplete');
if (!script.includes('copyNetflowChromeScript') || !script.includes('copyNetflowEdgeScript')) errors.push('Copy button bindings are incomplete');

const earlyMorning = getShiftCountdownState(new Date('2026-08-06T07:30:00'));
if (!earlyMorning.active || earlyMorning.hours !== 1 || earlyMorning.minutes !== 0) errors.push('07:30 must have 1 hour remaining in the active shift');

const daytime = getShiftCountdownState(new Date('2026-08-06T14:30:00'));
if (daytime.active || daytime.hours !== 6 || daytime.minutes !== 0) errors.push('14:30 must count 6 hours to the next 20:30 shift');

const night = getShiftCountdownState(new Date('2026-08-06T21:00:00'));
if (!night.active || night.hours !== 11 || night.minutes !== 30) errors.push('21:00 must have 11 hours 30 minutes remaining to 08:30');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('PASS: NetFlow scripts and the 20:30–08:30 shift countdown schedule are valid.');
