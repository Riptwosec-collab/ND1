import { getHistory, saveHistory, saveReportDraft } from './storage.js';
import { buildButton, copyText, csvEscape, downloadTextFile, emitDataChanged, formatThaiDate } from './utils.js';
import { openModal } from './modal.js';
import { showToast } from './toast.js';

let listNode;

export function initHistory() {
  listNode = document.getElementById('history-list');
  document.getElementById('history-search').addEventListener('input', renderHistory);
  document.getElementById('history-date-filter').addEventListener('change', renderHistory);
  document.getElementById('history-status-filter').addEventListener('change', renderHistory);
  document.getElementById('export-history-json').addEventListener('click', exportJson);
  document.getElementById('export-history-csv').addEventListener('click', exportCsv);
  document.getElementById('import-history-trigger').addEventListener('click', () => document.getElementById('import-history-file').click());
  document.getElementById('import-history-file').addEventListener('change', importJson);
  renderHistory();
  window.addEventListener('nightNoc:data-changed', renderHistory);
  window.addEventListener('nightNoc:route-changed', event => {
    if (event.detail.route === 'history') renderHistory();
  });
}

export function renderHistory() {
  if (!listNode) return;
  const history = getHistory();
  const search = document.getElementById('history-search').value.trim().toLocaleLowerCase('th-TH');
  const date = document.getElementById('history-date-filter').value;
  const status = document.getElementById('history-status-filter').value;
  const items = history.items.filter(item => {
    const haystack = `${item.sender} ${item.receiver} ${item.note} ${item.handoverMessage}`.toLocaleLowerCase('th-TH');
    return (!search || haystack.includes(search))
      && (!date || item.startDate === date || item.endDate === date)
      && (status === 'all' || item.status === status);
  });

  listNode.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = history.items.length ? 'ไม่พบประวัติที่ตรงกับตัวกรอง' : 'ยังไม่มีประวัติรายงาน';
    listNode.append(empty);
    return;
  }
  items.forEach(item => listNode.append(buildHistoryCard(item)));
}

function buildHistoryCard(item) {
  const card = document.createElement('article');
  card.className = 'history-card';
  const main = document.createElement('div');
  main.className = 'history-card-main';
  const header = document.createElement('div');
  header.className = 'history-card-header';
  const title = document.createElement('strong');
  title.textContent = item.startDate === item.endDate
    ? formatThaiDate(item.startDate)
    : `${formatThaiDate(item.startDate)} - ${formatThaiDate(item.endDate)}`;
  const badge = document.createElement('span');
  badge.className = `status-badge ${item.status === 'completed' ? 'status-normal' : 'status-neutral'}`;
  badge.textContent = item.status === 'completed' ? 'เสร็จแล้ว' : 'Draft';
  header.append(title, badge);

  const meta = document.createElement('div');
  meta.className = 'history-meta';
  meta.append(
    buildMeta('ช่วงเวลา', item.timeWindow || '-'),
    buildMeta('ผู้ส่งมอบ', item.sender || '-'),
    buildMeta('ผู้รับมอบ', item.receiver || '-'),
    buildMeta('เหตุการณ์', `${Number(item.attackCount) || 0} รายการ`)
  );
  const temperature = document.createElement('p');
  temperature.className = 'muted';
  temperature.textContent = `อุณหภูมิ: ${item.temperatures.map(device => `${device.ip} ${device.value === '' ? '-' : `${device.value}°C`}`).join(' · ')}`;
  main.append(header, meta, temperature);

  const actions = document.createElement('div');
  actions.className = 'history-actions';
  const detail = buildButton('ดูรายละเอียด', 'button button-secondary button-small');
  const copy = buildButton('คัดลอก', 'button button-secondary button-small');
  const edit = buildButton('แก้ไข', 'button button-ghost button-small');
  const remove = buildButton('ลบ', 'button button-danger-outline button-small');
  detail.addEventListener('click', event => showDetail(item, event.currentTarget));
  copy.addEventListener('click', () => copyRecord(item));
  edit.addEventListener('click', () => editRecord(item));
  remove.addEventListener('click', () => deleteRecord(item));
  actions.append(detail, copy, edit, remove);
  card.append(main, actions);
  return card;
}

function buildMeta(label, value) {
  const wrap = document.createElement('div');
  const caption = document.createElement('span');
  caption.textContent = label;
  const text = document.createElement('strong');
  text.textContent = value;
  wrap.append(caption, text);
  return wrap;
}

