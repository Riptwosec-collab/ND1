import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.PROJECT_ROOT ? resolve(process.env.PROJECT_ROOT) : fileURLToPath(new URL('../', import.meta.url));
const sourceDir = join(root, 'source');
const outputDir = join(root, 'dist');
const partNames = (await readdir(sourceDir)).filter(name => /^index\.part\d+\.html$/.test(name)).sort((a,b)=>a.localeCompare(b,'en'));
if (!partNames.length) throw new Error('No direct index source parts found');
let index = (await Promise.all(partNames.map(name => readFile(join(sourceDir,name),'utf8')))).join('');

function removeRange(startMarker,endMarker){const start=index.indexOf(startMarker);if(start<0)return;const end=index.indexOf(endMarker,start);if(end<0)throw new Error(`Unable to remove section: ${startMarker}`);index=index.slice(0,start)+index.slice(end);}
function replaceRange(startMarker,endMarker,replacement){const start=index.indexOf(startMarker);const end=index.indexOf(endMarker,start);if(start<0||end<0)throw new Error(`Unable to replace section: ${startMarker}`);index=index.slice(0,start)+replacement+index.slice(end);}

const checklistMarkup = `        <section class="page" id="page-checklist" data-route="checklist" aria-labelledby="checklist-heading" hidden>
          <div class="tc-head"><div><p class="eyebrow">NIGHT SHIFT CHECKLIST V7</p><h2 id="checklist-heading">เช็กลิสต์กะดึก</h2><p>ติ๊กงาน บันทึกเวลา แก้ไข เพิ่มหมายเหตุ และเพิ่มหัวข้อแยกตามหมวด</p></div><div class="button-row"><button class="tc-btn success" id="tcCheckAll" type="button">ติ๊กทั้งหมดทุกหมวด</button><button class="tc-btn danger" id="tcClearAll" type="button">ล้างทั้งหมด</button></div></div>
          <div class="tc-layout"><div class="tc-categories" id="tcCheckCategories"></div><aside class="tc-card tc-sticky"><div class="tc-panel-head"><h3>สรุปเช็กลิสต์</h3><span class="tc-badge" id="tcCheckPercent">0%</span></div><div class="tc-panel-body"><div class="tc-circle" id="tcCheckCircle"><strong>0%</strong></div><div class="tc-progress"><span id="tcCheckProgress"></span></div><div class="tc-stats"><div class="tc-stat"><small>ทั้งหมด</small><strong id="tcCheckTotal">0</strong></div><div class="tc-stat"><small>เสร็จแล้ว</small><strong id="tcCheckDone">0</strong></div><div class="tc-stat"><small>คงเหลือ</small><strong id="tcCheckRemain">0</strong></div></div><form class="tc-form" id="tcChecklistForm" novalidate><h3>เพิ่มหัวข้อเช็กลิสต์</h3><div class="tc-field"><label for="tcCheckGroup">หมวด</label><select class="tc-select" id="tcCheckGroup"></select></div><div class="tc-field"><label for="tcCheckTitle">ข้อความหัวข้อ</label><input class="tc-input" id="tcCheckTitle" maxlength="180" required><p class="tc-error" id="tcCheckError"></p></div><button class="tc-btn primary" type="submit">เพิ่มหัวข้อ</button></form><div class="tc-shift"><strong>เวลากะดึก</strong><span>20:30 – 08:30</span><div class="tc-countdown" id="tcCountdown">--:--:--</div></div></div></aside></div>
        </section>

`;

const todoMarkup = `        <section class="page" id="page-todo-v7" data-route="todo" aria-labelledby="todo-heading" hidden>
          <div class="tc-head"><div><p class="eyebrow">NIGHT SHIFT TASKS V7</p><h2 id="todo-heading">งานที่ต้องทำ</h2><p>รายการงานหลักของกะดึก สามารถเพิ่ม แก้ไข และลบได้ โดยบันทึกใน LocalStorage</p></div><div class="button-row"><button class="tc-btn" id="tcRestoreTodo" type="button">คืนรายการเริ่มต้น</button><span class="tc-badge" id="tcTodoCount">0 รายการ</span></div></div>
          <div class="tc-layout"><div class="tc-list" id="tcTodoList"></div><aside class="tc-card tc-sticky"><div class="tc-panel-head"><h3>เพิ่มสิ่งที่ต้องทำ</h3></div><form class="tc-form tc-panel-body" id="tcTodoForm" novalidate><div class="tc-field"><label for="tcTodoTitle">หัวข้องาน</label><input class="tc-input" id="tcTodoTitle" maxlength="120" required><p class="tc-error" id="tcTodoError"></p></div><div class="tc-field"><label for="tcTodoDetail">รายละเอียด</label><textarea class="tc-textarea" id="tcTodoDetail" maxlength="600"></textarea></div><button class="tc-btn primary" type="submit">เพิ่มรายการ</button></form></aside></div>
        </section>

`;

