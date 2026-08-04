# Night Shift NOC Operations Dashboard

เว็บ Static สำหรับเจ้าหน้าที่ NOC กะดึก ใช้จัดการ Workflow, Checklist, Work Links, NetFlow 14 จุด, Device Temperature, SMOC Attack Event, Report/Handover, History และ Settings โดยใช้ HTML5, CSS3, Vanilla JavaScript และ LocalStorage เท่านั้น

## เทคโนโลยี

- HTML5 / CSS3 / Vanilla JavaScript (ES Modules)
- LocalStorage พร้อม schema version เบื้องต้น
- ไม่มี Framework, Backend หรือฐานข้อมูลภายนอก
- รองรับ Vercel และ GitHub Pages ที่ `/ND1/`

## เปิดใช้งาน Local

ES Modules ควรเปิดผ่าน HTTP server ไม่ใช่ดับเบิลคลิก `index.html`

```bash
python -m http.server 8080
```

แล้วเปิด `http://localhost:8080/`

หรือใช้ Node.js:

```bash
npx serve .
```

## ตรวจโครงสร้างและข้อห้าม

```bash
npm test
```

คำสั่งนี้ตรวจไฟล์ที่จำเป็น, รูปแบบที่ห้ามใช้, LocalStorage defaults และการสร้างข้อความส่งมอบ

## Deploy บน Vercel

1. Import Repository เข้า Vercel
2. Framework Preset: **Other**
3. Build Command: เว้นว่าง
4. Output Directory: `.`
5. Deploy

โปรเจกต์ไม่มี Secret, Token หรือ Environment Variable

## Deploy บน GitHub Pages

1. Push โปรเจกต์ไป Repository ชื่อ `ND1`
2. เปิด **Settings → Pages**
3. Source เลือก **GitHub Actions**
4. Push เข้า branch `main`
5. Workflow `.github/workflows/deploy-pages.yml` จะ Deploy อัตโนมัติ
6. URL: `https://riptwosec-collab.github.io/ND1/`

Asset ทุกไฟล์ใช้ Relative Path และมี `404.html` สำหรับ SPA fallback

## Keyboard / Accessibility

- `Tab` / `Shift + Tab`: เลื่อน Focus
- `Enter`: ส่งฟอร์มเพิ่มหรือแก้ไขรายการ
- `Escape`: ปิด Modal, ปิด Mobile Sidebar หรือยกเลิกช่องเพิ่ม Checklist
- `Space`: ใช้งาน Button/Checkbox ตามมาตรฐาน Browser
- Modal มี Focus Trap และคืน Focus กลับปุ่มที่เปิด
- Toast ใช้ `aria-live`
- รองรับ `prefers-reduced-motion`

## LocalStorage Keys

- `nightNoc.checklists.v1`
- `nightNoc.links.v1`
- `nightNoc.reportDraft.v1`
- `nightNoc.reportHistory.v1`
- `nightNoc.settings.v1`
- `nightNoc.meta.v1`

## Known Limitations

- ข้อมูลอยู่ใน Browser/Device ปัจจุบัน ไม่ Sync ข้ามเครื่อง
- ลิงก์ระบบภายในอาจเปิดไม่ได้จากเครือข่ายภายนอกองค์กร
- Browser อาจบล็อก Popup หากผู้ใช้ตั้งค่าบล็อกหน้าต่างใหม่ แต่ระบบเปิดทีละลิงก์จากการกดของผู้ใช้
- Clipboard API บาง Browser ต้องใช้ HTTPS; มี fallback แบบปลอดภัยสำหรับ HTTP
- ไม่มี Backend จึงไม่มีสิทธิ์ผู้ใช้, Audit ส่วนกลาง หรือการทำงานหลายคนพร้อมกัน

## QA

ดูผลตรวจและรายงานแต่ละ Phase ที่ `QA_REPORT.md`
