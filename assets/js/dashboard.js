import { formatThaiDate, todayIso } from './utils.js';

export function initDashboard() {
  ensureSceneStylesheet();
  ensureVisualOverride();
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
  const stylesheetHref = './assets/css/night-helpdesk-scene.css?v=20260807-16';
  const existing = document.getElementById(stylesheetId);

  if (existing) {
    if (!existing.getAttribute('href')?.includes('20260807-16')) existing.setAttribute('href', stylesheetHref);
    return;
  }

  const link = document.createElement('link');
  link.id = stylesheetId;
  link.rel = 'stylesheet';
  link.href = stylesheetHref;
  document.head.append(link);
}

function ensureVisualOverride() {
  const stylesheetId = 'home-cleanup-v13-styles';
  const stylesheetHref = './assets/css/home-cleanup-v13.css?v=20260807-16';
  const existing = document.getElementById(stylesheetId);

  if (existing) {
    if (!existing.getAttribute('href')?.includes('20260807-16')) existing.setAttribute('href', stylesheetHref);
    return;
  }

  const link = document.createElement('link');
  link.id = stylesheetId;
  link.rel = 'stylesheet';
  link.href = stylesheetHref;
  document.head.append(link);
}
