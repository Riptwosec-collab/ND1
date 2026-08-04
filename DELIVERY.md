# Delivery — Night Shift NOC Operations Dashboard

## รายชื่อไฟล์และหน้าที่

### Root
- `index.html` — โครงสร้าง SPA, Sidebar, 6 หน้า, Report Form, Modal และ Toast region
- `404.html` — GitHub Pages SPA fallback
- `.nojekyll` — ปิด Jekyll processing
- `package.json` — คำสั่ง Local Server และ Automated Tests
- `README.md` — วิธีใช้งานและ Deploy
- `QA_REPORT.md` — รายงานแต่ละ Phase, Test Checklist และ Known Limitations
- `DELIVERY.md` — เอกสารส่งมอบฉบับนี้

### CSS
- `assets/css/variables.css` — Design tokens, สี, spacing, radius และ theme accent
- `assets/css/base.css` — Reset, typography, form controls, focus และ reduced motion
- `assets/css/layout.css` — App shell, Sidebar, Topbar, grid/form layout
- `assets/css/components.css` — Button, panel, badge, modal, toast และ reusable components
- `assets/css/pages.css` — Dashboard, Checklist, Link, Report, History และ Settings styling
- `assets/css/responsive.css` — Desktop/tablet/mobile breakpoints

### JavaScript
- `assets/js/app.js` — Application bootstrap, clock, operator selector และ shell controls
- `assets/js/router.js` — Hash routing และ route persistence
- `assets/js/storage.js` — LocalStorage keys, defaults และ migration version
- `assets/js/utils.js` — Date, ID, Clipboard, URL validation, CSV และ download utilities
- `assets/js/modal.js` — Accessible modal, Focus Trap, Escape และ focus restoration
- `assets/js/toast.js` — `aria-live` toast notifications
- `assets/js/dashboard.js` — Dashboard metrics และ summaries
- `assets/js/checklist.js` — Checklist CRUD, reorder, reset และ completion metadata
- `assets/js/links.js` — Work Link CRUD/search/favorite และ NetFlow 14-site modal
- `assets/js/report.js` — Report Draft, SMOC, temperature, command popup และ handover message
- `assets/js/history.js` — History CRUD/filter/detail/import/export
- `assets/js/settings.js` — People, temperature thresholds, theme และ reset data

### Deployment / Assets / Tests
- `.github/workflows/deploy-pages.yml` — Deploy GitHub Pages เมื่อ Push เข้า `main`
- `assets/icons/noc-mark.svg` — NOC icon asset
- `scripts/serve.mjs` — Local static HTTP server
- `scripts/check-project.mjs` — Structure/security static checks
- `scripts/test-data.mjs` — LocalStorage defaults/persistence/handover generation tests
- `scripts/test-spec.mjs` — Specification assertions

## LocalStorage

- `nightNoc.checklists.v1` — หัวข้อ รายการ สถานะ เวลา และผู้ทำรายการ
- `nightNoc.links.v1` — Work Links และ Favorite
- `nightNoc.reportDraft.v1` — Report Draft และอุณหภูมิ
- `nightNoc.reportHistory.v1` — ประวัติรายงาน
- `nightNoc.settings.v1` — รายชื่อ เกณฑ์ Theme Sidebar Route และ Active Operator
- `nightNoc.meta.v1` — Schema migration version

## Keyboard Shortcut / Keyboard Behavior

- `Tab` / `Shift + Tab` — เปลี่ยน Focus
- `Enter` — บันทึกฟอร์มหรือเพิ่ม Checklist
- `Escape` — ปิด Modal, ปิด Mobile Drawer หรือยกเลิกช่องเพิ่ม Checklist
- `Space` — ใช้งานปุ่มและ Checkbox ตามมาตรฐาน Browser

## เปิดใช้งาน Local

```bash
npm start
```

เปิด `http://localhost:8080/`

ตรวจโปรเจกต์:

```bash
npm test
```

## Deploy Vercel

- Import Repository
- Framework Preset: `Other`
- Build Command: เว้นว่าง
- Output Directory: `.`
- Deploy

## Deploy GitHub Pages

- Repository: `ND1`
- Push เข้า `main`
- Settings → Pages → Source: `GitHub Actions`
- Workflow จะ Deploy ไปที่ `https://riptwosec-collab.github.io/ND1/`

## ผลทดสอบ

Automated checks ที่รันจริง:
- JavaScript syntax
- Required file structure
- Forbidden dynamic evaluation / `innerHTML` assignment
- Relative asset paths
- LocalStorage defaults and persistence
- Handover message generation
- Required routes, people, device data, NetFlow 14 URLs, command order and GitHub Actions versions
- Local static HTTP response

ผลละเอียดอยู่ใน `QA_REPORT.md` โดย Live GitHub Pages, Vercel, Internal Orion/SMOC และ visual browser QA ยังไม่ถูกอ้างว่าทดสอบผ่าน
