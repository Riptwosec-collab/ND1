import { getHistory, getReportDraft, getSettings, saveHistory, saveReportDraft } from './storage.js';
import { addDaysIso, buildButton, copyText, createId, emitDataChanged, formatThaiDate, todayIso } from './utils.js';
import { openModal } from './modal.js';
import { showToast } from './toast.js';

const ATTACK_LABELS = {
  normal: 'ไม่พบเหตุการณ์ผิดปกติ',
  blocked: 'พบเหตุการณ์และถูก Block โดย Arbor',
  followup: 'พบเหตุการณ์ต้องติดตาม',
  other: 'อื่น ๆ'
};

let initialized = false;
let temperatureGrid;

export function initReport() {
  temperatureGrid = document.getElementById('temperature-grid');
  bindReportInputs();
  document.getElementById('copy-handover').addEventListener('click', copyHandover);
  document.getElementById('complete-handover').addEventListener('click', completeHandover);
  document.getElementById('open-command-modal').addEventListener('click', event => openCommandModal(event.currentTarget));
  document.getElementById('open-command-modal-top').addEventListener('click', event => openCommandModal(event.currentTarget));
  document.getElementById('copy-file-path').addEventListener('click', copyFilePath);
  document.getElementById('clear-report-draft').addEventListener('click', clearDraft);
  loadReportIntoForm();
  initialized = true;

  window.addEventListener('nightNoc:settings-changed', () => {
    preserveCurrentForm();
    loadPeopleOptions();
    renderTemperatureCards(getReportDraft());
    updateHandoverMessage();
  });
  window.addEventListener('nightNoc:report-load-requested', loadReportIntoForm);
  window.addEventListener('nightNoc:route-changed', event => {
    if (event.detail.route === 'report') loadReportIntoForm();
  });
}

function bindReportInputs() {
  const ids = [
    'report-range-type', 'report-start-date', 'report-end-date', 'report-time-window',
    'attack-result', 'attack-count', 'attack-other', 'report-note', 'report-sender', 'report-receiver'
  ];
  ids.forEach(id => {
    const element = document.getElementById(id);
    element.addEventListener('input', handleFormChange);
    element.addEventListener('change', handleFormChange);
  });
}

function loadPeopleOptions() {
  const settings = getSettings();
  const draft = getReportDraft();
  const controls = [document.getElementById('report-sender'), document.getElementById('report-receiver')];
  controls.forEach((select, index) => {
    const currentValue = index === 0 ? draft.sender : draft.receiver;
    select.replaceChildren();
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = 'เลือกชื่อ';
    select.append(blank);
    settings.people.forEach(person => {
      const option = document.createElement('option');
      option.value = person;
      option.textContent = person;
      select.append(option);
    });
    select.value = currentValue;
  });
}

export function loadReportIntoForm() {
  if (!temperatureGrid && initialized) temperatureGrid = document.getElementById('temperature-grid');
  const draft = getReportDraft();
  loadPeopleOptions();
  document.getElementById('report-range-type').value = draft.rangeType || 'daily';
  document.getElementById('report-start-date').value = draft.startDate || todayIso();
  document.getElementById('report-end-date').value = draft.endDate || draft.startDate || todayIso();
  document.getElementById('report-time-window').value = draft.timeWindow || '06.00 - 20.30 น.';
  document.getElementById('attack-result').value = draft.attackResult || 'normal';
  document.getElementById('attack-count').value = String(Math.max(0, Number(draft.attackCount) || 0));
  document.getElementById('attack-other').value = draft.attackOther || '';
  document.getElementById('report-note').value = draft.note || '';
  document.getElementById('report-sender').value = draft.sender || '';
  document.getElementById('report-receiver').value = draft.receiver || '';
  document.getElementById('attack-other-wrap').hidden = draft.attackResult !== 'other';
  document.getElementById('report-end-date').disabled = draft.rangeType !== 'custom';
  updateDateDisplays(draft);
  renderTemperatureCards(draft);
  updateHandoverMessage();
  updateCompletionBadge(draft);
}

function handleFormChange(event) {
  if (event.target.id === 'report-range-type' || event.target.id === 'report-start-date') {
    applyRangeRules();
  }
  if (event.target.id === 'attack-result') {
    document.getElementById('attack-other-wrap').hidden = event.target.value !== 'other';
  }
  if (event.target.id === 'attack-count' && Number(event.target.value) < 0) event.target.value = '0';
  preserveCurrentForm();
  updateHandoverMessage();
  emitDataChanged({ source: 'report' });
}

function applyRangeRules() {
  const type = document.getElementById('report-range-type').value;
  const start = document.getElementById('report-start-date').value || todayIso();
  const endInput = document.getElementById('report-end-date');
  if (type === 'daily') {
    endInput.value = start;
    endInput.disabled = true;
  } else if (type === 'twoDays') {
    endInput.value = addDaysIso(start, 1);
    endInput.disabled = true;
  } else {
    endInput.disabled = false;
    if (!endInput.value) endInput.value = start;
  }
}

