import { formatThaiDate, todayIso } from './utils.js';

export function initDashboard() {
  ensureSceneStylesheet();
  ensureVisualOverride();
  ensureBalanceOverride();
  ensureReferenceOverride();
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
  const stylesheetHref = './assets/css/night-helpdesk-scene.css?v=20260807-20';
  const existing = document.getElementById(stylesheetId);

  if (existing) {
    if (!existing.getAttribute('href')?.includes('20260807-20')) existing.setAttribute('href', stylesheetHref);
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
  const stylesheetHref = './assets/css/home-cleanup-v13.css?v=20260807-20';
  const existing = document.getElementById(stylesheetId);

  if (existing) {
    if (!existing.getAttribute('href')?.includes('20260807-20')) existing.setAttribute('href', stylesheetHref);
    return;
  }

  const link = document.createElement('link');
  link.id = stylesheetId;
  link.rel = 'stylesheet';
  link.href = stylesheetHref;
  document.head.append(link);
}

function ensureBalanceOverride() {
  const stylesheetId = 'home-balance-v22-styles';
  const stylesheetHref = './assets/css/home-balance-v22.css?v=20260807-22';
  const existing = document.getElementById(stylesheetId);

  if (existing) {
    if (!existing.getAttribute('href')?.includes('20260807-22')) existing.setAttribute('href', stylesheetHref);
    return;
  }

  const link = document.createElement('link');
  link.id = stylesheetId;
  link.rel = 'stylesheet';
  link.href = stylesheetHref;
  document.head.append(link);
}

function ensureReferenceOverride() {
  const stylesheetId = 'home-reference-v23-styles';
  const stylesheetHref = './assets/css/home-reference-v23.css?v=20260807-23';
  const existing = document.getElementById(stylesheetId);

  if (existing) {
    if (!existing.getAttribute('href')?.includes('20260807-23')) existing.setAttribute('href', stylesheetHref);
    existing.remove();
    document.head.append(existing);
    return;
  }

  const link = document.createElement('link');
  link.id = stylesheetId;
  link.rel = 'stylesheet';
  link.href = stylesheetHref;
  document.head.append(link);
}
