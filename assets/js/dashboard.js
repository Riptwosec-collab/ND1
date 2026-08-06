import { formatThaiDate, todayIso } from './utils.js';

let countdownTimer = null;

export function initDashboard() {
  ensureSceneStylesheet();
  ensureShiftCountdown();
  updateDashboard();
  startShiftCountdown();

  window.addEventListener('nightNoc:route-changed', event => {
    if (event.detail.route === 'dashboard') updateDashboard();
  });
}

export function updateDashboard() {
  const dateNode = document.getElementById('hero-date');
  if (dateNode) dateNode.textContent = formatThaiDate(todayIso());
  updateShiftCountdown();
}

function ensureSceneStylesheet() {
  const stylesheetId = 'night-helpdesk-scene-styles';
  if (document.getElementById(stylesheetId)) return;

  const link = document.createElement('link');
  link.id = stylesheetId;
  link.rel = 'stylesheet';
  link.href = './assets/css/night-helpdesk-scene.css?v=20260806-3';
  document.head.append(link);
}

function ensureShiftCountdown() {
  const panel = document.querySelector('#page-dashboard .hero-command-panel');
  if (!panel || document.getElementById('shiftCountdown')) return;

  const box = document.createElement('div');
  box.className = 'shift-countdown-box';
  box.id = 'shiftCountdownBox';
  box.setAttribute('aria-live', 'polite');

  const label = document.createElement('small');
  label.id = 'shiftCountdownLabel';
  label.textContent = 'กำลังคำนวณเวลา';

  const value = document.createElement('strong');
  value.id = 'shiftCountdown';
  value.textContent = '--:--:--';

  const range = document.createElement('span');
  range.id = 'shiftCountdownSub';
  range.textContent = 'เวลาทำงาน 20:30 - 08:30 น.';

  box.append(label, value, range);
  panel.append(box);
}

export function getShiftCountdownState(now = new Date()) {
  const current = new Date(now);
  const morningEnd = new Date(current);
  morningEnd.setHours(8, 30, 0, 0);

  const eveningStart = new Date(current);
  eveningStart.setHours(20, 30, 0, 0);

  let target;
  let active;

  if (current < morningEnd) {
    target = morningEnd;
    active = true;
  } else if (current >= eveningStart) {
    target = new Date(current);
    target.setDate(target.getDate() + 1);
    target.setHours(8, 30, 0, 0);
    active = true;
  } else {
    target = eveningStart;
    active = false;
  }

  const remainingMilliseconds = Math.max(0, target.getTime() - current.getTime());
  const totalSeconds = Math.floor(remainingMilliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    active,
    target,
    hours,
    minutes,
    seconds,
    label: active ? 'เวลาที่เหลือของกะ' : 'นับถอยหลังก่อนเริ่มกะ'
  };
}

function formatTwoDigits(value) {
  return String(value).padStart(2, '0');
}

function updateShiftCountdown() {
  const valueNode = document.getElementById('shiftCountdown');
  if (!valueNode) return;

  const labelNode = document.getElementById('shiftCountdownLabel');
  const boxNode = document.getElementById('shiftCountdownBox');
  const state = getShiftCountdownState(new Date());

  valueNode.textContent = `${formatTwoDigits(state.hours)}:${formatTwoDigits(state.minutes)}:${formatTwoDigits(state.seconds)}`;
  if (labelNode) labelNode.textContent = state.label;
  if (boxNode) boxNode.dataset.shiftState = state.active ? 'active' : 'waiting';
}

function startShiftCountdown() {
  if (countdownTimer !== null) return;
  updateShiftCountdown();
  countdownTimer = window.setInterval(updateShiftCountdown, 1000);
}
