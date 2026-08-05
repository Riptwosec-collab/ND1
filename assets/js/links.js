import {
  createDataBackup, getCategories, getLinkUsage, getNetflowStatus, getWorkLinks,
  saveCategories, saveLinkUsage, saveNetflowStatus, saveWorkLinks
} from './storage.js';
import {
  buildButton, copyText, createId, csvEscape, downloadTextFile, emitDataChanged,
  formatDateTimeThai, isValidHttpUrl
} from './utils.js';
import { openInputModal, openModal } from './modal.js';
import { showToast } from './toast.js';

export const NETFLOW_LINKS = [
  ['netflow-1', 'สำนักงานใหญ่ (HQ)', 'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3677'],
  ['netflow-2', 'ศูนย์คอมพิวเตอร์จังหวัดนนทบุรี (DR)', 'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3723'],
  ['netflow-3', 'PAK 1', 'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:7163'],
  ['netflow-4', 'PAK 2', 'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3843'],
  ['netflow-5', 'PAK 3', 'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3841'],
  ['netflow-6', 'PAK 4', 'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:2597'],
  ['netflow-7', 'PAK 5', 'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3853'],
  ['netflow-8', 'PAK 6', 'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3854'],
  ['netflow-9', 'PAK 7', 'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3855'],
  ['netflow-10', 'PAK 8', 'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3856'],
  ['netflow-11', 'PAK 9', 'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3861'],
  ['netflow-12', 'PAK 10', 'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3863'],
  ['netflow-13', 'PAK 11', 'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3865'],
  ['netflow-14', 'PAK 12', 'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3866']
];

let listNode;
let form;
let controls = {};

export function initLinks() {
  listNode = document.getElementById('links-list');
  form = document.getElementById('link-form');
  controls = {
    search: document.getElementById('link-search'),
    category: document.getElementById('link-category-filter'),
    favorite: document.getElementById('favorite-only'),
    sort: document.getElementById('link-sort')
  };

  Object.values(controls).forEach(control => {
    control.addEventListener(control.type === 'search' ? 'input' : 'change', renderLinks);
  });
  form.addEventListener('submit', handleFormSubmit);
  document.getElementById('link-cancel-edit').addEventListener('click', clearForm);
  document.getElementById('link-import-trigger').addEventListener('click', () => document.getElementById('link-import-file').click());
  document.getElementById('link-import-file').addEventListener('change', importLinksJson);
  document.getElementById('link-export-json').addEventListener('click', exportLinksJson);
  document.getElementById('link-export-csv').addEventListener('click', exportLinksCsv);
  document.getElementById('reset-user-links').addEventListener('click', resetUserLinks);
  document.getElementById('category-form').addEventListener('submit', addCategory);
  renderCategoryControls();
  renderCategoriesManager();
  renderLinks();

  window.addEventListener('nightNoc:route-changed', event => {
    if (event.detail.route === 'work-links') {
      renderCategoryControls();
      renderCategoriesManager();
      renderLinks();
    }
  });
}

function categoryMap() {
  return new Map(getCategories().items.map(category => [category.id, category]));
}

function usageFor(id) {
  const usage = getLinkUsage();
  return usage.items[id] || { openCount: 0, lastOpenedAt: null, pinned: false };
}

export function recordLinkUsage(linkId) {
  const usage = getLinkUsage();
  const current = usage.items[linkId] || { openCount: 0, lastOpenedAt: null, pinned: false };
  usage.items[linkId] = {
    ...current,
    openCount: Math.max(0, Number(current.openCount) || 0) + 1,
    lastOpenedAt: new Date().toISOString()
  };
  saveLinkUsage(usage);
  emitDataChanged({ source: 'link-usage', linkId });
}

export function togglePin(linkId) {
  const usage = getLinkUsage();
  const current = usage.items[linkId] || { openCount: 0, lastOpenedAt: null, pinned: false };
  usage.items[linkId] = { ...current, pinned: !current.pinned };
  saveLinkUsage(usage);
  renderLinks();
  emitDataChanged({ source: 'link-pin', linkId });
}

