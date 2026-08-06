(() => {
  'use strict';
  const routeTitles = Object.freeze({dashboard:'ภาพรวมกะดึก',checklist:'เช็กลิสต์กะดึก','work-links':'รวมลิงก์งาน',todo:'งานที่ต้องทำ'});
  const aliases = Object.freeze({links:'work-links',report:'todo',history:'dashboard',settings:'dashboard'});
  const storageKey = 'nightNoc.currentRoute.v2';
  function normalizeRoute(value){const candidate=String(value||'').replace(/^#/,'');const route=aliases[candidate]||candidate;return Object.prototype.hasOwnProperty.call(routeTitles,route)?route:'dashboard';}
  function readStoredRoute(){try{return normalizeRoute(JSON.parse(localStorage.getItem(storageKey)||'"dashboard"'));}catch{return'dashboard';}}
  function saveRoute(route){try{localStorage.setItem(storageKey,JSON.stringify(route));}catch{}}
  function renderRoute(){const route=location.hash?normalizeRoute(location.hash):readStoredRoute();if(location.hash!==`#${route}`)history.replaceState(null,'',`#${route}`);document.querySelectorAll('[data-route]').forEach(page=>{page.hidden=page.dataset.route!==route;});document.querySelectorAll('[data-route-link]').forEach(link=>{const active=normalizeRoute(link.dataset.routeLink)===route;if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});const title=routeTitles[route];const pageTitle=document.getElementById('page-title');if(pageTitle)pageTitle.textContent=title;document.title=`${title} | Night Shift NOC`;saveRoute(route);window.dispatchEvent(new CustomEvent('nightNoc:route-changed',{detail:{route}}));}
  function navigate(route){const target=normalizeRoute(route);if(location.hash===`#${target}`)renderRoute();else location.hash=target;}
  function closeMobileSidebar(){document.getElementById('app-shell')?.classList.remove('sidebar-open');const backdrop=document.getElementById('sidebar-backdrop');if(backdrop)backdrop.hidden=true;document.getElementById('menu-toggle')?.setAttribute('aria-expanded','false');}
  function bindNavigation(){document.querySelectorAll('[data-route-link]').forEach(link=>{if(link.dataset.navigationBound==='true')return;link.dataset.navigationBound='true';link.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();closeMobileSidebar();navigate(link.dataset.routeLink);});});renderRoute();}
  window.NightNocNavigation=Object.freeze({navigate,renderRoute});window.addEventListener('hashchange',renderRoute);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindNavigation,{once:true});else bindNavigation();
})();