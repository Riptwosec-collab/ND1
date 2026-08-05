import { createId, todayIso } from './utils.js';

export const STORAGE_KEYS = Object.freeze({
  checklists: 'nightNoc.checklists.v2',
  workLinks: 'nightNoc.workLinks.v2',
  categories: 'nightNoc.workLinkCategories.v2',
  linkUsage: 'nightNoc.linkUsage.v2',
  netflowStatus: 'nightNoc.netflowStatus.v2',
  reportDraft: 'nightNoc.reportDraft.v2',
  reportHistory: 'nightNoc.reportHistory.v2',
  settings: 'nightNoc.settings.v2',
  currentRoute: 'nightNoc.currentRoute.v2',
  meta: 'nightNoc.meta.v2',
  migrationBackup: 'nightNoc.migrationBackup.v1',
  resetBackup: 'nightNoc.resetBackup.v2'
});

export const LEGACY_KEYS = Object.freeze({
  checklists: 'nightNoc.checklists.v1',
  links: 'nightNoc.links.v1',
  reportDraft: 'nightNoc.reportDraft.v1',
  reportHistory: 'nightNoc.reportHistory.v1',
  settings: 'nightNoc.settings.v1',
  meta: 'nightNoc.meta.v1'
});

const DEFAULT_PEOPLE = [
  'นายนลิทัศน์ นากรณ์',
  'นายกิตติ ยอดนนท์',
  'นายดรีมดนัย ศิริมาตย์',
  'นายวัชระ ภูเกิด',
  'นายสถิตย์ พันธ์แตง',
  'นายเสถียร มาสา',
  'นายพัชร สันต์พลี',
  'นายอิศเรศ เวียงอินทร์'
];

const DEFAULT_DEVICES = [
  { id: 'device-1', name: 'IT05-C3750X-Intra-Inter', ip: '10.1.100.3', description: 'System Temperature Value', command: 'sh env temperature status', value: '' },
  { id: 'device-2', name: 'IT06-C9500-CSW1-A01', ip: '10.1.100.1', description: 'FL6-Rack A01 Temperature', command: 'sh env temperature', value: '' },
  { id: 'device-3', name: 'IT06-C9500-CSW2-A02', ip: '10.1.100.2', description: 'FL6-Rack A02 Temperature', command: 'sh env temperature', value: '' }
];

const DEFAULT_CATEGORIES = [
  ['monitoring', 'Monitoring'],
  ['network', 'Network'],
  ['netflow', 'NetFlow'],
  ['security', 'Security'],
  ['email-smoc', 'Email และ SMOC'],
  ['report', 'Report'],
  ['file-share', 'File Share'],
  ['router-switch', 'Router และ Switch'],
  ['server-internal', 'Server และระบบภายใน'],
  ['daily-tools', 'เครื่องมือที่ใช้ประจำ'],
  ['user-added', 'ลิงก์ที่ผู้ใช้เพิ่มเอง']
].map(([id, name], order) => ({ id, name, order, system: true }));