export function createWorkLinkAction(link, label = 'เปิด') {
  if (link.type === 'external') {
    const anchor = document.createElement('a');
    anchor.className = 'button button-primary button-small';
    anchor.textContent = label;
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.addEventListener('click', () => recordLinkUsage(link.id));
    return anchor;
  }
  const button = buildButton(link.type === 'netflow' ? 'เปิดรายการ NetFlow' : 'คัดลอก Path', 'button button-primary button-small');
  button.addEventListener('click', event => activateWorkLink(link.id, event.currentTarget));
  return button;
}

export async function activateWorkLink(linkId, opener = document.activeElement) {
  const link = getWorkLinks().items.find(item => item.id === linkId);
  if (!link) {
    showToast('ไม่พบลิงก์งานที่เลือก', 'error');
    return;
  }
  recordLinkUsage(link.id);
  if (link.type === 'netflow') {
    openNetflowModal(opener);
    return;
  }
  if (link.type === 'file-share') {
    try {
      await copyText(link.path);
      showToast('คัดลอก File Share Path แล้ว ให้วางใน File Explorer');
    } catch {
      showToast('ไม่สามารถคัดลอก File Share Path ได้', 'error');
    }
  }
}

export function renderLinks() {
  if (!listNode) return;
  const data = getWorkLinks();
  const categories = categoryMap();
  const usage = getLinkUsage().items;
  const query = controls.search.value.trim().toLocaleLowerCase('th-TH');
  const categoryId = controls.category.value;
  const favoriteOnly = controls.favorite.checked;
  const sort = controls.sort.value;

  const items = data.items.filter(item => {
    const category = categories.get(item.categoryId)?.name || '';
    const haystack = `${item.name} ${item.description} ${category} ${item.url} ${item.path}`.toLocaleLowerCase('th-TH');
    return (!query || haystack.includes(query))
      && (!categoryId || item.categoryId === categoryId)
      && (!favoriteOnly || item.favorite);
  });

  items.sort((a, b) => {
    const usageA = usage[a.id] || {};
    const usageB = usage[b.id] || {};
    if (sort === 'last-used') return String(usageB.lastOpenedAt || '').localeCompare(String(usageA.lastOpenedAt || ''));
    if (sort === 'most-used') return (Number(usageB.openCount) || 0) - (Number(usageA.openCount) || 0);
    if (sort === 'manual') return a.categoryId.localeCompare(b.categoryId) || (Number(a.order) || 0) - (Number(b.order) || 0);
    return a.name.localeCompare(b.name, 'th');
  });

  listNode.replaceChildren();
  document.getElementById('link-result-count').textContent = `${items.length} รายการ`;
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'ไม่พบลิงก์ที่ตรงกับเงื่อนไข';
    listNode.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach(item => fragment.append(buildLinkCard(item, categories.get(item.categoryId), usage[item.id])));
  listNode.append(fragment);
}