function showDetail(item, opener) {
  const content = document.createElement('div');
  content.className = 'form-grid';
  const period = document.createElement('p');
  period.textContent = `วันที่ ${formatThaiDate(item.startDate)} ถึง ${formatThaiDate(item.endDate)} · ${item.timeWindow}`;
  const people = document.createElement('p');
  people.textContent = `ผู้ส่งมอบ: ${item.sender || '-'} · ผู้รับมอบ: ${item.receiver || '-'}`;
  const message = document.createElement('textarea');
  message.readOnly = true;
  message.rows = 16;
  message.value = item.handoverMessage || '';
  message.setAttribute('aria-label', 'ข้อความส่งมอบจากประวัติ');
  const copy = buildButton('คัดลอกข้อความ', 'button button-primary');
  copy.addEventListener('click', () => copyRecord(item));
  content.append(period, people, message, copy);
  openModal({ title: 'รายละเอียดรายงาน', eyebrow: 'REPORT HISTORY', content, opener });
}

async function copyRecord(item) {
  try {
    await copyText(item.handoverMessage || '');
    showToast('คัดลอกข้อความจากประวัติแล้ว');
  } catch {
    showToast('ไม่สามารถคัดลอกข้อความได้', 'error');
  }
}

function editRecord(item) {
  const editable = JSON.parse(JSON.stringify(item));
  editable.historyId = item.id;
  editable.status = 'draft';
  editable.completedAt = null;
  delete editable.id;
  saveReportDraft(editable);
  emitDataChanged({ source: 'history-edit' });
  window.dispatchEvent(new CustomEvent('nightNoc:report-load-requested'));
  location.hash = 'report';
  showToast('โหลดข้อมูลเข้าสู่หน้ารายงานแล้ว');
}

function deleteRecord(item) {
  if (!window.confirm(`ลบประวัติวันที่ ${formatThaiDate(item.startDate)} หรือไม่?`)) return;
  const history = getHistory();
  history.items = history.items.filter(value => value.id !== item.id);
  saveHistory(history);
  renderHistory();
  emitDataChanged({ source: 'history' });
  showToast('ลบประวัติแล้ว');
}

function exportJson() {
  const history = getHistory();
  const text = JSON.stringify(history, null, 2);
  downloadTextFile(`night-noc-history-${new Date().toISOString().slice(0, 10)}.json`, text, 'application/json;charset=utf-8');
  showToast('สร้างไฟล์ JSON แล้ว');
}

function exportCsv() {
  const history = getHistory();
  const headers = ['วันที่เริ่ม', 'วันที่สิ้นสุด', 'ช่วงเวลา', 'ผู้ส่งมอบ', 'ผู้รับมอบ', 'จำนวนเหตุการณ์', 'สถานะ', 'อุณหภูมิ', 'หมายเหตุ'];
  const rows = history.items.map(item => [
    formatThaiDate(item.startDate), formatThaiDate(item.endDate), item.timeWindow, item.sender, item.receiver,
    item.attackCount, item.status, item.temperatures.map(device => `${device.ip}:${device.value}`).join(' | '), item.note
  ]);
  const csv = `\uFEFF${[headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\r\n')}`;
  downloadTextFile(`night-noc-history-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
  showToast('สร้างไฟล์ CSV แล้ว');
}

async function importJson(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : parsed.items;
    if (!Array.isArray(items) || !items.every(validateRecord)) throw new Error('Schema ไม่ถูกต้อง');
    const history = getHistory();
    items.forEach(item => {
      const existingIndex = history.items.findIndex(value => value.id === item.id);
      if (existingIndex >= 0) history.items[existingIndex] = item;
      else history.items.push(item);
    });
    history.items.sort((a, b) => String(b.updatedAt || b.completedAt || '').localeCompare(String(a.updatedAt || a.completedAt || '')));
    saveHistory(history);
    renderHistory();
    emitDataChanged({ source: 'history-import' });
    showToast(`Import สำเร็จ ${items.length} รายการ`);
  } catch (error) {
    showToast(`Import ไม่สำเร็จ: ${error.message}`, 'error');
  }
}

function validateRecord(item) {
  return item && typeof item === 'object'
    && typeof item.id === 'string'
    && typeof item.startDate === 'string'
    && typeof item.endDate === 'string'
    && typeof item.timeWindow === 'string'
    && typeof item.status === 'string'
    && Array.isArray(item.temperatures)
    && item.temperatures.every(device => device && typeof device.ip === 'string' && typeof device.command === 'string');
}
