(() => {
  'use strict';
  const root = document.getElementById('page-work-links');
  if (!root || !document.getElementById('linkTaskGrid')) return;

  const STORAGE = {
    linkStatus: 'nightShiftV3:linkStatus',
    customLinks: 'nightShiftV3:customLinks',
    temperature: 'nightShiftV3:temperature',
    migrated: 'nightShiftV3:migratedFromNightNocV2'
  };
  const BUILTIN_LINKS = [
    {id:'temperature',title:'ตรวจสอบอุณหภูมิอุปกรณ์ 3 ตัว / Email SMOC'},
    {id:'uih',title:'รายงานคงค้าง UIH'},
    {id:'netflow',title:'ตรวจสอบกราฟ NetFlow'},
    {id:'service',title:'ตรวจสอบ Service ระบบงาน'},
    {id:'ipam',title:'Add IPAM ที่ Solawind'}
  ];
  const $ = (selector, scope = root) => scope.querySelector(selector);
  const $$ = (selector, scope = root) => Array.from(scope.querySelectorAll(selector));

  function readStorage(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { showToast('ไม่สามารถบันทึกข้อมูลใน LocalStorage ได้', 'error'); return false; }
  }
  function create(tag, attributes = {}, text = '') {
    const node = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'class') node.className = value;
      else if (key === 'dataset') Object.entries(value).forEach(([dataKey, dataValue]) => { node.dataset[dataKey] = dataValue; });
      else node.setAttribute(key, String(value));
    });
    if (text !== '') node.textContent = text;
    return node;
  }
  function showToast(message, type = 'success') {
    const wrap = $('#wl7Toasts');
    const toast = create('div', {class:`wl7-toast ${type}`});
    const close = create('button', {type:'button','aria-label':'ปิดการแจ้งเตือน'}, '×');
    close.addEventListener('click', () => toast.remove());
    toast.append(create('div', {}, message), close);
    wrap.append(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }
  async function copyToClipboard(text, message = 'คัดลอกสำเร็จ') {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const textarea = create('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.append(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        textarea.remove();
        if (!ok) throw new Error('copy failed');
      }
      showToast(message);
    } catch { showToast('คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง', 'error'); }
  }
  function getTodayInputValue() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }
  function getTomorrowInputValue(startValue) {
    const base = startValue ? new Date(`${startValue}T00:00:00`) : new Date();
    base.setDate(base.getDate() + 1);
    const offset = base.getTimezoneOffset() * 60000;
    return new Date(base.getTime() - offset).toISOString().slice(0, 10);
  }
  function parseDate(value) {
    const parts = String(value || '').split('-').map(Number);
    return parts.length === 3 && parts.every(Number.isFinite) ? parts : null;
  }
  function thaiDateLong(value) {
    const parts = parseDate(value);
    if (!parts) return '-';
    const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    return `${parts[2]} ${months[parts[1] - 1]} ${parts[0] + 543}`;
  }
  function thaiDateRange(startValue, endValue, mode) {
    if (mode !== 'range') return thaiDateLong(startValue);
    const start = parseDate(startValue);
    const end = parseDate(endValue);
    if (!start || !end) return thaiDateLong(startValue);
    const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    if (start[0] === end[0] && start[1] === end[1]) return `${start[2]} - ${end[2]} ${months[start[1] - 1]} ${start[0] + 543}`;
    if (start[0] === end[0]) return `${start[2]} ${months[start[1] - 1]} - ${end[2]} ${months[end[1] - 1]} ${start[0] + 543}`;
    return `${thaiDateLong(startValue)} - ${thaiDateLong(endValue)}`;
  }
  function temperatureLevel(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return ['ยังไม่ระบุ', ''];
    if (number >= 50) return ['Critical', 'critical'];
    if (number >= 45) return ['Warning', 'warn'];
    return ['ปกติ', 'ok'];
  }
  function temperatureData() {
    return {
      dateMode: $('#reportDateMode').value,
      dateStart: $('#reportDateStart').value,
      dateEnd: $('#reportDateEnd').value,
      shift: $('#reportShift').value,
      incidentMode: $('#incidentMode').value,
      count: $('#attackCount').value,
      temp1: $('#temp1').value,
      temp2: $('#temp2').value,
      temp3: $('#temp3').value
    };
  }
  function loadTemperatureSettings() {
    const saved = readStorage(STORAGE.temperature, {});
    $('#reportDateMode').value = saved.dateMode || 'single';
    $('#reportDateStart').value = saved.dateStart || getTodayInputValue();
    $('#reportDateEnd').value = saved.dateEnd || getTomorrowInputValue($('#reportDateStart').value);
    $('#reportShift').value = saved.shift || 'day';
    $('#incidentMode').value = saved.incidentMode || 'found';
    $('#attackCount').value = saved.count || '4';
    $('#temp1').value = saved.temp1 || '49';
    $('#temp2').value = saved.temp2 || '47';
    $('#temp3').value = saved.temp3 || '32';
  }
  function syncTemperatureControls(autoEndDate = false) {
    const mode = $('#reportDateMode').value;
    const start = $('#reportDateStart').value || getTodayInputValue();
    $('#reportDateEndField').hidden = mode !== 'range';
    if (mode === 'range' && (!$('#reportDateEnd').value || autoEndDate)) $('#reportDateEnd').value = getTomorrowInputValue(start);
    $('#attackCountField').hidden = $('#incidentMode').value === 'none';
  }
  function buildTemperatureReport(data) {
    const dateText = thaiDateRange(data.dateStart, data.dateEnd, data.dateMode);
    const times = data.shift === 'night' ? {start:'20.30',end:'06.00'} : {start:'06.00',end:'20.30'};
    const incidentText = data.incidentMode === 'none'
      ? 'ไม่พบเหตุการณ์การโจมตี เว็บไซต์สรรพากรสามารถใช้งานได้ตามปกติ'
      : `พบ ${Math.max(1, Number.parseInt(data.count || '4', 10))} เหตุการณ์ การโจมตีถูก Block โดย Arbor เว็บไซต์สรรพากรสามารถใช้งานได้ตามปกติ`;
    return `${dateText} เวลา ${times.start} - ${times.end} น.\n${incidentText}\n\n- IT05-C3750X-Intra-Inter (10.1.100.3)\n  System Temperature Value: ${data.temp3 || '-'} Degree Celsius\n\n- IT06-C9500-CSW1-A01 (10.1.100.1)\n  FL6-Rack A01 Temperature: ${data.temp1 || '-'} Degree Celsius\n\n- IT06-C9500-CSW2-A02 (10.1.100.2)\n  FL6-Rack A02 Temperature: ${data.temp2 || '-'} Degree Celsius`;
  }
  function updateTemperatureReport() {
    $$('.temperature-input').forEach(input => {
      const badge = root.querySelector(`[data-temp-for="${input.id}"]`);
      const [label, className] = temperatureLevel(input.value);
      badge.textContent = label;
      badge.className = `wl7-badge temp-status ${className}`;
    });
    $('#temperatureReport').value = buildTemperatureReport(temperatureData());
  }
  function linkStatusData() { return readStorage(STORAGE.linkStatus, {}); }
  function updateLinkProgress() {
    const custom = readStorage(STORAGE.customLinks, []);
    const status = linkStatusData();
    const ids = [...BUILTIN_LINKS.map(item => item.id), ...custom.map(item => item.id)];
    const done = ids.filter(id => status[id]).length;
    $('#linkProgressBadge').textContent = `${done}/${ids.length} เสร็จ`;
  }
  function updateLinkCards() {
    const status = linkStatusData();
    $$('[data-link-id]').forEach(card => {
      const id = card.dataset.linkId;
      const done = Boolean(status[id]);
      card.classList.toggle('completed', done);
      const badge = $('.task-state', card);
      if (badge) { badge.textContent = done ? 'เสร็จสิ้น' : 'รอดำเนินการ'; badge.className = `wl7-badge task-state ${done ? 'ok' : ''}`; }
      const button = $('.complete-link', card);
      if (button) button.textContent = done ? 'ยกเลิกเสร็จ' : 'ทำเครื่องหมายเสร็จ';
    });
    updateLinkProgress();
  }
  function toggleLinkComplete(id) {
    const status = linkStatusData();
    status[id] = !status[id];
    writeStorage(STORAGE.linkStatus, status);
    updateLinkCards();
    window.dispatchEvent(new CustomEvent('nightNoc:data-changed', {detail:{source:'work-links-v7'}}));
    showToast(status[id] ? 'ทำเครื่องหมายเสร็จแล้ว' : 'ยกเลิกเครื่องหมายเสร็จแล้ว');
  }
  function validHttpUrl(value) {
    try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; }
    catch { return false; }
  }
  function migrateLegacyCustomLinks() {
    if (localStorage.getItem(STORAGE.migrated)) return;
    const legacy = readStorage('nightNoc.workLinks.v2', {items:[]});
    const current = readStorage(STORAGE.customLinks, []);
    const seen = new Set(current.map(item => `${item.title}|${item.url}`));
    (legacy.items || []).filter(item => item && item.createdByUser && validHttpUrl(item.url)).forEach(item => {
      const signature = `${item.name}|${item.url}`;
      if (!seen.has(signature)) current.push({id:`legacy-${item.id || Date.now()}`,title:item.name,url:item.url,detail:item.description || '',createdAt:new Date().toISOString()});
    });
    writeStorage(STORAGE.customLinks, current);
    writeStorage(STORAGE.migrated, {migratedAt:new Date().toISOString(),legacyPreserved:true});
  }
  function addCustomLink(event) {
    event.preventDefault();
    const titleInput = $('#customLinkTitle');
    const urlInput = $('#customLinkUrl');
    const detailInput = $('#customLinkDetail');
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();
    const detail = detailInput.value.trim();
    $('#customLinkTitleError').textContent = '';
    $('#customLinkUrlError').textContent = '';
    titleInput.setAttribute('aria-invalid', 'false');
    urlInput.setAttribute('aria-invalid', 'false');
    let valid = true;
    if (!title) { $('#customLinkTitleError').textContent = 'กรุณากรอกชื่องาน'; titleInput.setAttribute('aria-invalid', 'true'); valid = false; }
    if (!validHttpUrl(url)) { $('#customLinkUrlError').textContent = 'กรุณากรอก URL ที่ขึ้นต้นด้วย http:// หรือ https://'; urlInput.setAttribute('aria-invalid', 'true'); valid = false; }
    const list = readStorage(STORAGE.customLinks, []);
    if (list.some(item => item.url === url)) { $('#customLinkUrlError').textContent = 'มี URL นี้อยู่แล้ว'; urlInput.setAttribute('aria-invalid', 'true'); valid = false; }
    if (!valid) { showToast('ข้อมูลลิงก์ไม่ถูกต้อง', 'error'); return; }
    const id = `custom-link-${Date.now()}`;
    list.push({id,title,url,detail,createdAt:new Date().toISOString()});
    writeStorage(STORAGE.customLinks, list);
    event.currentTarget.reset();
    renderCustomLinks();
    updateLinkCards();
    requestAnimationFrame(() => root.querySelector(`[data-link-id="${id}"]`)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'center'}));
    showToast('เพิ่มลิงก์งานต่อจากข้อสุดท้ายแล้ว');
  }
  function renderCustomLinks() {
    const container = $('#linkTaskGrid');
    $$('.custom-link-card', container).forEach(card => card.remove());
    const list = readStorage(STORAGE.customLinks, []);
    const status = linkStatusData();
    list.forEach((item, index) => {
      const done = Boolean(status[item.id]);
      const card = create('article', {class:`wl7-card custom-link-card ${done ? 'completed' : ''}`,dataset:{linkId:item.id}});
      const head = create('div', {class:'wl7-card-head'});
      head.append(create('div', {class:'wl7-num'}, String(BUILTIN_LINKS.length + index + 1)));
      const titleWrap = create('div', {class:'wl7-copy'});
      titleWrap.append(create('h3', {}, item.title), create('small', {}, item.detail || 'ลิงก์งานที่เพิ่มเอง'));
      head.append(titleWrap, create('span', {class:`wl7-badge task-state ${done ? 'ok' : ''}`}, done ? 'เสร็จสิ้น' : 'รอดำเนินการ'));
      const body = create('div', {class:'wl7-card-body'});
      body.append(create('div', {class:'wl7-link-box'}, item.url));
      if (item.detail) body.append(create('p', {class:'wl7-note'}, item.detail));
      const foot = create('div', {class:'wl7-card-foot'});
      const open = create('a', {class:'wl7-btn primary',href:item.url,target:'_blank',rel:'noopener noreferrer'}, 'เปิดลิงก์');
      const copy = create('button', {type:'button',class:'wl7-btn'}, 'คัดลอกลิงก์');
      copy.addEventListener('click', () => copyToClipboard(item.url, 'คัดลอกลิงก์แล้ว'));
      const complete = create('button', {type:'button',class:'wl7-btn success complete-link'}, done ? 'ยกเลิกเสร็จ' : 'ทำเครื่องหมายเสร็จ');
      complete.addEventListener('click', () => toggleLinkComplete(item.id));
      const remove = create('button', {type:'button',class:'wl7-btn danger'}, 'ลบ');
      remove.addEventListener('click', () => {
        if (!window.confirm(`ต้องการลบ “${item.title}” หรือไม่`)) return;
        writeStorage(STORAGE.customLinks, readStorage(STORAGE.customLinks, []).filter(link => link.id !== item.id));
        const nextStatus = linkStatusData(); delete nextStatus[item.id]; writeStorage(STORAGE.linkStatus, nextStatus);
        renderCustomLinks(); updateLinkCards(); showToast('ลบลิงก์งานแล้ว');
      });
      foot.append(open, copy, complete, remove);
      card.append(head, body, foot);
      container.append(card);
    });
  }
  function bindEvents() {
    $$('.complete-link').forEach(button => button.addEventListener('click', () => toggleLinkComplete(button.dataset.linkId)));
    $$('.copy-url').forEach(button => button.addEventListener('click', () => copyToClipboard(button.dataset.url, 'คัดลอกลิงก์แล้ว')));
    $('#copyUih').addEventListener('click', () => copyToClipboard($('#uihPath').textContent, 'คัดลอก Path แล้ว'));
    $('#copyTemperatureReport').addEventListener('click', () => copyToClipboard($('#temperatureReport').value, 'คัดลอกข้อความอุณหภูมิแล้ว'));
    $('#customLinkForm').addEventListener('submit', addCustomLink);
    ['reportDateMode','reportDateStart','reportDateEnd','reportShift','incidentMode','attackCount','temp1','temp2','temp3'].forEach(id => {
      $(`#${id}`).addEventListener('input', () => {
        if (id === 'reportDateMode' || id === 'reportDateStart' || id === 'incidentMode') syncTemperatureControls(id === 'reportDateMode' || id === 'reportDateStart');
        writeStorage(STORAGE.temperature, temperatureData());
        updateTemperatureReport();
      });
    });
  }
  migrateLegacyCustomLinks();
  loadTemperatureSettings();
  syncTemperatureControls();
  renderCustomLinks();
  bindEvents();
  updateTemperatureReport();
  updateLinkCards();
})();