function buildLinkCard(item, category, usage = {}) {
  const card = document.createElement('article');
  card.className = 'link-card';
  card.dataset.linkId = item.id;

  const header = document.createElement('header');
  header.className = 'link-card-header';
  const icon = document.createElement('span');
  icon.className = 'link-icon';
  icon.textContent = item.icon || 'LINK';
  icon.setAttribute('aria-hidden', 'true');
  const titleWrap = document.createElement('div');
  const name = document.createElement('h3');
  name.textContent = item.name;
  const categoryLabel = document.createElement('span');
  categoryLabel.className = 'link-category-label';
  categoryLabel.textContent = category?.name || 'ไม่ระบุหมวด';
  titleWrap.append(name, categoryLabel);
  const favorite = buildButton(item.favorite ? '★' : '☆', 'icon-button link-favorite');
  favorite.classList.toggle('is-favorite', Boolean(item.favorite));
  favorite.setAttribute('aria-label', item.favorite ? `นำ ${item.name} ออกจาก Favorite` : `เพิ่ม ${item.name} เป็น Favorite`);
  favorite.setAttribute('aria-pressed', String(Boolean(item.favorite)));
  favorite.addEventListener('click', () => toggleFavorite(item.id));
  header.append(icon, titleWrap, favorite);

  const description = document.createElement('p');
  description.className = 'link-description';
  description.textContent = item.description || 'ไม่มีคำอธิบาย';

  const address = document.createElement('code');
  address.className = 'link-address';
  address.textContent = item.type === 'netflow' ? 'รายการ NetFlow 14 จุด' : item.type === 'file-share' ? item.path : item.url;

  const badges = document.createElement('div');
  badges.className = 'link-badges';
  badges.append(makeBadge(statusLabel(item.status), statusClass(item.status)));
  if (item.favorite) badges.append(makeBadge('Favorite', 'status-info'));
  if (usage.lastOpenedAt) badges.append(makeBadge('Recently Used', 'status-neutral'));
  if (item.requiresVpn) badges.append(makeBadge('Requires VPN', 'status-warning'));
  if (item.requiresLogin) badges.append(makeBadge('Requires Login', 'status-neutral'));
  if (usage.pinned) badges.append(makeBadge('Pinned', 'status-info'));

  const metrics = document.createElement('div');
  metrics.className = 'link-usage';
  const lastUsed = usage.lastOpenedAt ? formatDateTimeThai(usage.lastOpenedAt) : 'ยังไม่เคยเปิด';
  metrics.textContent = `เปิด ${Number(usage.openCount) || 0} ครั้ง · ล่าสุด ${lastUsed}`;

  const actions = document.createElement('div');
  actions.className = 'item-actions link-card-actions';
  actions.append(createWorkLinkAction(item));
  if (item.type === 'external') {
    const copy = buildButton('คัดลอก URL', 'button button-secondary button-small');
    copy.addEventListener('click', () => copyValue(item.url, 'คัดลอก URL แล้ว'));
    actions.append(copy);
  } else if (item.type === 'file-share') {
    const guide = buildButton('เปิดคู่มือ', 'button button-secondary button-small');
    const used = buildButton('ใช้งานแล้ว', 'button button-secondary button-small');
    guide.addEventListener('click', event => openFileShareGuide(item, event.currentTarget));
    used.addEventListener('click', () => { recordLinkUsage(item.id); showToast('บันทึกว่าใช้งาน File Share แล้ว'); renderLinks(); });
    actions.append(guide, used);
  }

  const pin = buildButton(usage.pinned ? 'Unpin' : 'Pin', 'button button-ghost button-small');
  pin.addEventListener('click', () => togglePin(item.id));
  const duplicate = buildButton('Duplicate', 'button button-ghost button-small');
  duplicate.addEventListener('click', () => duplicateLink(item));
  const edit = buildButton('แก้ไข', 'button button-ghost button-small');
  edit.addEventListener('click', () => beginEdit(item));
  const up = buildButton('↑', 'button button-ghost button-small');
  up.setAttribute('aria-label', `เลื่อน ${item.name} ขึ้น`);
  up.addEventListener('click', () => moveLink(item, -1));
  const down = buildButton('↓', 'button button-ghost button-small');
  down.setAttribute('aria-label', `เลื่อน ${item.name} ลง`);
  down.addEventListener('click', () => moveLink(item, 1));
  actions.append(pin, duplicate, edit, up, down);
  if (item.createdByUser) {
    const remove = buildButton('ลบ', 'button button-danger-outline button-small');
    remove.addEventListener('click', () => removeLink(item));
    actions.append(remove);
  }

  card.append(header, description, address, badges, metrics, actions);
  return card;
}

function makeBadge(label, className) {
  const badge = document.createElement('span');
  badge.className = `status-badge ${className}`;
  badge.textContent = label;
  return badge;
}

function statusLabel(status) {
  return { available: 'Available', internal: 'Internal', external: 'External' }[status] || 'Internal';
}

function statusClass(status) {
  return status === 'available' ? 'status-normal' : status === 'external' ? 'status-info' : 'status-neutral';
}

async function copyValue(value, successMessage) {
  try { await copyText(value); showToast(successMessage); }
  catch { showToast('ไม่สามารถคัดลอกข้อมูลได้', 'error'); }
}

function toggleFavorite(id) {
  const data = getWorkLinks();
  const item = data.items.find(value => value.id === id);
  if (!item) return;
  item.favorite = !item.favorite;
  saveWorkLinks(data);
  renderLinks();
  emitDataChanged({ source: 'links' });
}

