import { getLinkUsage, getNetflowStatus, getSettings, getWorkLinks } from './storage.js';
import { formatThaiDate, formatDateTimeThai, todayIso } from './utils.js';
import { createWorkLinkAction, togglePin } from './links.js';

const DEFAULT_CHECKLIST_IDS = ['temp-1','temp-2','temp-3','smoc-email','line-noc','uih-report','line-network','netflow','service','ipam-add','ticket-title','ip-edit','mac-edit','record-result','problem-summary','handover-next'];

function readJson(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
  catch { return fallback; }
}

function checklistSummary() {
  const custom = readJson('nightShiftV7:checklistCustom', []);
  const state = readJson('nightShiftV3:checklist', {});
  const ids = [...DEFAULT_CHECKLIST_IDS, ...custom.map(item => item.id).filter(Boolean)];
  const total = ids.length;
  const done = ids.filter(id => state[id]?.done).length;
  return { total, done, pending: Math.max(0, total - done), progress: total ? Math.round((done / total) * 100) : 0 };
}

export function initDashboard() {
  updateDashboard();
  window.addEventListener('nightNoc:data-changed', updateDashboard);
  window.addEventListener('nightNoc:route-changed', event => { if (event.detail.route === 'dashboard') updateDashboard(); });
}

export function updateDashboard() {
  const { total, done, pending, progress } = checklistSummary();
  const settings = getSettings();
  const netflowState = getNetflowStatus();
  const netflowChecked = Object.values(netflowState.items).filter(item => item.checked).length;
  document.getElementById('dashboard-date-label').textContent = `วันที่ ${formatThaiDate(todayIso())}`;
  document.getElementById('dashboard-operator').textContent = settings.activeOperator || 'ยังไม่เลือกผู้ปฏิบัติงาน';
  document.getElementById('metric-checklist-total').textContent = String(total);
  document.getElementById('metric-checklist-done').textContent = String(done);
  document.getElementById('metric-checklist-pending').textContent = String(pending);
  document.getElementById('dashboard-progress-text').textContent = `${progress}%`;
  const progressBar = document.getElementById('dashboard-progress-bar');
  progressBar.setAttribute('aria-valuenow', String(progress));
  document.getElementById('dashboard-progress-fill').style.width = `${progress}%`;
  document.getElementById('dashboard-shift-window').textContent = 'ติดตามความคืบหน้าจากเช็กลิสต์กะดึก';
  document.getElementById('dashboard-netflow-status').textContent = `ตรวจแล้ว ${netflowChecked}/14 จุด`;
  renderQuickLinks();
}

function renderQuickLinks() {
  const links = getWorkLinks().items;
  const usage = getLinkUsage().items;
  const favorites = links.filter(link => link.favorite || usage[link.id]?.pinned).sort((a,b)=>Number(Boolean(usage[b.id]?.pinned))-Number(Boolean(usage[a.id]?.pinned))||a.name.localeCompare(b.name,'th')).slice(0,8);
  const recent = links.filter(link => usage[link.id]?.lastOpenedAt).sort((a,b)=>String(usage[b.id].lastOpenedAt).localeCompare(String(usage[a.id].lastOpenedAt))).slice(0,5);
  renderQuickList(document.getElementById('dashboard-favorite-links'),favorites,usage,'ยังไม่มี Favorite');
  renderQuickList(document.getElementById('dashboard-recent-links'),recent,usage,'ยังไม่มีลิงก์ที่เปิดล่าสุด');
}

function renderQuickList(node, links, usage, emptyText) {
  node.replaceChildren();
  if (!links.length) { const empty=document.createElement('p');empty.className='empty-state compact-empty';empty.textContent=emptyText;node.append(empty);return; }
  const fragment=document.createDocumentFragment();
  links.forEach(link=>{const row=document.createElement('article');row.className='quick-link-row';const main=document.createElement('div');const title=document.createElement('strong');title.textContent=link.name;const meta=document.createElement('span');const info=usage[link.id]||{};meta.textContent=info.lastOpenedAt?`ล่าสุด ${formatDateTimeThai(info.lastOpenedAt)} · ${Number(info.openCount)||0} ครั้ง`:'ยังไม่เคยเปิด';main.append(title,meta);const actions=document.createElement('div');actions.className='item-actions';actions.append(createWorkLinkAction(link));const pin=document.createElement('button');pin.type='button';pin.className='button button-ghost button-small';pin.textContent=info.pinned?'Unpin':'Pin';pin.setAttribute('aria-pressed',String(Boolean(info.pinned)));pin.addEventListener('click',()=>togglePin(link.id));actions.append(pin);row.append(main,actions);fragment.append(row);});
  node.append(fragment);
}