const DEFAULT_WORK_LINKS = [
  {
    id: 'netflow-list',
    name: 'ตรวจสอบกราฟ NetFlow',
    description: 'เปิดรายการกราฟ NetFlow ของ HQ, DR และ PAK รวม 14 จุด',
    categoryId: 'netflow',
    url: '',
    path: '',
    icon: 'NET',
    type: 'netflow',
    status: 'internal',
    favorite: true,
    requiresVpn: true,
    requiresLogin: true,
    createdByUser: false,
    order: 0
  },
  {
    id: 'file-share-report',
    name: 'รายงานประจำวัน',
    description: 'คัดลอก UNC Path แล้วเปิดด้วย Windows File Explorer',
    categoryId: 'file-share',
    url: '',
    path: String.raw`\\10.1.1.94\share noc\รายงานประจำวัน`,
    icon: 'FS',
    type: 'file-share',
    status: 'internal',
    favorite: true,
    requiresVpn: true,
    requiresLogin: true,
    createdByUser: false,
    order: 0
  }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeParse(raw, fallback) {
  try { return raw ? JSON.parse(raw) : clone(fallback); }
  catch { return clone(fallback); }
}

function read(key, fallback) {
  try { return safeParse(localStorage.getItem(key), fallback); }
  catch { return clone(fallback); }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function slugifyCategory(value) {
  const normalized = String(value || '').trim().toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9ก-๙]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || createId('category');
}

export function defaultChecklists() {
  return {
    schemaVersion: 2,
    lastResetDate: todayIso(),
    sections: [
      {
        id: createId('section'),
        title: 'ตรวจสอบระบบเครือข่ายและอุปกรณ์',
        items: [
          { id: createId('task'), text: 'ตรวจสอบอุณหภูมิอุปกรณ์ทั้ง 3 ตัว', done: false, completedAt: null, completedBy: '', linkRefs: [] },
          { id: createId('task'), text: 'ตรวจสอบสถานะ Service และเว็บไซต์สรรพากร', done: false, completedAt: null, completedBy: '', linkRefs: [] },
          { id: createId('task'), text: 'ตรวจสอบ Backup Internet และเส้นทางสำรอง', done: false, completedAt: null, completedBy: '', linkRefs: [] }
        ]
      },
      {
        id: createId('section'),
        title: 'Monitoring และ Security',
        items: [
          { id: createId('task'), text: 'ตรวจสอบ Email เหตุการณ์โจมตีจาก SMOC', done: false, completedAt: null, completedBy: '', linkRefs: [] },
          { id: createId('task'), text: 'ตรวจสอบกราฟ NetFlow ทั้ง 14 จุด', done: false, completedAt: null, completedBy: '', linkRefs: ['netflow-list'] },
          { id: createId('task'), text: 'ตรวจสอบ NetFlow และบันทึก Peak ที่ผิดปกติ', done: false, completedAt: null, completedBy: '', linkRefs: ['netflow-list'] }
        ]
      },
      {
        id: createId('section'),
        title: 'รายงานและส่งมอบ',
        items: [
          { id: createId('task'), text: 'จัดทำรายงานประจำวัน', done: false, completedAt: null, completedBy: '', linkRefs: ['file-share-report'] },
          { id: createId('task'), text: 'บันทึกงานค้างและข้อมูลที่ต้องติดตาม', done: false, completedAt: null, completedBy: '', linkRefs: [] },
          { id: createId('task'), text: 'สร้างข้อความและส่งมอบกะ', done: false, completedAt: null, completedBy: '', linkRefs: [] }
        ]
      }
    ]
  };
}

export function defaultWorkLinks() {
  return { schemaVersion: 2, items: clone(DEFAULT_WORK_LINKS) };
}

export function defaultCategories() {
  return { schemaVersion: 2, items: clone(DEFAULT_CATEGORIES) };
}

export function defaultLinkUsage() {
  const items = {};
  DEFAULT_WORK_LINKS.forEach(link => {
    items[link.id] = { openCount: 0, lastOpenedAt: null, pinned: false };
  });
  return { schemaVersion: 2, items };
}

export function defaultNetflowStatus() {
  const items = {};
  for (let index = 1; index <= 14; index += 1) {
    items[`netflow-${index}`] = { checked: false, note: '', lastCheckedAt: null };
  }
  return { schemaVersion: 2, items };
}

export function defaultReportDraft() {
  return {
    schemaVersion: 2,
    historyId: '',
    rangeType: 'daily',
    startDate: todayIso(),
    endDate: todayIso(),
    timeWindow: '06.00 - 20.30 น.',
    attackResult: 'normal',
    attackCount: 0,
    attackOther: '',
    temperatures: clone(DEFAULT_DEVICES),
    note: '',
    sender: '',
    receiver: '',
    status: 'draft',
    completedAt: null,
    updatedAt: new Date().toISOString()
  };
}

export function defaultSettings() {
  return {
    schemaVersion: 2,
    people: clone(DEFAULT_PEOPLE),
    warningThreshold: 45,
    criticalThreshold: 55,
    accent: 'cyan',
    compactDensity: false,
    sidebarCollapsed: false,
    activeOperator: ''
  };
}

function normalizeChecklistData(value) {
  const fallback = defaultChecklists();
  if (!value || !Array.isArray(value.sections)) return fallback;
  return {
    schemaVersion: 2,
    lastResetDate: typeof value.lastResetDate === 'string' ? value.lastResetDate : todayIso(),
    sections: value.sections.filter(section => section && typeof section.title === 'string').map(section => ({
      id: typeof section.id === 'string' ? section.id : createId('section'),
      title: section.title.trim() || 'หัวข้อ Checklist',
      items: Array.isArray(section.items) ? section.items.filter(item => item && typeof item.text === 'string').map(item => {
        const inferred = [];
        if (/netflow/i.test(item.text)) inferred.push('netflow-list');
        if (/รายงานประจำวัน/.test(item.text)) inferred.push('file-share-report');
        return {
          id: typeof item.id === 'string' ? item.id : createId('task'),
          text: item.text,
          done: Boolean(item.done),
          completedAt: item.completedAt || null,
          completedBy: typeof item.completedBy === 'string' ? item.completedBy : '',
          linkRefs: Array.isArray(item.linkRefs) ? [...new Set(item.linkRefs.filter(ref => typeof ref === 'string'))] : inferred
        };
      }) : []
    }))
  };
}

function normalizeCategories(value, legacyLinks = []) {
  const categories = clone(DEFAULT_CATEGORIES);
  const names = new Set(categories.map(item => item.name.toLocaleLowerCase('th-TH')));
  const input = Array.isArray(value?.items) ? value.items : [];
  const legacyNames = legacyLinks.map(item => item?.category).filter(name => typeof name === 'string' && name.trim());
  [...input, ...legacyNames.map(name => ({ name }))].forEach(item => {
    const name = String(item?.name || '').trim();
    if (!name || names.has(name.toLocaleLowerCase('th-TH'))) return;
    let id = typeof item.id === 'string' && item.id ? item.id : slugifyCategory(name);
    while (categories.some(category => category.id === id)) id = `${id}-${categories.length + 1}`;
    categories.push({ id, name, order: categories.length, system: Boolean(item.system) });
    names.add(name.toLocaleLowerCase('th-TH'));
  });
  return { schemaVersion: 2, items: categories };
}

function normalizeWorkLinks(value, categories) {
  const source = Array.isArray(value?.items) ? value.items : [];
  const byId = new Map(DEFAULT_WORK_LINKS.map(item => [item.id, clone(item)]));
  const categoryByName = new Map(categories.items.map(item => [item.name.toLocaleLowerCase('th-TH'), item.id]));
  source.forEach((item, index) => {
    if (!item || typeof item.name !== 'string') return;
    const existing = byId.get(item.id);
    const categoryId = categories.items.some(category => category.id === item.categoryId)
      ? item.categoryId
      : categoryByName.get(String(item.category || '').toLocaleLowerCase('th-TH')) || 'user-added';
    const type = item.type === 'netflow' || item.type === 'file-share' ? item.type : 'external';
    const normalized = {
      id: typeof item.id === 'string' && item.id ? item.id : createId('link'),
      name: item.name.trim() || 'ลิงก์งาน',
      description: typeof item.description === 'string' ? item.description : '',
      categoryId,
      url: typeof item.url === 'string' ? item.url.trim() : '',
      path: typeof item.path === 'string' ? item.path : '',
      icon: typeof item.icon === 'string' && item.icon ? item.icon : 'LINK',
      type,
      status: ['available', 'internal', 'external'].includes(item.status) ? item.status : (type === 'external' ? 'external' : 'internal'),
      favorite: Boolean(item.favorite),
      requiresVpn: Boolean(item.requiresVpn),
      requiresLogin: Boolean(item.requiresLogin),
      createdByUser: item.createdByUser !== undefined ? Boolean(item.createdByUser) : item.type !== 'netflow',
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index
    };
    byId.set(normalized.id, existing ? { ...existing, ...normalized, createdByUser: existing.createdByUser && normalized.createdByUser } : normalized);
  });
  return { schemaVersion: 2, items: [...byId.values()] };
}

function normalizeUsage(value, links) {
  const source = value && typeof value.items === 'object' && !Array.isArray(value.items) ? value.items : {};
  const items = {};
  links.items.forEach(link => {
    const current = source[link.id] || {};
    items[link.id] = {
      openCount: Math.max(0, Number(current.openCount) || 0),
      lastOpenedAt: typeof current.lastOpenedAt === 'string' ? current.lastOpenedAt : null,
      pinned: Boolean(current.pinned)
    };
  });
  return { schemaVersion: 2, items };
}

function normalizeReport(value) {
  const fallback = defaultReportDraft();
  if (!value || typeof value !== 'object') return fallback;
  const temperatures = Array.isArray(value.temperatures) && value.temperatures.length === 3
    ? value.temperatures.map((device, index) => ({ ...fallback.temperatures[index], ...device }))
    : fallback.temperatures;
  return { ...fallback, ...value, schemaVersion: 2, temperatures };
}

function normalizeHistory(value) {
  const items = Array.isArray(value?.items) ? value.items : [];
  return { schemaVersion: 2, items: items.map(item => ({ ...item, schemaVersion: 2 })) };
}

function normalizeSettings(value) {
  const fallback = defaultSettings();
  if (!value || typeof value !== 'object') return fallback;
  const people = Array.isArray(value.people) && value.people.length
    ? [...new Set(value.people.filter(person => typeof person === 'string' && person.trim()).map(person => person.trim()))]
    : fallback.people;
  const warningThreshold = Number(value.warningThreshold);
  const criticalThreshold = Number(value.criticalThreshold);
  return {
    ...fallback,
    ...value,
    schemaVersion: 2,
    people,
    warningThreshold: Number.isFinite(warningThreshold) ? warningThreshold : 45,
    criticalThreshold: Number.isFinite(criticalThreshold) ? criticalThreshold : 55
  };
}

function snapshotKeys(keys) {
  const data = {};
  keys.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw !== null) data[key] = raw;
  });
  return data;
}

