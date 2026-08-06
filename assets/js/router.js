import { getCurrentRoute, saveCurrentRoute } from './storage.js';

const ROUTES = Object.freeze({
  dashboard: 'ภาพรวมกะดึก',
  checklist: 'เช็กลิสต์กะดึก',
  'work-links': 'รวมลิงก์งาน',
  todo: 'งานที่ต้องทำ'
});

const ROUTE_ALIASES = Object.freeze({ links: 'work-links', report: 'todo', history: 'dashboard', settings: 'dashboard' });

function normalizeRoute(value) {
  const candidate = String(value || '').replace(/^#/, '');
  const aliased = ROUTE_ALIASES[candidate] || candidate;
  return ROUTES[aliased] ? aliased : 'dashboard';
}

export function initRouter() {
  if (window.NightNocNavigation) { window.NightNocNavigation.renderRoute(); return; }
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}

export function navigate(route) {
  const safeRoute = normalizeRoute(route);
  if (window.NightNocNavigation) { window.NightNocNavigation.navigate(safeRoute); return; }
  if (location.hash === `#${safeRoute}`) renderRoute(); else location.hash = safeRoute;
}

export function renderRoute() {
  const routeFromHash = location.hash.replace('#', '');
  const storedRoute = normalizeRoute(getCurrentRoute());
  const route = routeFromHash ? normalizeRoute(routeFromHash) : storedRoute;
  if (location.hash !== `#${route}`) history.replaceState(null, '', `#${route}`);
  document.querySelectorAll('[data-route]').forEach(page => { page.hidden = page.dataset.route !== route; });
  document.querySelectorAll('[data-route-link]').forEach(link => {
    const active = normalizeRoute(link.dataset.routeLink) === route;
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  document.getElementById('page-title').textContent = ROUTES[route];
  document.title = `${ROUTES[route]} | Night Shift NOC`;
  saveCurrentRoute(route);
  window.dispatchEvent(new CustomEvent('nightNoc:route-changed', { detail: { route } }));
  document.getElementById('main-content').focus({ preventScroll: true });
}
