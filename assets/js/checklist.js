import { getChecklists, getSettings, getWorkLinks, saveChecklists } from './storage.js';
import { buildButton, createId, emitDataChanged, formatDateTimeThai, formatThaiDate, todayIso } from './utils.js';
import { openInputModal, openModal } from './modal.js';
import { activateWorkLink, createWorkLinkAction } from './links.js';
import { showToast } from './toast.js';

let container;
let searchInput;

export function initChecklist() {
  container = document.getElementById('checklist-sections');
  searchInput = document.getElementById('checklist-search');
  document.getElementById('add-checklist-section').addEventListener('click', event => addSection(event.currentTarget));
  document.getElementById('reset-daily-checklist').addEventListener('click', resetDailyChecklist);
  searchInput.addEventListener('input', renderChecklist);
  document.getElementById('checklist-current-date').textContent = `วันที่ ${formatThaiDate(todayIso())}`;
  renderChecklist();
  window.addEventListener('nightNoc:route-changed', event => {
    if (event.detail.route === 'checklist') renderChecklist();
  });
  window.addEventListener('nightNoc:data-changed', event => {
    if (event.detail?.source === 'links' || event.detail?.source === 'links-import' || event.detail?.source === 'links-reset') renderChecklist();
  });
}

function addSection(opener) {
  openInputModal({
    title: 'เพิ่มหัวข้อ Checklist',
    label: 'ชื่อหัวข้อ',
    submitLabel: 'เพิ่มหัวข้อ',
    opener,
    onSubmit: title => {
      const data = getChecklists();
      data.sections.push({ id: createId('section'), title, items: [] });
      saveChecklists(data);
      renderChecklist();
      emitDataChanged({ source: 'checklist' });
      showToast('เพิ่มหัวข้อเรียบร้อยแล้ว');
    }
  });
}

function resetDailyChecklist() {
  if (!window.confirm('ยืนยัน Reset สถานะ Checklist ของวันนี้ทั้งหมดหรือไม่?')) return;
  const data = getChecklists();
  data.lastResetDate = todayIso();
  data.sections.forEach(section => section.items.forEach(item => {
    item.done = false;
    item.completedAt = null;
    item.completedBy = '';
  }));
  saveChecklists(data);
  renderChecklist();
  emitDataChanged({ source: 'checklist' });
  showToast('Reset Checklist ของวันนี้แล้ว');
}

function updateSummary(data) {
  const items = data.sections.flatMap(section => section.items);
  const done = items.filter(item => item.done).length;
  document.getElementById('checklist-summary').textContent = `${done} / ${items.length} เสร็จแล้ว`;
}

export function renderChecklist() {
  if (!container) return;
  const data = getChecklists();
  const query = searchInput.value.trim().toLocaleLowerCase('th-TH');
  container.replaceChildren();
  updateSummary(data);

  const filteredSections = data.sections.map(section => ({
    ...section,
    items: section.items.filter(item => !query || section.title.toLocaleLowerCase('th-TH').includes(query) || item.text.toLocaleLowerCase('th-TH').includes(query))
  })).filter(section => !query || section.items.length || section.title.toLocaleLowerCase('th-TH').includes(query));

  if (!filteredSections.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'ไม่พบ Checklist ที่ตรงกับคำค้นหา';
    container.append(empty);
    return;
  }

  filteredSections.forEach(section => container.append(buildSection(section)));
}

function buildSection(section) {
  const wrapper = document.createElement('section');
  wrapper.className = 'checklist-section';
  wrapper.dataset.sectionId = section.id;

  const header = document.createElement('header');
  header.className = 'checklist-section-header';
  const title = document.createElement('h3');
  title.textContent = section.title;
  const count = document.createElement('span');
  const doneCount = section.items.filter(item => item.done).length;
  count.className = 'status-badge status-info';
  count.textContent = `${doneCount}/${section.items.length}`;
  const edit = buildButton('แก้ไข', 'button button-ghost button-small');
  const remove = buildButton('ลบ', 'button button-danger-outline button-small');
  edit.setAttribute('aria-label', `แก้ไขหัวข้อ ${section.title}`);
  remove.setAttribute('aria-label', `ลบหัวข้อ ${section.title}`);
  edit.addEventListener('click', event => editSection(section.id, section.title, event.currentTarget));
  remove.addEventListener('click', () => deleteSection(section.id, section.title));
  header.append(title, count, edit, remove);

  const itemsWrap = document.createElement('div');
  itemsWrap.className = 'checklist-items';
  section.items.forEach(item => itemsWrap.append(buildItem(section.id, item)));

  const addRow = document.createElement('form');
  addRow.className = 'checklist-add-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.required = true;
  input.maxLength = 180;
  input.placeholder = 'เพิ่มรายการใหม่ แล้วกด Enter';
  input.setAttribute('aria-label', `เพิ่มรายการในหัวข้อ ${section.title}`);
  const addButton = buildButton('เพิ่มรายการ', 'button button-secondary');
  addButton.type = 'submit';
  addRow.append(input, addButton);
  addRow.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const data = getChecklists();
    const target = data.sections.find(value => value.id === section.id);
    if (!target) return;
    target.items.push({ id: createId('task'), text, done: false, completedAt: null, completedBy: '', linkRefs: [] });
    saveChecklists(data);
    input.value = '';
    renderChecklist();
    emitDataChanged({ source: 'checklist' });
    showToast('เพิ่มรายการ Checklist แล้ว');
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') input.value = '';
  });

  wrapper.append(header, itemsWrap, addRow);
  return wrapper;
}

