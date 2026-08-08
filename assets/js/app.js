import { getSettings, initStorage, saveSettings } from './storage.js';
import { initToast } from './toast.js';
import { initModal } from './modal.js';
import { initRouter, navigate } from './router.js';
import { initDashboard } from './dashboard.js?v=20260807-24';
import { initLinks } from './links.js';

function runInitializer(name, initializer) {
  try { initializer(); }
  catch (error) { console.error(`[Night Shift NOC] ${name} initialization failed`, error); }
}

function applySavedShell(settings = getSettings()) {
  document.documentElement.dataset.accent = settings.accent || 'cyan';
  document.body.classList.toggle('density-compact', Boolean(settings.compactDensity));
  const shell = document.getElementById('app-shell');
  const collapseButton = document.getElementById('sidebar-collapse');
  shell?.classList.toggle('sidebar-collapsed', Boolean(settings.sidebarCollapsed));
  if (collapseButton) {
    collapseButton.textContent = settings.sidebarCollapsed ? 'ขยายเมนู' : 'ย่อเมนู';
    collapseButton.setAttribute('aria-expanded', String(!settings.sidebarCollapsed));
  }
}

function initApp() {
  initStorage();
  initRouter();
  runInitializer('toast', initToast);
  runInitializer('modal', initModal);
  runInitializer('saved appearance', () => applySavedShell(getSettings()));
  runInitializer('shell controls', initShellControls);
  runInitializer('operator selector', populateOperatorSelect);
  runInitializer('dashboard', initDashboard);
  if (!document.getElementById('linkTaskGrid')) runInitializer('work links', initLinks);
  if (!window.__shiftCountdownInitialized) {
    runInitializer('shift countdown styles', ensureShiftCountdownStyles);
    runInitializer('shift countdown', initClock);
  }
}

function initShellControls() {
  const shell = document.getElementById('app-shell');
  const backdrop = document.getElementById('sidebar-backdrop');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebarClose = document.getElementById('sidebar-close');
  const collapseButton = document.getElementById('sidebar-collapse');
  const openSidebar = () => { shell.classList.add('sidebar-open'); backdrop.hidden = false; menuToggle.setAttribute('aria-expanded', 'true'); };
  const closeSidebar = () => { shell.classList.remove('sidebar-open'); backdrop.hidden = true; menuToggle.setAttribute('aria-expanded', 'false'); };
  menuToggle.addEventListener('click', openSidebar);
  sidebarClose.addEventListener('click', closeSidebar);
  backdrop.addEventListener('click', closeSidebar);
  document.querySelectorAll('[data-route-link]').forEach(link => {
    if (link.dataset.navigationBound === 'true') return;
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); closeSidebar(); navigate(link.dataset.routeLink);
    });
  });
  collapseButton.addEventListener('click', () => {
    const settings = getSettings(); settings.sidebarCollapsed = !settings.sidebarCollapsed; saveSettings(settings); applySavedShell(settings);
  });
  document.addEventListener('click', event => { const routeButton = event.target.closest('[data-go-route]'); if (routeButton) navigate(routeButton.dataset.goRoute); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && shell.classList.contains('sidebar-open')) closeSidebar(); });
}

function populateOperatorSelect() {
  const settings = getSettings();
  const select = document.getElementById('active-operator');
  const current = settings.activeOperator || '';
  select.replaceChildren();
  const blank = document.createElement('option'); blank.value = ''; blank.textContent = 'ไม่ระบุ'; select.append(blank);
  settings.people.forEach(person => { const option = document.createElement('option'); option.value = person; option.textContent = person; select.append(option); });
  select.value = settings.people.includes(current) ? current : '';
  select.onchange = () => { const latest = getSettings(); latest.activeOperator = select.value; saveSettings(latest); window.dispatchEvent(new CustomEvent('nightNoc:data-changed', { detail: { source: 'operator' } })); };
}

function ensureShiftCountdownStyles() {
  const stylesheetId = 'shift-countdown-v25-styles';
  const stylesheetHref = './assets/css/shift-countdown-v25.css?v=20260808-26';
  const existing = document.getElementById(stylesheetId);
  if (existing) {
    if (existing.getAttribute('href') !== stylesheetHref) existing.setAttribute('href', stylesheetHref);
    return;
  }
  const link = document.createElement('link');
  link.id = stylesheetId;
  link.rel = 'stylesheet';
  link.href = stylesheetHref;
  document.head.append(link);
}

function getShiftCountdownState(now = new Date()) {
  const current = new Date(now);
  const shiftEnd = new Date(current);
  shiftEnd.setHours(8, 30, 0, 0);
  const shiftStart = new Date(current);
  shiftStart.setHours(20, 30, 0, 0);

  let target;
  let activeShift;

  if (current < shiftEnd) {
    target = shiftEnd;
    activeShift = true;
  } else if (current >= shiftStart) {
    target = new Date(current);
    target.setDate(target.getDate() + 1);
    target.setHours(8, 30, 0, 0);
    activeShift = true;
  } else {
    target = shiftStart;
    activeShift = false;
  }

  const totalSeconds = Math.max(0, Math.floor((target.getTime() - current.getTime()) / 1000));
  return {
    activeShift,
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60
  };
}

function initClock() {
  if (window.__shiftCountdownInitialized) return;
  const labelNode = document.getElementById('clock-date');
  const timeNode = document.getElementById('clock-time');
  if (!labelNode || !timeNode) return;

  const clockNode = timeNode.parentElement;
  clockNode?.classList.add('shift-countdown-clock');
  window.__shiftCountdownInitialized = true;
  const pad = value => String(value).padStart(2, '0');

  const tick = () => {
    const state = getShiftCountdownState(new Date());
    const status = state.activeShift ? 'เหลือเวลากะ' : 'เริ่มกะใน';
    const countdown = `${pad(state.hours)}:${pad(state.minutes)}:${pad(state.seconds)}`;

    labelNode.textContent = 'กะดึก 20.30 - 08.30 น.';
    timeNode.textContent = countdown;
    clockNode?.setAttribute('data-shift-state', state.activeShift ? 'active' : 'waiting');
    clockNode?.setAttribute('title', `${status} ${countdown}`);
    clockNode?.setAttribute('aria-label', `${status} ${countdown} กะดึก 20.30 ถึง 08.30 น.`);
  };

  tick();
  window.setInterval(tick, 1000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp, { once: true });
else initApp();
