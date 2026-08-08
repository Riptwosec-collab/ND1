import { formatThaiDate, todayIso } from './utils.js';

const LEGACY_HOME_STYLE_IDS = [
  'night-helpdesk-scene-styles',
  'home-cleanup-v13-styles',
  'home-3d-v21-styles',
  'home-balance-v22-styles',
  'home-reference-v23-styles',
  'home-command-v24-styles'
];

export function initDashboard() {
  removeLegacyHomeStyles();
  ensureHomeStylesheet();
  updateDashboard();

  window.addEventListener('nightNoc:route-changed', event => {
    if (event.detail.route === 'dashboard') {
      removeLegacyHomeStyles();
      ensureHomeStylesheet();
      updateDashboard();
    }
  });
}

export function updateDashboard() {
  const dateNode = document.getElementById('hero-date');
  if (dateNode) dateNode.textContent = formatThaiDate(todayIso());
}

function removeLegacyHomeStyles() {
  LEGACY_HOME_STYLE_IDS.forEach(id => document.getElementById(id)?.remove());
}

function ensureHomeStylesheet() {
  const stylesheetId = 'home-epic-v27-styles';
  const stylesheetHref = './assets/css/home-epic-v27.css?v=20260808-27';
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