function buildItem(sectionId, item) {
  const row = document.createElement('div');
  row.className = `checklist-item${item.done ? ' is-complete' : ''}`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = Boolean(item.done);
  checkbox.setAttribute('aria-label', `ทำเครื่องหมาย ${item.text}`);
  checkbox.addEventListener('change', () => toggleItem(sectionId, item.id, checkbox.checked));

  const main = document.createElement('div');
  main.className = 'checklist-item-main';
  const itemTitle = document.createElement('span');
  itemTitle.className = 'checklist-item-title';
  itemTitle.textContent = item.text;
  const meta = document.createElement('span');
  meta.className = 'checklist-item-meta';
  meta.textContent = item.done ? `เสร็จเมื่อ ${formatDateTimeThai(item.completedAt)}${item.completedBy ? ` โดย ${item.completedBy}` : ''}` : 'ยังไม่เสร็จ';
  main.append(itemTitle, meta);
  main.append(buildRelatedLinks(item));

  const actions = document.createElement('div');
  actions.className = 'checklist-actions';
  const linkSettings = buildButton('ลิงก์งาน', 'button button-secondary button-small');
  const edit = buildButton('แก้ไข', 'button button-ghost button-small');
  const up = buildButton('↑', 'button button-ghost button-small');
  const down = buildButton('↓', 'button button-ghost button-small');
  const remove = buildButton('ลบ', 'button button-danger-outline button-small');
  linkSettings.setAttribute('aria-label', `กำหนดลิงก์งานสำหรับ ${item.text}`);
  edit.setAttribute('aria-label', `แก้ไขรายการ ${item.text}`);
  up.setAttribute('aria-label', `เลื่อน ${item.text} ขึ้น`);
  down.setAttribute('aria-label', `เลื่อน ${item.text} ลง`);
  remove.setAttribute('aria-label', `ลบรายการ ${item.text}`);
  linkSettings.addEventListener('click', event => openChecklistLinksModal(sectionId, item.id, item.text, event.currentTarget));
  edit.addEventListener('click', event => editItem(sectionId, item.id, item.text, event.currentTarget));
  up.addEventListener('click', () => moveItem(sectionId, item.id, -1));
  down.addEventListener('click', () => moveItem(sectionId, item.id, 1));
  remove.addEventListener('click', () => deleteItem(sectionId, item.id, item.text));
  actions.append(linkSettings, edit, up, down, remove);
  row.append(checkbox, main, actions);
  return row;
}

function buildRelatedLinks(item) {
  const wrap = document.createElement('div');
  wrap.className = 'checklist-related-links';
  const refs = Array.isArray(item.linkRefs) ? item.linkRefs : [];
  if (!refs.length) {
    const empty = document.createElement('span');
    empty.className = 'muted';
    empty.textContent = 'ไม่มีลิงก์ที่เกี่ยวข้อง';
    wrap.append(empty);
    return wrap;
  }
  const links = getWorkLinks().items;
  refs.forEach(ref => {
    const link = links.find(itemLink => itemLink.id === ref);
    if (!link) return;
    const action = createWorkLinkAction(link, link.name);
    action.classList.add('checklist-link-action');
    wrap.append(action);
  });
  return wrap;
}