function handleFormSubmit(event) {
  event.preventDefault();
  const id = document.getElementById('link-edit-id').value;
  const name = document.getElementById('link-name').value.trim();
  const description = document.getElementById('link-description').value.trim();
  const categoryId = document.getElementById('link-category').value;
  const url = document.getElementById('link-url').value.trim();
  const icon = document.getElementById('link-icon').value.trim().slice(0, 8) || 'LINK';
  const status = document.getElementById('link-status').value;
  const favorite = document.getElementById('link-favorite').checked;
  const requiresVpn = document.getElementById('link-requires-vpn').checked;
  const requiresLogin = document.getElementById('link-requires-login').checked;

  if (!name || !categoryId || !url || !isValidHttpUrl(url)) {
    showToast('กรุณากรอกชื่อ หมวดหมู่ และ URL แบบ http/https ให้ถูกต้อง', 'error');
    return;
  }
  const data = getWorkLinks();
  const duplicateUrl = data.items.find(item => item.id !== id && item.type === 'external' && item.url.toLocaleLowerCase('en-US') === url.toLocaleLowerCase('en-US'));
  if (duplicateUrl && !window.confirm(`URL นี้ซ้ำกับ “${duplicateUrl.name}” ต้องการบันทึกซ้ำหรือไม่?`)) return;

  if (id) {
    const item = data.items.find(value => value.id === id && value.type === 'external');
    if (!item) return;
    Object.assign(item, { name, description, categoryId, url, icon, status, favorite, requiresVpn, requiresLogin });
    showToast('แก้ไขลิงก์เรียบร้อยแล้ว');
  } else {
    const categoryItems = data.items.filter(item => item.categoryId === categoryId);
    data.items.push({
      id: createId('link'), name, description, categoryId, url, path: '', icon,
      type: 'external', status, favorite, requiresVpn, requiresLogin,
      createdByUser: true, order: categoryItems.length
    });
    showToast('เพิ่มลิงก์เรียบร้อยแล้ว');
  }
  saveWorkLinks(data);
  clearForm();
  renderLinks();
  emitDataChanged({ source: 'links' });
}

function beginEdit(item) {
  if (item.type !== 'external') {
    showToast('รายการระบบแก้ไขจากฟอร์มนี้ไม่ได้ เพื่อป้องกันข้อมูลสำคัญสูหาย', 'error');
    return;
  }
  document.getElementById('link-edit-id').value = item.id;
  document.getElementById('link-name').value = item.name;
  document.getElementById('link-description').value = item.description || '';
  document.getElementById('link-category').value = item.categoryId;
  document.getElementById('link-url').value = item.url;
  document.getElementById('link-icon').value = item.icon || 'LINK';
  document.getElementById('link-status').value = item.status || 'external';
  document.getElementById('link-favorite').checked = Boolean(item.favorite);
  document.getElementById('link-requires-vpn').checked = Boolean(item.requiresVpn);
  document.getElementById('link-requires-login').checked = Boolean(item.requiresLogin);
  document.getElementById('link-save-button').textContent = 'บันทึกการแก้ไข';
  document.getElementById('link-cancel-edit').hidden = false;
  document.getElementById('link-name').focus();
  document.getElementById('link-form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearForm() {
  form.reset();
  document.getElementById('link-edit-id').value = '';
  document.getElementById('link-save-button').textContent = 'เพิ่มลิงก์';
  document.getElementById('link-cancel-edit').hidden = true;
  populateCategorySelect(document.getElementById('link-category'));
}

function duplicateLink(item) {
  const data = getWorkLinks();
  const sameCategory = data.items.filter(value => value.categoryId === item.categoryId);
  data.items.push({
    ...JSON.parse(JSON.stringify(item)),
    id: createId('link'),
    name: `${item.name} (Copy)`,
    createdByUser: true,
    favorite: false,
    order: sameCategory.length
  });
  saveWorkLinks(data);
  renderLinks();
  emitDataChanged({ source: 'links' });
  showToast('Duplicate ลิงก์แล้ว');
}

function removeLink(item) {
  if (!item.createdByUser) return;
  if (!window.confirm(`ลบลิงก์ “${item.name}” หรือไม่?`)) return;
  const data = getWorkLinks();
  data.items = data.items.filter(value => value.id !== item.id);
  saveWorkLinks(data);
  const usage = getLinkUsage();
  delete usage.items[item.id];
  saveLinkUsage(usage);
  renderLinks();
  emitDataChanged({ source: 'links' });
  showToast('ลบลิงก์แล้ว');
}

function moveLink(item, direction) {
  const data = getWorkLinks();
  const categoryItems = data.items.filter(value => value.categoryId === item.categoryId).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const index = categoryItems.findIndex(value => value.id === item.id);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= categoryItems.length) return;
  const target = categoryItems[targetIndex];
  const currentOrder = Number(item.order) || index;
  item.order = Number(target.order) || targetIndex;
  target.order = currentOrder;
  saveWorkLinks(data);
  controls.sort.value = 'manual';
  renderLinks();
}