function collectDraftFromForm() {
  const existing = getReportDraft();
  return {
    ...existing,
    rangeType: document.getElementById('report-range-type').value,
    startDate: document.getElementById('report-start-date').value || todayIso(),
    endDate: document.getElementById('report-end-date').value || document.getElementById('report-start-date').value || todayIso(),
    timeWindow: document.getElementById('report-time-window').value.trim() || '06.00 - 20.30 น.',
    attackResult: document.getElementById('attack-result').value,
    attackCount: Math.max(0, Number(document.getElementById('attack-count').value) || 0),
    attackOther: document.getElementById('attack-other').value.trim(),
    note: document.getElementById('report-note').value.trim(),
    sender: document.getElementById('report-sender').value,
    receiver: document.getElementById('report-receiver').value,
    updatedAt: new Date().toISOString()
  };
}

function preserveCurrentForm() {
  const draft = collectDraftFromForm();
  saveReportDraft(draft);
  updateDateDisplays(draft);
}

function updateDateDisplays(draft) {
  document.getElementById('report-start-display').textContent = `แสดงผล: ${formatThaiDate(draft.startDate)}`;
  document.getElementById('report-end-display').textContent = `แสดงผล: ${formatThaiDate(draft.endDate)}`;
}

function getTemperatureStatus(value) {
  const settings = getSettings();
  const number = Number(value);
  if (value === '' || !Number.isFinite(number)) return { label: 'ยังไม่กรอก', className: 'status-neutral' };
  if (number >= settings.criticalThreshold) return { label: 'Critical', className: 'status-critical' };
  if (number >= settings.warningThreshold) return { label: 'Warning', className: 'status-warning' };
  return { label: 'ปกติ', className: 'status-normal' };
}

function renderTemperatureCards(draft) {
  if (!temperatureGrid) return;
  temperatureGrid.replaceChildren();
  draft.temperatures.forEach(device => {
    const card = document.createElement('article');
    card.className = 'temperature-card';
    const header = document.createElement('div');
    header.className = 'temperature-card-header';
    const identity = document.createElement('div');
    const name = document.createElement('h4');
    name.textContent = device.name;
    const ip = document.createElement('code');
    ip.textContent = device.ip;
    identity.append(name, ip);
    const status = getTemperatureStatus(device.value);
    const badge = document.createElement('span');
    badge.className = `status-badge ${status.className}`;
    badge.textContent = status.label;
    header.append(identity, badge);

    const description = document.createElement('p');
    description.className = 'temperature-description';
    description.textContent = device.description;

    const inputWrap = document.createElement('label');
    inputWrap.className = 'temperature-input-wrap';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '-20';
    input.max = '150';
    input.step = '0.1';
    input.inputMode = 'decimal';
    input.value = device.value;
    input.setAttribute('aria-label', `อุณหภูมิ ${device.name}`);
    const unit = document.createElement('span');
    unit.textContent = 'Degree Celsius';
    inputWrap.append(input, unit);

    const command = document.createElement('div');
    command.className = 'temperature-command';
    const commandLabel = document.createElement('code');
    commandLabel.textContent = `Command: ${device.command}`;
    command.append(commandLabel);

    input.addEventListener('input', () => {
      const report = getReportDraft();
      const target = report.temperatures.find(item => item.id === device.id);
      if (!target) return;
      target.value = input.value;
      target.updatedAt = new Date().toISOString();
      report.updatedAt = new Date().toISOString();
      report.status = 'draft';
      saveReportDraft(report);
      const nextStatus = getTemperatureStatus(input.value);
      badge.className = `status-badge ${nextStatus.className}`;
      badge.textContent = nextStatus.label;
      updateHandoverMessage();
      updateCompletionBadge(report);
      emitDataChanged({ source: 'report' });
    });

    card.append(header, description, inputWrap, command);
    temperatureGrid.append(card);
  });
}

export function buildHandoverMessage(report = getReportDraft()) {
  const sameDate = report.startDate === report.endDate;
  const dateText = sameDate
    ? formatThaiDate(report.startDate, true)
    : `${formatThaiDate(report.startDate, true)} - ${formatThaiDate(report.endDate, true)}`;
  const count = Math.max(0, Number(report.attackCount) || 0);
  let attackText;
  switch (report.attackResult) {
    case 'blocked': attackText = `พบ ${count} เหตุการณ์ การโจมตีถูก Block โดย Arbor`; break;
    case 'followup': attackText = `พบ ${count} เหตุการณ์ ต้องติดตามและตรวจสอบเพิ่มเติม`; break;
    case 'other': attackText = report.attackOther || `พบ ${count} เหตุการณ์`; break;
    default: attackText = count > 0 ? `ตรวจพบ ${count} เหตุการณ์ แต่ไม่พบเหตุการณ์ผิดปกติ` : 'ไม่พบเหตุการณ์โจมตีผิดปกติ';
  }

  const lines = [
    `${dateText} เวลา ${report.timeWindow}`,
    attackText,
    'เว็บไซต์สรรพากรสามารถใช้งานได้ตามปกติ',
    ''
  ];
  report.temperatures.forEach(device => {
    const value = device.value === '' ? 'ยังไม่กรอก' : `${device.value} Degree Celsius`;
    lines.push(`- ${device.name} (${device.ip})`);
    lines.push(`  ${device.description}: ${value}`);
    lines.push('');
  });
  if (report.note) {
    lines.push(`หมายเหตุ: ${report.note}`);
    lines.push('');
  }
  lines.push(`ผู้ส่งมอบ: ${report.sender || '-'}`);
  lines.push(`ผู้รับมอบ: ${report.receiver || '-'}`);
  return lines.join('\n').trim();
}

