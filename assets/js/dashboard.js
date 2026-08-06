import { formatThaiDate, todayIso } from './utils.js';

export function initDashboard() {
  updateDashboard();
  window.addEventListener('nightNoc:route-changed', event => {
    if (event.detail.route === 'dashboard') updateDashboard();
  });
}

export function updateDashboard() {
  const dateNode = document.getElementById('hero-date');
  if (dateNode) dateNode.textContent = formatThaiDate(todayIso());
}