function renderCategoryControls() {
  populateCategorySelect(document.getElementById('link-category-filter'), true);
  populateCategorySelect(document.getElementById('link-category'));
}

function populateCategorySelect(select, includeAll = false) {
  const current = select.value;
  select.replaceChildren();
  if (includeAll) {
    const all = document.createElement('option');
    all.value = '';
    all.textContent = 'ทุกหมวดหมู่';
    select.append(all);
  }
  getCategories().items.sort((a, b) => a.order - b.order).forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    select.append(option);
  });
  if ([...select.options].some(option => option.value === current)) select.value = current;
}

function addCategory(event) {
  event.preventDefault();
  const input = document.getElementById('category-name');
  const name = input.value.trim();
  if (!name) return;
  const categories = getCategories();
  if (categories.items.some(item => item.name.toLocaleLowerCase('th-TH') === name.toLocaleLowerCase('th-TH'))) {
    showToast('มีหมวดหมู่นี้อยู่แล้ว', 'error');
    return;
  }
  categories.items.push({ id: createId('category'), name, order: categories.items.length, system: false });
  saveCategories(categories);
  input.value = '';
  renderCategoryControls();
  renderCategoriesManager();
  showToast('เพิ่มหมวดหมู่แล้ว');
}

function renderCategoriesManager() {
  const node = document.getElementById('category-manager-list');
  if (!node) return;
  const categories = getCategories();
  const links = getWorkLinks();
  node.replaceChildren();
  categories.items.sort((a, b) => a.order - b.order).forEach(category => {
    const row = document.createElement('div');
    row.className = 'category-manager-row';
    const text = document.createElement('span');
    const count = links.items.filter(item => item.categoryId === category.id).length;
    text.textContent = `${category.name} (${count})`;
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const edit = buildButton('แก้ชื่อ', 'button button-ghost button-small');
    edit.addEventListener('click', event => renameCategory(category, event.currentTarget));
    const remove = buildButton('ลบ', 'button button-danger-outline button-small');
    remove.disabled = count > 0;
    remove.title = count > 0 ? 'ย้ายหรือลบลิงก์ในหมวดนี้ก่อน' : '';
    remove.addEventListener('click', () => deleteCategory(category));
    actions.append(edit, remove);
    row.append(text, actions);
    node.append(row);
  });
}

function renameCategory(category, opener) {
  openInputModal({
    title: 'แก้ไขชื่อหมวดหมู่', label: 'ชื่อหมวดหมู่', value: category.name, opener,
    onSubmit: name => {
      const categories = getCategories();
      const target = categories.items.find(item => item.id === category.id);
      if (!target) return;
      if (categories.items.some(item => item.id !== target.id && item.name.toLocaleLowerCase('th-TH') === name.toLocaleLowerCase('th-TH'))) {
        showToast('มีหมวดหมู่นี้อยู่แล้ว', 'error');
        return;
      }
      target.name = name;
      saveCategories(categories);
      renderCategoryControls();
      renderCategoriesManager();
      renderLinks();
    }
  });
}

