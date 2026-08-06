import { formatThaiDate, todayIso } from './utils.js';

export function initDashboard() {
  ensureSceneStylesheet();
  updateDashboard();

  window.addEventListener('nightNoc:route-changed', event => {
    if (event.detail.route === 'dashboard') updateDashboard();
  });
}

export function updateDashboard() {
  const dateNode = document.getElementById('hero-date');
  if (dateNode) dateNode.textContent = formatThaiDate(todayIso());
}

function ensureSceneStylesheet() {
  const stylesheetId = 'night-helpdesk-scene-styles';
  if (document.getElementById(stylesheetId)) return;

  const link = document.createElement('link');
  link.id = stylesheetId;
  link.rel = 'stylesheet';
  link.href = './assets/css/night-helpdesk-scene.css?v=20260806-10';
  document.head.append(link);
}
