import { readFile } from 'node:fs/promises';

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

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('PASS: 14 unique NetFlow URLs and Chrome/Edge PowerShell copy scripts are valid.');