function migrateToV2() {
  if (!localStorage.getItem(STORAGE_KEYS.migrationBackup)) {
    write(STORAGE_KEYS.migrationBackup, {
      createdAt: new Date().toISOString(),
      sourceVersion: 1,
      data: snapshotKeys(Object.values(LEGACY_KEYS))
    });
  }

  const legacyChecklists = read(LEGACY_KEYS.checklists, defaultChecklists());
  const legacyLinks = read(LEGACY_KEYS.links, { items: [] });
  const categories = normalizeCategories(read(STORAGE_KEYS.categories, null), legacyLinks.items || []);
  const links = normalizeWorkLinks(read(STORAGE_KEYS.workLinks, legacyLinks), categories);
  const legacySettings = read(LEGACY_KEYS.settings, defaultSettings());
  const legacyRoute = String(legacySettings.currentRoute || 'dashboard');

  write(STORAGE_KEYS.checklists, normalizeChecklistData(read(STORAGE_KEYS.checklists, legacyChecklists)));
  write(STORAGE_KEYS.categories, categories);
  write(STORAGE_KEYS.workLinks, links);
  write(STORAGE_KEYS.linkUsage, normalizeUsage(read(STORAGE_KEYS.linkUsage, null), links));
  write(STORAGE_KEYS.netflowStatus, read(STORAGE_KEYS.netflowStatus, defaultNetflowStatus()));
  write(STORAGE_KEYS.reportDraft, normalizeReport(read(STORAGE_KEYS.reportDraft, read(LEGACY_KEYS.reportDraft, defaultReportDraft()))));
  write(STORAGE_KEYS.reportHistory, normalizeHistory(read(STORAGE_KEYS.reportHistory, read(LEGACY_KEYS.reportHistory, { items: [] }))));
  write(STORAGE_KEYS.settings, normalizeSettings(read(STORAGE_KEYS.settings, legacySettings)));
  write(STORAGE_KEYS.currentRoute, legacyRoute === 'links' ? 'work-links' : legacyRoute);
  write(STORAGE_KEYS.meta, { schemaVersion: 2, migratedAt: new Date().toISOString(), legacyPreserved: true });
}