const editDialog = `  <dialog class="tc-dialog" id="tcEditDialog" aria-labelledby="tcDialogTitle"><div class="tc-dialog-head"><h2 id="tcDialogTitle">แก้ไขข้อมูล</h2><button class="tc-btn" type="button" onclick="document.getElementById('tcEditDialog').close()" aria-label="ปิดหน้าต่าง">×</button></div><div class="tc-dialog-body"><div class="tc-field"><label for="tcDialogMain">หัวข้อหรือหมายเหตุ</label><input class="tc-input" id="tcDialogMain" maxlength="800"></div><div class="tc-field" id="tcDialogDetailWrap"><label for="tcDialogDetail">รายละเอียด</label><textarea class="tc-textarea" id="tcDialogDetail" maxlength="800"></textarea></div><p class="tc-error" id="tcDialogError"></p></div><div class="tc-dialog-foot"><button class="tc-btn" type="button" onclick="document.getElementById('tcEditDialog').close()">ยกเลิก</button><button class="tc-btn primary" id="tcDialogSave" type="button">บันทึก</button></div></dialog>
`;

replaceRange('<section class="page" id="page-checklist"','<section class="page" id="page-work-links"',checklistMarkup);
removeRange('<section class="page" id="page-report"','<section class="page" id="page-history"');
removeRange('<section class="page" id="page-history"','<section class="page" id="page-settings"');
removeRange('<section class="page" id="page-settings"','</main>');
removeRange('<div class="dashboard-grid">','<section class="panel netflow-overview"');
index=index.replace('</main>',`${todoMarkup}      </main>`);

index=index
  .replace('<link rel="stylesheet" href="./assets/css/work-links-v7.css?v=20260806-1">','<link rel="stylesheet" href="./assets/css/work-links-v7.css?v=20260806-1">\n  <link rel="stylesheet" href="./assets/css/task-checklist-v7.css?v=20260806-1">')
  .replace(/<a class="nav-link" href="#report"[^\n]*<span>บันทึกรายงานและส่งมอบ<\/span><\/a>/,'<a class="nav-link" href="#todo" data-route-link="todo"><span class="nav-icon" aria-hidden="true">◎</span><span>งานที่ต้องทำ</span></a>')
  .replace(/^\s*<a class="nav-link" href="#history"[^\n]*\n/m,'')
  .replace(/^\s*<a class="nav-link" href="#settings"[^\n]*\n/m,'')
  .replace('<a class="button button-primary" href="#report">สร้างรายงานส่งมอบ</a>','<a class="button button-primary" href="#todo">เปิดงานที่ต้องทำ</a>')
  .replace(/^\s*<button class="metric-card" type="button" data-go-route="report"[^\n]*\n/gm,'')
  .replace('สำหรับจัดการเช็กลิสต์ ลิงก์งาน รายงาน และส่งมอบกะ','สำหรับจัดการภาพรวม เช็กลิสต์ ลิงก์งาน และงานที่ต้องทำ')
  .replace('<div class="modal-layer" id="modal-layer" hidden>',`${editDialog}\n  <div class="modal-layer" id="modal-layer" hidden>`)
  .replace('<script src="./assets/js/work-links-v7.js?v=20260806-1"></script>','<script src="./assets/js/work-links-v7.js?v=20260806-1"></script>\n  <script src="./assets/js/task-checklist-v7.js?v=20260806-1"></script>');

if(!index.includes('data-route="todo"')||!index.includes('id="tcCheckCategories"'))throw new Error('Todo or Checklist V7 markup is missing');
if(index.includes('id="page-report"')||index.includes('id="page-history"')||index.includes('id="page-settings"'))throw new Error('Retired markup remains');
if(index.includes('data-route-link="report"')||index.includes('data-route-link="history"')||index.includes('data-route-link="settings"'))throw new Error('Retired navigation remains');
if(index.includes('archive/part')||index.includes('Failed to fetch')||index.includes('atob('))throw new Error('Runtime archive loader found');

await rm(outputDir,{recursive:true,force:true});await mkdir(outputDir,{recursive:true});await writeFile(join(outputDir,'index.html'),index,'utf8');await cp(join(root,'assets'),join(outputDir,'assets'),{recursive:true});await cp(join(root,'404.html'),join(outputDir,'404.html'));await writeFile(join(outputDir,'.nojekyll'),'','utf8');
const requiredAssets=['assets/css/variables.css','assets/css/base.css','assets/css/layout.css','assets/css/components.css','assets/css/pages.css','assets/css/responsive.css','assets/css/work-links-v7.css','assets/css/task-checklist-v7.css','assets/js/navigation.js','assets/js/app.js','assets/js/router.js','assets/js/storage.js','assets/js/utils.js','assets/js/modal.js','assets/js/toast.js','assets/js/dashboard.js','assets/js/links.js','assets/js/work-links-v7.js','assets/js/task-checklist-v7.js','assets/icons/noc-mark.svg'];
await Promise.all(requiredAssets.map(path=>readFile(join(outputDir,path))));
console.log(`PASS: built direct dashboard with 4 active routes from ${partNames.length} HTML parts and ${requiredAssets.length} assets.`);
