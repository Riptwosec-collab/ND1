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

function runInitializer(name, initializer) {
  try {
    initializer();
  } catch (error) {
    console.error(`[Night Shift NOC] ${name} initialization failed`, error);
  }
}

function initApp() {
  initStorage();
  initRouter();

  runInitializer('toast', initToast);
  runInitializer('modal', initModal);
  runInitializer('appearance', () => applyAppearance(getSettings()));
  runInitializer('shell controls', initShellControls);
  runInitializer('operator selector', populateOperatorSelect);
  runInitializer('dashboard', initDashboard);
  runInitializer('checklist', initChecklist);
  runInitializer('work links', initLinks);
  runInitializer('report', initReport);
  runInitializer('history', initHistory);
  runInitializer('settings', initSettings);
  runInitializer('clock', initClock);

  window.addEventListener('nightNoc:settings-changed', () => {
    runInitializer('settings refresh', () => {
      populateOperatorSelect();
      applyAppearance(getSettings());
    });
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
  document.querySelectorAll('[data-route-link]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      closeSidebar();
      navigate(link.dataset.routeLink);
    });
  });

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