function ensureDefaults() {
  if (!localStorage.getItem(STORAGE_KEYS.checklists)) write(STORAGE_KEYS.checklists, defaultChecklists());
  const categories = normalizeCategories(read(STORAGE_KEYS.categories, defaultCategories()));
  write(STORAGE_KEYS.categories, categories);
  const links = normalizeWorkLinks(read(STORAGE_KEYS.workLinks, defaultWorkLinks()), categories);
  write(STORAGE_KEYS.workLinks, links);
  write(STORAGE_KEYS.linkUsage, normalizeUsage(read(STORAGE_KEYS.linkUsage, defaultLinkUsage()), links));
  if (!localStorage.getItem(STORAGE_KEYS.netflowStatus)) write(STORAGE_KEYS.netflowStatus, defaultNetflowStatus());
  if (!localStorage.getItem(STORAGE_KEYS.reportDraft)) write(STORAGE_KEYS.reportDraft, defaultReportDraft());
  if (!localStorage.getItem(STORAGE_KEYS.reportHistory)) write(STORAGE_KEYS.reportHistory, { schemaVersion: 2, items: [] });
  if (!localStorage.getItem(STORAGE_KEYS.settings)) write(STORAGE_KEYS.settings, defaultSettings());
  if (!localStorage.getItem(STORAGE_KEYS.currentRoute)) write(STORAGE_KEYS.currentRoute, 'dashboard');
}

