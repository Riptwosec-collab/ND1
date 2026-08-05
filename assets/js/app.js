import { getSettings, initStorage, saveSettings } from './storage.js';
import { formatThaiDate, currentTimeText, todayIso } from './utils.js';
import { initToast } from './toast.js';
import { initModal } from './modal.js';
import { initRouter, navigate } from './router.js';
import { initDashboard } from './dashboard.js';
import { initChecklist } from './checklist.js';
import { initLinks } from './links.js';
import { initReport } from './report.js';
import { initHistory } from './history.js';
import { applyAppearance, initSettings } from './settings.js';

function initApp() {
  initStorage();
  initToast();
  initModal();
  applyAppearance(getSettings());
  initShellControls();
  populateOperatorSelect();
  initDashboard();
  initChecklist();
  initLinks();
  initReport();
  initHistory();
  initSettings();
  initClock();
  initRouter();

  window.addEventListener('nightNoc:settings-changed', () => {
    populateOperatorSelect();
    applyAppearance(getSettings());
  });
}

function initShellControls() {
  const shell = document.getElementById('app-shell');
  const backdrop = document.getElementById('sidebar-backdrop');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebarClose = document.getElementById('sidebar-close');
  const collapseButton = document.getElementById('sidebar-collapse');

  const openSidebar = () => {
    shell.classList.add('sidebar-open');
    backdrop.hidden = false;
    menuToggle.setAttribute('aria-expanded', 'true');
  };
  const closeSidebar = () => {
    shell.classList.remove('sidebar-open');
    backdrop.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
  };

  menuToggle.addEventListener('click', openSidebar);
  sidebarClose.addEventListener('click', closeSidebar);
  backdrop.addEventListener('click', closeSidebar);
  document.querySelectorAll('[data-route-link]').forEach(link => link.addEventListener('click', closeSidebar));

  collapseButton.addEventListener('click', () => {
    const settings = getSettings();
    settings.sidebarCollapsed = !settings.sidebarCollapsed;
    saveSettings(settings);
    applyAppearance(settings);
  });

  document.addEventListener('click', event => {
    const routeButton = event.target.closest('[data-go-route]');
    if (!routeButton) return;
    navigate(routeButton.dataset.goRoute);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && shell.classList.contains('sidebar-open')) closeSidebar();
  });
}

function populateOperatorSelect() {
  const settings = getSettings();
  const select = document.getElementById('active-operator');
  const current = settings.activeOperator || '';
  select.replaceChildren();
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = 'ไม่ระบุ';
  select.append(blank);
  settings.people.forEach(person => {
    const option = document.createElement('option');
    option.value = person;
    option.textContent = person;
    select.append(option);
  });
  select.value = settings.people.includes(current) ? current : '';
  select.onchange = () => {
    const latest = getSettings();
    latest.activeOperator = select.value;
    saveSettings(latest);
    window.dispatchEvent(new CustomEvent('nightNoc:data-changed', { detail: { source: 'operator' } }));
  };
}

function initClock() {
  const dateNode = document.getElementById('clock-date');
  const timeNode = document.getElementById('clock-time');
  const tick = () => {
    dateNode.textContent = formatThaiDate(todayIso());
    timeNode.textContent = currentTimeText();
  };
  tick();
  setInterval(tick, 1000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp, { once: true });
else initApp();