function updateHandoverMessage() {
  const report = getReportDraft();
  document.getElementById('handover-message').value = buildHandoverMessage(report);
  updateCompletionBadge(report);
}

function updateCompletionBadge(report) {
  const badge = document.getElementById('report-completion-badge');
  const completed = report.status === 'completed';
  badge.textContent = completed ? 'Completed' : 'Draft';
  badge.className = `status-badge ${completed ? 'status-normal' : 'status-neutral'}`;
}

async function copyHandover() {
  try {
    await copyText(document.getElementById('handover-message').value);
    showToast('คัดลอกข้อความส่งมอบทั้งหมดแล้ว');
  } catch {
    showToast('ไม่สามารถคัดลอกข้อความได้', 'error');
  }
}

async function copyFilePath() {
  try {
    await copyText(document.getElementById('file-share-path').textContent);
    showToast('คัดลอก File Share Path แล้ว');
  } catch {
    showToast('ไม่สามารถคัดลอก Path ได้', 'error');
  }
}

function completeHandover() {
  preserveCurrentForm();
  const report = getReportDraft();
  if (!report.startDate || !report.endDate || !report.timeWindow) {
    showToast('กรุณากรอกวันที่และช่วงเวลาให้ครบ', 'error');
    return;
  }
  if (!report.sender || !report.receiver) {
    showToast('กรุณาเลือกผู้ส่งมอบและผู้รับมอบ', 'error');
    return;
  }
  report.status = 'completed';
  report.completedAt = new Date().toISOString();
  report.updatedAt = report.completedAt;
  report.handoverMessage = buildHandoverMessage(report);

  const history = getHistory();
  const recordId = report.historyId || createId('report');
  report.historyId = recordId;
  const record = JSON.parse(JSON.stringify({ ...report, id: recordId }));
  const existingIndex = history.items.findIndex(item => item.id === recordId);
  if (existingIndex >= 0) history.items[existingIndex] = record;
  else history.items.unshift(record);
  saveHistory(history);
  saveReportDraft(report);
  updateCompletionBadge(report);
  emitDataChanged({ source: 'report', completed: true });
  showToast('บันทึกรายงานและทำเครื่องหมายเสร็จแล้ว');
}

function openCommandModal(opener) {
  const report = getReportDraft();
  const order = ['10.1.100.3', '10.1.100.2', '10.1.100.1'];
  const list = document.createElement('div');
  list.className = 'modal-list';

  const intro = document.createElement('p');
  intro.className = 'muted';
  intro.textContent = 'สามารถ Copy Command แยกตาม IP ได้';
  list.append(intro);

  order.forEach(ipAddress => {
    const device = report.temperatures.find(item => item.ip === ipAddress);
    if (!device) return;
    const item = document.createElement('div');
    item.className = 'modal-list-item';
    const main = document.createElement('div');
    main.className = 'item-main';
    const ip = document.createElement('strong');
    ip.textContent = `IP: ${device.ip}`;
    const command = document.createElement('code');
    command.textContent = `Command: ${device.command}`;
    main.append(ip, command);
    const copy = buildButton('คัดลอก', 'button button-primary button-small');
    copy.addEventListener('click', async () => {
      try { await copyText(device.command); showToast(`คัดลอก Command สำหรับ ${device.ip} แล้ว`); }
      catch { showToast('ไม่สามารถคัดลอก Command ได้', 'error'); }
    });
    item.append(main, copy);
    list.append(item);
  });
  openModal({ title: 'Command Env temp', eyebrow: 'PLAIN TEXT COMMAND', content: list, opener });
}

function clearDraft() {
  if (!window.confirm('ล้างข้อมูล Draft ปัจจุบันหรือไม่? ประวัติที่บันทึกแล้วจะไม่ถูกลบ')) return;
  const current = getReportDraft();
  const fresh = {
    ...current,
    historyId: '', rangeType: 'daily', startDate: todayIso(), endDate: todayIso(),
    timeWindow: '06.00 - 20.30 น.', attackResult: 'normal', attackCount: 0,
    attackOther: '', note: '', sender: '', receiver: '', status: 'draft', completedAt: null,
    temperatures: current.temperatures.map(item => ({ ...item, value: '' })),
    updatedAt: new Date().toISOString()
  };
  saveReportDraft(fresh);
  loadReportIntoForm();
  emitDataChanged({ source: 'report' });
  showToast('ล้าง Draft แล้ว');
}