export function initStorage() {
  const meta = read(STORAGE_KEYS.meta, { schemaVersion: 0 });
  if (Number(meta.schemaVersion) < 2) migrateToV2();
  ensureDefaults();
}

export const getChecklists = () => normalizeChecklistData(read(STORAGE_KEYS.checklists, defaultChecklists()));
export const saveChecklists = value => write(STORAGE_KEYS.checklists, normalizeChecklistData(value));
export const getCategories = () => normalizeCategories(read(STORAGE_KEYS.categories, defaultCategories()));
export const saveCategories = value => write(STORAGE_KEYS.categories, normalizeCategories(value));
export const getWorkLinks = () => normalizeWorkLinks(read(STORAGE_KEYS.workLinks, defaultWorkLinks()), getCategories());
export const saveWorkLinks = value => write(STORAGE_KEYS.workLinks, normalizeWorkLinks(value, getCategories()));
export const getLinks = getWorkLinks;
export const saveLinks = saveWorkLinks;
export const getLinkUsage = () => normalizeUsage(read(STORAGE_KEYS.linkUsage, defaultLinkUsage()), getWorkLinks());
export const saveLinkUsage = value => write(STORAGE_KEYS.linkUsage, normalizeUsage(value, getWorkLinks()));
export const getNetflowStatus = () => {
  const current = read(STORAGE_KEYS.netflowStatus, defaultNetflowStatus());
  const defaults = defaultNetflowStatus();
  Object.keys(defaults.items).forEach(id => {
    const value = current?.items?.[id] || {};
    defaults.items[id] = {
      checked: Boolean(value.checked),
      note: typeof value.note === 'string' ? value.note.slice(0, 160) : '',
      lastCheckedAt: typeof value.lastCheckedAt === 'string' ? value.lastCheckedAt : null
    };
  });
  return defaults;
};
export const saveNetflowStatus = value => write(STORAGE_KEYS.netflowStatus, { schemaVersion: 2, items: value?.items || {} });
export const getReportDraft = () => normalizeReport(read(STORAGE_KEYS.reportDraft, defaultReportDraft()));
export const saveReportDraft = value => write(STORAGE_KEYS.reportDraft, normalizeReport(value));
export const getHistory = () => normalizeHistory(read(STORAGE_KEYS.reportHistory, { schemaVersion: 2, items: [] }));
export const saveHistory = value => write(STORAGE_KEYS.reportHistory, normalizeHistory(value));
export const getSettings = () => normalizeSettings(read(STORAGE_KEYS.settings, defaultSettings()));
export const saveSettings = value => write(STORAGE_KEYS.settings, normalizeSettings(value));
export const getCurrentRoute = () => String(read(STORAGE_KEYS.currentRoute, 'dashboard'));
export const saveCurrentRoute = route => write(STORAGE_KEYS.currentRoute, String(route || 'dashboard'));

export function createDataBackup(reason = 'manual') {
  const backup = {
    schemaVersion: 2,
    createdAt: new Date().toISOString(),
    reason,
    data: snapshotKeys([
      STORAGE_KEYS.checklists, STORAGE_KEYS.workLinks, STORAGE_KEYS.categories,
      STORAGE_KEYS.linkUsage, STORAGE_KEYS.netflowStatus, STORAGE_KEYS.reportDraft,
      STORAGE_KEYS.reportHistory, STORAGE_KEYS.settings, STORAGE_KEYS.currentRoute
    ])
  };
  write(STORAGE_KEYS.resetBackup, backup);
  return backup;
}

export function resetAllData() {
  createDataBackup('reset-all');
  [
    STORAGE_KEYS.checklists, STORAGE_KEYS.workLinks, STORAGE_KEYS.categories,
    STORAGE_KEYS.linkUsage, STORAGE_KEYS.netflowStatus, STORAGE_KEYS.reportDraft,
    STORAGE_KEYS.reportHistory, STORAGE_KEYS.settings, STORAGE_KEYS.currentRoute
  ].forEach(key => localStorage.removeItem(key));
  write(STORAGE_KEYS.meta, { schemaVersion: 2, resetAt: new Date().toISOString(), legacyPreserved: true });
  ensureDefaults();
}

export function getDefaultDevices() {
  return clone(DEFAULT_DEVICES);
}