function openChecklistLinksModal(sectionId, itemId, itemText, opener) {
  const data = getChecklists();
  const item = data.sections.find(section => section.id === sectionId)?.items.find(value => value.id === itemId);
  if (!item) return;
  const selected = new Set(Array.isArray(item.linkRefs) ? item.linkRefs : []);
  const content = document.createElement('form');
  content.className = 'form-grid';
  const intro = document.createElement('p');
  intro.textContent = `เลือกลิงก์ที่เกี่ยวข้องกับ “${itemText}” การเปิดลิงก์จะไม่ทำเครื่องหมาย Checklist เสร็จอัตโนมัติ`;
  content.append(intro);

  const options = document.createElement('div');
  options.className = 'checklist-link-options';
  getWorkLinks().items.forEach(link => {
    const label = document.createElement('label');
    label.className = 'check-control checklist-link-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = link.id;
    checkbox.checked = selected.has(link.id);
    const text = document.createElement('span');
    text.textContent = link.name;
    label.append(checkbox, text);
    options.append(label);
  });
  content.append(options);

  const actions = document.createElement('div');
  actions.className = 'button-row';
  const save = buildButton('บันทึกลิงก์', 'button button-primary');
  save.type = 'submit';
  actions.append(save);
  content.append(actions);
  content.addEventListener('submit', event => {
    event.preventDefault();
    const latest = getChecklists();
    const target = latest.sections.find(section => section.id === sectionId)?.items.find(value => value.id === itemId);
    if (!target) return;
    target.linkRefs = [...options.querySelectorAll('input:checked')].map(input => input.value);
    saveChecklists(latest);
    renderChecklist();
    emitDataChanged({ source: 'checklist-links' });
    showToast('บันทึกลิงก์ที่เกี่ยวข้องแล้ว');
    document.getElementById('modal-close').click();
  });
  openModal({ title: 'เชื่อม Checklist กับลิงก์งาน', eyebrow: 'WORKFLOW INTEGRATION', content, opener });
}

function toggleItem(sectionId, itemId, done) {
  const data = getChecklists();
  const item = data.sections.find(section => section.id === sectionId)?.items.find(value => value.id === itemId);
  if (!item) return;
  const settings = getSettings();
  item.done = done;
  item.completedAt = done ? new Date().toISOString() : null;
  item.completedBy = done ? (settings.activeOperator || '') : '';
  saveChecklists(data);
  renderChecklist();
  emitDataChanged({ source: 'checklist' });
}

function editSection(sectionId, currentTitle, opener) {
  openInputModal({
    title: 'แก้ไขหัวข้อ Checklist', label: 'ชื่อหัวข้อ', value: currentTitle, opener,
    onSubmit: title => {
      const data = getChecklists();
      const section = data.sections.find(value => value.id === sectionId);
      if (!section) return;
      section.title = title;
      saveChecklists(data);
      renderChecklist();
      emitDataChanged({ source: 'checklist' });
    }
  });
}

function editItem(sectionId, itemId, currentText, opener) {
  openInputModal({
    title: 'แก้ไขรายการ Checklist', label: 'ชื่องาน', value: currentText, opener,
    onSubmit: text => {
      const data = getChecklists();
      const item = data.sections.find(section => section.id === sectionId)?.items.find(value => value.id === itemId);
      if (!item) return;
      item.text = text;
      saveChecklists(data);
      renderChecklist();
      emitDataChanged({ source: 'checklist' });
    }
  });
}

function deleteSection(sectionId, title) {
  if (!window.confirm(`ลบหัวข้อ “${title}” และรายการทั้งหมดหรือไม่?`)) return;
  const data = getChecklists();
  data.sections = data.sections.filter(section => section.id !== sectionId);
  saveChecklists(data);
  renderChecklist();
  emitDataChanged({ source: 'checklist' });
  showToast('ลบหัวข้อแล้ว');
}

function deleteItem(sectionId, itemId, text) {
  if (!window.confirm(`ลบรายการ “${text}” หรือไม่?`)) return;
  const data = getChecklists();
  const section = data.sections.find(value => value.id === sectionId);
  if (!section) return;
  section.items = section.items.filter(item => item.id !== itemId);
  saveChecklists(data);
  renderChecklist();
  emitDataChanged({ source: 'checklist' });
}

function moveItem(sectionId, itemId, direction) {
  const data = getChecklists();
  const section = data.sections.find(value => value.id === sectionId);
  if (!section) return;
  const currentIndex = section.items.findIndex(item => item.id === itemId);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= section.items.length) return;
  const [item] = section.items.splice(currentIndex, 1);
  section.items.splice(targetIndex, 0, item);
  saveChecklists(data);
  renderChecklist();
  emitDataChanged({ source: 'checklist' });
}
