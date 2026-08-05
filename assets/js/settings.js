import { getSettings, resetAllData, saveSettings } from './storage.js';
import { buildButton, emitDataChanged } from './utils.js';
import { showToast } from './toast.js';

let peopleList;

export function initSettings() {
  peopleList = document.getElementById('people-list');
  document.getElementById('threshold-form').addEventListener('submit', saveThresholds);
  document.getElementById('theme-form').addEventListener('submit', saveTheme);
  document.getElementById('person-form').addEventListener('submit', addPerson);
  document.getElementById('reset-all-data').addEventListener('click', resetData);
  loadSettingsForm();
  renderPeople();
  applyAppearance(getSettings());
  window.addEventListener('nightNoc:route-changed', event => {
    if (event.detail.route === 'settings') {
      loadSettingsForm();
      renderPeople();
    }
  });
}

export function applyAppearance(settings = getSettings()) {
  document.documentElement.dataset.accent = settings.accent || 'cyan';
  document.body.classList.toggle('density-compact', Boolean(settings.compactDensity));
  document.getElementById('app-shell').classList.toggle('sidebar-collapsed', Boolean(settings.sidebarCollapsed));
  const collapseButton = document.getElementById('sidebar-collapse');
  collapseButton.textContent = settings.sidebarCollapsed ? 'ขยายเมนู' : 'ย่อเมนู';
  collapseButton.setAttribute('aria-expanded', String(!settings.sidebarCollapsed));
}

function loadSettingsForm() {
  const settings = getSettings();
  document.getElementById('warning-threshold').value = String(settings.warningThreshold);
  document.getElementById('critical-threshold').value = String(settings.criticalThreshold);
  document.getElementById('theme-accent').value = settings.accent || 'cyan';
  document.getElementById('compact-density').checked = Boolean(settings.compactDensity);
}

function saveThresholds(event) {
  event.preventDefault();
  const warning = Number(document.getElementById('warning-threshold').value);
  const critical = Number(document.getElementById('critical-threshold').value);
  if (!Number.isFinite(warning) || !Number.isFinite(critical) || warning < 1 || critical <= warning || critical > 100) {
    showToast('Critical ต้องมากกว่า Warning และค่าอยู่ในช่วง 1–100°C', 'error');
    return;
  }
  const settings = getSettings();
  settings.warningThreshold = warning;
  settings.criticalThreshold = critical;
  saveSettings(settings);
  notifySettingsChanged();
  showToast('บันทึกเกณฑ์อุณหภูมิแล้ว');
}

function saveTheme(event) {
  event.preventDefault();
  const settings = getSettings();
  settings.accent = document.getElementById('theme-accent').value;
  settings.compactDensity = document.getElementById('compact-density').checked;
  saveSettings(settings);
  applyAppearance(settings);
  notifySettingsChanged();
  showToast('บันทึก Theme Settings แล้ว');
}

function addPerson(event) {
  event.preventDefault();
  const input = document.getElementById('person-name');
  const name = input.value.trim();
  if (!name) return;
  const settings = getSettings();
  if (settings.people.some(person => person.toLocaleLowerCase('th-TH') === name.toLocaleLowerCase('th-TH'))) {
    showToast('มีรายชื่อนี้อยู่แล้ว', 'error');
    return;
  }
  settings.people.push(name);
  saveSettings(settings);
  input.value = '';
  renderPeople();
  notifySettingsChanged();
  showToast('เพิ่มรายชื่อแล้ว');
}

function renderPeople() {
  const settings = getSettings();
  peopleList.replaceChildren();
  settings.people.forEach(person => {
    const row = document.createElement('div');
    row.className = 'person-row';
    const name = document.createElement('span');
    name.textContent = person;
    const remove = buildButton('ลบ', 'button button-danger-outline button-small');
    remove.setAttribute('aria-label', `ลบรายชื่อ ${person}`);
    remove.addEventListener('click', () => removePerson(person));
    row.append(name, remove);
    peopleList.append(row);
  });
}

function removePerson(person) {
  const settings = getSettings();
  if (settings.people.length <= 1) {
    showToast('ต้องมีรายชื่ออย่างน้อย 1 คน', 'error');
    return;
  }
  if (!window.confirm(`ลบรายชื่อ “${person}” หรือไม่?`)) return;
  settings.people = settings.people.filter(value => value !== person);
  if (settings.activeOperator === person) settings.activeOperator = '';
  saveSettings(settings);
  renderPeople();
  notifySettingsChanged();
  showToast('ลบรายชื่อแล้ว');
}

function resetData() {
  if (!window.confirm('ยืนยันล้าง Checklist, ลิงก์, Draft, ประวัติ และการตั้งค่าทั้งหมดหรือไม่?')) return;
  resetAllData();
  showToast('ล้างข้อมูลทั้งหมดแล้ว ระบบจะเริ่มใหม่');
  setTimeout(() => location.reload(), 300);
}

function notifySettingsChanged() {
  window.dispatchEvent(new CustomEvent('nightNoc:settings-changed'));
  emitDataChanged({ source: 'settings' });
}