function deleteCategory(category) {
  const links = getWorkLinks();
  if (links.items.some(item => item.categoryId === category.id)) {
    showToast('ลบไม่ได้ เนื่องจากหมวดหมู่นี้ยังมีลิงก์อยู่', 'error');
    return;
  }
  if (!window.confirm(`ลบหมวดหมู่ “${category.name}” หรือไม่?`)) return;
  const categories = getCategories();
  categories.items = categories.items.filter(item => item.id !== category.id);
  saveCategories(categories);
  renderCategoryControls();
  renderCategoriesManager();
  renderLinks();
  showToast('ลบหมวดหมู่แล้ว');
}

function exportLinksJson() {
  const payload = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    categories: getCategories().items,
    links: getWorkLinks().items,
    usage: getLinkUsage().items
  };
  downloadTextFile(`night-noc-work-links-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  showToast('Export Work Links JSON แล้ว');
}

function exportLinksCsv() {
  const categories = categoryMap();
  const usage = getLinkUsage().items;
  const headers = ['ชื่อ', 'คำอธิบาย', 'หมวดหมู่', 'URL/Path', 'ประเภท', 'Favorite', 'เปิดล่าสุด', 'จำนวนครั้ง'];
  const rows = getWorkLinks().items.map(item => [
    item.name, item.description, categories.get(item.categoryId)?.name || '', item.url || item.path,
    item.type, item.favorite ? 'Yes' : 'No', usage[item.id]?.lastOpenedAt || '', usage[item.id]?.openCount || 0
  ]);
  const csv = `\uFEFF${[headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\r\n')}`;
  downloadTextFile(`night-noc-work-links-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
  showToast('Export Work Links CSV แล้ว');
}

async function importLinksJson(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || Number(parsed.schemaVersion) !== 2 || !Array.isArray(parsed.links) || !Array.isArray(parsed.categories)) {
      throw new Error('Schema ต้องเป็น Work Links v2');
    }
    if (!parsed.links.every(validateImportedLink) || !parsed.categories.every(validateImportedCategory)) {
      throw new Error('ข้อมูลลิงก์หรือหมวดหมู่ไม่ถูกต้อง');
    }
    createDataBackup('work-links-import');
    const currentCategories = getCategories();
    parsed.categories.forEach(category => {
      const existing = currentCategories.items.find(item => item.id === category.id);
      if (existing) Object.assign(existing, category);
      else currentCategories.items.push(category);
    });
    saveCategories(currentCategories);

    const currentLinks = getWorkLinks();
    parsed.links.forEach(link => {
      const existing = currentLinks.items.find(item => item.id === link.id);
      if (existing) Object.assign(existing, link);
      else currentLinks.items.push(link);
    });
    saveWorkLinks(currentLinks);
    if (parsed.usage && typeof parsed.usage === 'object') {
      const usage = getLinkUsage();
      Object.assign(usage.items, parsed.usage);
      saveLinkUsage(usage);
    }
    renderCategoryControls();
    renderCategoriesManager();
    renderLinks();
    emitDataChanged({ source: 'links-import' });
    showToast(`Import Work Links สำเร็จ ${parsed.links.length} รายการ`);
  } catch (error) {
    showToast(`Import ไม่สำเร็จ: ${error.message}`, 'error');
  }
}

function validateImportedLink(item) {
  if (!item || typeof item !== 'object' || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.categoryId !== 'string') return false;
  if (item.type === 'external') return typeof item.url === 'string' && isValidHttpUrl(item.url);
  return item.type === 'netflow' || item.type === 'file-share';
}

function validateImportedCategory(item) {
  return item && typeof item === 'object' && typeof item.id === 'string' && typeof item.name === 'string';
}

function resetUserLinks() {
  const data = getWorkLinks();
  const count = data.items.filter(item => item.createdByUser).length;
  if (!count) {
    showToast('ไม่มีลิงก์ที่ผู้ใช้เพิ่มเอง');
    return;
  }
  if (!window.confirm(`Reset ลิงก์ที่ผู้ใช้เพิ่มเอง ${count} รายการหรือไม่?`)) return;
  createDataBackup('reset-user-links');
  const removedIds = data.items.filter(item => item.createdByUser).map(item => item.id);
  data.items = data.items.filter(item => !item.createdByUser);
  saveWorkLinks(data);
  const usage = getLinkUsage();
  removedIds.forEach(id => delete usage.items[id]);
  saveLinkUsage(usage);
  renderLinks();
  renderCategoriesManager();
  emitDataChanged({ source: 'links-reset' });
  showToast('Reset ลิงก์ที่ผู้ใช้เพิ่มเองแล้ว');
}

function openFileShareGuide(item, opener) {
  const content = document.createElement('div');
  content.className = 'form-grid';
  const intro = document.createElement('p');
  intro.textContent = 'Browser ไม่สามารถเปิด Windows UNC Path ได้อย่างน่าเชื่อถือ กรุณาคัดลอก Path แล้ววางในแถบ Address ของ File Explorer';
  const code = document.createElement('code');
  code.className = 'path-code';
  code.textContent = item.path;
  const copy = buildButton('คัดลอก Path', 'button button-primary');
  copy.addEventListener('click', () => copyValue(item.path, 'คัดลอก Path แล้ว'));
  content.append(intro, code, copy);
  openModal({ title: 'คู่มือเปิด File Share', eyebrow: 'WINDOWS FILE EXPLORER', content, opener });
}

export function openNetflowModal(opener) {
  const state = getNetflowStatus();
  const list = document.createElement('div');
  list.className = 'modal-list netflow-check-list';

  NETFLOW_LINKS.forEach(([id, site, url]) => {
    const saved = state.items[id] || { checked: false, note: '', lastCheckedAt: null };
    const item = document.createElement('section');
    item.className = 'modal-list-item netflow-check-item';

    const main = document.createElement('div');
    main.className = 'item-main';
    const name = document.createElement('strong');
    name.textContent = site;
    const code = document.createElement('code');
    code.textContent = url;
    const last = document.createElement('span');
    last.className = 'muted';
    last.textContent = saved.lastCheckedAt ? `ตรวจล่าสุด ${formatDateTimeThai(saved.lastCheckedAt)}` : 'ยังไม่เคยตรวจ';
    main.append(name, code, last);

    const controlsWrap = document.createElement('div');
    controlsWrap.className = 'netflow-status-controls';
    const checkedLabel = document.createElement('label');
    checkedLabel.className = 'check-control';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(saved.checked);
    const checkText = document.createElement('span');
    checkText.textContent = 'ตรวจสอบแล้ว';
    checkedLabel.append(checkbox, checkText);
    const note = document.createElement('input');
    note.type = 'text';
    note.maxLength = 160;
    note.placeholder = 'หมายเหตุสั้น';
    note.value = saved.note || '';
    note.setAttribute('aria-label', `หมายเหตุ ${site}`);
    controlsWrap.append(checkedLabel, note);

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const open = document.createElement('a');
    open.className = 'button button-primary button-small';
    open.textContent = 'เปิด';
    open.href = url;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.addEventListener('click', () => recordLinkUsage('netflow-list'));
    const copy = buildButton('คัดลอก', 'button button-secondary button-small');
    copy.addEventListener('click', () => copyValue(url, `คัดลอกลิงก์ ${site} แล้ว`));
    actions.append(open, copy);

    const saveState = () => {
      const latest = getNetflowStatus();
      latest.items[id] = {
        checked: checkbox.checked,
        note: note.value.trim(),
        lastCheckedAt: checkbox.checked ? new Date().toISOString() : (latest.items[id]?.lastCheckedAt || null)
      };
      saveNetflowStatus(latest);
      saved.checked = checkbox.checked;
      saved.note = note.value.trim();
      saved.lastCheckedAt = latest.items[id].lastCheckedAt;
      last.textContent = saved.lastCheckedAt ? `ตรวจล่าสุด ${formatDateTimeThai(saved.lastCheckedAt)}` : 'ยังไม่เคยตรวจ';
      emitDataChanged({ source: 'netflow-status' });
    };
    checkbox.addEventListener('change', saveState);
    note.addEventListener('change', saveState);

    item.append(main, controlsWrap, actions);
    list.append(item);
  });
  openModal({ title: 'รายการ NetFlow 14 จุด', eyebrow: 'NETWORK MONITORING', content: list, opener });
}
