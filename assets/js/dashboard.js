import {
  getChecklists, getLinkUsage, getNetflowStatus, getReportDraft, getSettings, getWorkLinks
} from './storage.js';
import { formatThaiDate, formatDateTimeThai, todayIso } from './utils.js';
import { createWorkLinkAction, togglePin } from './links.js';

function temperatureStatus(value, settings) {
  const number = Number(value);
  if (value === '' || !Number.isFinite(number)) return { label: 'ยังไม่กรอก', className: 'status-neutral', level: 'empty' };
  if (number >= settings.criticalThreshold) return { label: 'Critical', className: 'status-critical', level: 'critical' };
  if (number >= settings.warningThreshold) return { label: 'Warning', className: 'status-warning', level: 'warning' };
  return { label: 'ปกติ', className: 'status-normal', level: 'normal' };
}

export function initDashboard() {
  updateDashboard();
  window.addEventListener('nightNoc:data-changed', updateDashboard);
  window.addEventListener('nightNoc:settings-changed', updateDashboard);
  window.addEventListener('nightNoc:route-changed', event => {
    if (event.detail.route === 'dashboard') updateDashboard();
  });
}

export function updateDashboard() {
  const checklistData = getChecklists();
  const report = getReportDraft();
  const settings = getSettings();
  const items = checklistData.sections.flatMap(section => section.items);
  const total = items.length;
  const done = items.filter(item => item.done).length;
  const pending = Math.max(0, total - done);
  const progress = total ? Math.round((done / total) * 100) : 0;
  const statuses = report.temperatures.map(device => temperatureStatus(device.value, settings));
  const warningCount = statuses.filter(status => status.level === 'warning').length;
  const criticalCount = statuses.filter(status => status.level === 'critical').length;
  const attackWarning = report.attackResult === 'followup' || report.attackResult === 'other' ? 1 : 0;
  const netflowState = getNetflowStatus();
  const netflowChecked = Object.values(netflowState.items).filter(item => item.checked).length;

  document.getElementById('dashboard-date-label').textContent = `วันที่ ${formatThaiDate(todayIso())}`;
  document.getElementById('dashboard-operator').textContent = settings.activeOperator || 'ยังไม่เลือกผู้ปฏิบัติงาน';
  document.getElementById('metric-checklist-total').textContent = String(total);
  document.getElementById('metric-checklist-done').textContent = String(done);
  document.getElementById('metric-checklist-pending').textContent = String(pending);
  document.getElementById('metric-warning-total').textContent = String(warningCount + attackWarning);
  document.getElementById('metric-critical-total').textContent = String(criticalCount);
  document.getElementById('metric-smoc-total').textContent = String(Math.max(0, Number(report.attackCount) || 0));
  document.getElementById('dashboard-progress-text').textContent = `${progress}%`;
  const progressBar = document.getElementById('dashboard-progress-bar');
  progressBar.setAttribute('aria-valuenow', String(progress));
  document.getElementById('dashboard-progress-fill').style.width = `${progress}%`;
  document.getElementById('dashboard-shift-window').textContent = `ช่วงเวลา ${report.timeWindow || '06.00 - 20.30 น.'}`;

  const tempSummary = document.getElementById('dashboard-temp-summary');
  tempSummary.replaceChildren();
  report.temperatures.forEach((device, index) => {
    const row = document.createElement('div');
    row.className = 'summary-row';
    const identity = document.createElement('span');
    identity.textContent = `${device.name} (${device.ip})`;
    const status = statuses[index];
    const badge = document.createElement('span');
    badge.className = `status-badge ${status.className}`;
    badge.textContent = device.value === '' ? status.label : `${device.value}°C · ${status.label}`;
    row.append(identity, badge);
    tempSummary.append(row);
  });

  const attackLabels = {
    normal: 'ไม่พบเหตุการณ์ผิดปกติ',
    blocked: 'ถูก Block โดย Arbor',
    followup: 'ต้องติดตาม',
    other: report.attackOther || 'อื่น ๆ'
  };
  const attackBadge = document.getElementById('dashboard-attack-status');
  attackBadge.textContent = attackLabels[report.attackResult] || 'ยังไม่ระบุผล';
  attackBadge.className = `status-badge ${report.attackResult === 'normal' ? 'status-normal' : report.attackResult === 'blocked' ? 'status-info' : 'status-warning'}`;
  document.getElementById('dashboard-attack-count').textContent = `${Number(report.attackCount) || 0} เหตุการณ์`;
  document.getElementById('dashboard-attack-note').textContent = report.note || 'กรอกข้อมูลในหน้ารายงานและส่งมอบ';
  document.getElementById('dashboard-netflow-status').textContent = `ตรวจแล้ว ${netflowChecked}/14 จุด`;

  document.getElementById('dashboard-handover-status').textContent = report.status === 'completed' ? 'ทำเครื่องหมายเสร็จแล้ว' : 'ยังไม่ทำเครื่องหมายเสร็จ';
  document.getElementById('dashboard-handover-people').textContent = `ผู้ส่งมอบ: ${report.sender || '-'} / ผู้รับมอบ: ${report.receiver || '-'}`;
  renderQuickLinks();
}

function renderQuickLinks() {
  const links = getWorkLinks().items;
  const usage = getLinkUsage().items;
  const favorites = links
    .filter(link => link.favorite || usage[link.id]?.pinned)
    .sort((a, b) => Number(Boolean(usage[b.id]?.pinned)) - Number(Boolean(usage[a.id]?.pinned)) || a.name.localeCompare(b.name, 'th'))
    .slice(0, 8);
  const recent = links
    .filter(link => usage[link.id]?.lastOpenedAt)
    .sort((a, b) => String(usage[b.id].lastOpenedAt).localeCompare(String(usage[a.id].lastOpenedAt)))
    .slice(0, 5);
  renderQuickList(document.getElementById('dashboard-favorite-links'), favorites, usage, 'ยังไม่มี Favorite');
  renderQuickList(document.getElementById('dashboard-recent-links'), recent, usage, 'ยังไม่มีลิงก์ที่เปิดล่าสุด');
}

function renderQuickList(node, links, usage, emptyText) {
  node.replaceChildren();
  if (!links.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state compact-empty';
    empty.textContent = emptyText;
    node.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  links.forEach(link => {
    const row = document.createElement('article');
    row.className = 'quick-link-row';
    const main = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = link.name;
    const meta = document.createElement('span');
    const info = usage[link.id] || {};
    meta.textContent = info.lastOpenedAt ? `ล่าสุด ${formatDateTimeThai(info.lastOpenedAt)} · ${Number(info.openCount) || 0} ครั้ง` : 'ยังไม่เคยเปิด';
    main.append(title, meta);
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    actions.append(createWorkLinkAction(link));
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'button button-ghost button-small';
    pin.textContent = info.pinned ? 'Unpin' : 'Pin';
    pin.setAttribute('aria-pressed', String(Boolean(info.pinned)));
    pin.addEventListener('click', () => togglePin(link.id));
    actions.append(pin);
    row.append(main, actions);
    fragment.append(row);
  });
  node.append(fragment);
}
