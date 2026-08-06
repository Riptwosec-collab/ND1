(() => {
  'use strict';

  const STORAGE = Object.freeze({
    customTodo: 'nightShiftV3:customTodo',
    todoOverrides: 'nightShiftV7:todoOverrides',
    todoDeleted: 'nightShiftV7:todoDeleted',
    checklist: 'nightShiftV3:checklist',
    checklistNotes: 'nightShiftV3:checklistNotes',
    checklistCustom: 'nightShiftV7:checklistCustom',
    checklistOverrides: 'nightShiftV7:checklistOverrides'
  });

  const DEFAULT_TODO = [
    ['receive','รับเวรและตรวจสอบงานค้าง','อ่านสรุปจากกะก่อนหน้า และตรวจสอบงานที่ยังไม่ปิด'],
    ['temperature','ตรวจสอบอุณหภูมิอุปกรณ์ / Email SMOC','สร้างข้อความรายงานอุณหภูมิ ตรวจสอบเหตุการณ์โจมตี และแจ้งกลุ่มที่เกี่ยวข้อง'],
    ['uih','รายงานคงค้าง UIH','เปิดรายงานประจำวันและส่งกลุ่ม LINE เครือข่ายขัดข้อง'],
    ['netflow','ตรวจสอบกราฟ NetFlow','ตรวจสอบแนวโน้มการใช้งานและความผิดปกติของ Traffic'],
    ['service','ตรวจสอบ Service ระบบงาน','ตรวจสอบความพร้อมใช้งานของ Service จาก Google Sheet'],
    ['ipam','Add IPAM ที่ Solawind','Add เฉพาะหัวข้อใบงาน แก้ IP และ MAC Address'],
    ['handover','สรุปและส่งมอบงาน','บันทึกผล สรุปงานค้าง และสร้างข้อความส่งมอบกะถัดไป']
  ].map(([id,title,detail]) => ({id,title,detail}));

  const CHECKLIST_GROUPS = [
    {id:'security',title:'ตรวจสอบระบบและความปลอดภัย',items:[['temp-1','ตรวจสอบอุณหภูมิอุปกรณ์ 10.1.100.1'],['temp-2','ตรวจสอบอุณหภูมิอุปกรณ์ 10.1.100.2'],['temp-3','ตรวจสอบอุณหภูมิอุปกรณ์ 10.1.100.3'],['smoc-email','ตรวจสอบ Email เหตุการณ์โจมตีจาก SMOC'],['line-noc','ส่งกลุ่ม LINE NOC@RD และ PCC-Helpdesk@RD']]},
    {id:'report',title:'รายงานและการติดตาม',items:[['uih-report','รายงานคงค้าง UIH'],['line-network','ส่งกลุ่ม LINE เครือข่ายขัดข้อง'],['netflow','ตรวจสอบกราฟ NetFlow'],['service','ตรวจสอบ Service ระบบงาน']]},
    {id:'system',title:'อัปเดตข้อมูลระบบ',items:[['ipam-add','Add IPAM ที่ Solawind'],['ticket-title','แก้เฉพาะหัวข้อใบงาน'],['ip-edit','แก้ IP Address'],['mac-edit','แก้ MAC Address']]},
    {id:'handover',title:'สรุปและส่งมอบงาน',items:[['record-result','บันทึกผลการตรวจสอบ'],['problem-summary','สรุปปัญหาที่พบ'],['handover-next','ส่งมอบงานให้กะถัดไป']]}
  ];

  const $ = selector => document.querySelector(selector);
  const state = { saveHandler: null };

  function read(key, fallback) {
    try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); }
    catch { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { notify('ไม่สามารถบันทึกข้อมูลใน LocalStorage ได้', 'error'); return false; }
  }
  function node(tag, attrs = {}, text = '') {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([key,value]) => {
      if (key === 'class') element.className = value;
      else if (key === 'dataset') Object.entries(value).forEach(([name,data]) => { element.dataset[name] = String(data); });
      else if (key === 'checked') element.checked = Boolean(value);
      else element.setAttribute(key, String(value));
    });
    if (text !== '') element.textContent = text;
    return element;
  }
  function notify(message, type = 'success') {
    const region = document.getElementById('toast-region');
    if (!region) return;
    const toast = node('div', {class:`toast ${type}`}, message);
    region.append(toast);
    setTimeout(() => toast.remove(), 2800);
  }
  function formatDateTime(value) {
    if (!value) return 'ยังไม่บันทึกเวลา';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'ยังไม่บันทึกเวลา';
    return `เสร็จเมื่อ ${new Intl.DateTimeFormat('th-TH',{dateStyle:'short',timeStyle:'medium'}).format(date)}`;
  }

  function todoOverrides(){ return read(STORAGE.todoOverrides, {}); }
  function deletedTodoIds(){ return new Set(read(STORAGE.todoDeleted, [])); }
  function customTodoItems(){ return read(STORAGE.customTodo, []); }
  function allTodoItems(){
    const overrides = todoOverrides();
    const deleted = deletedTodoIds();
    const builtIn = DEFAULT_TODO.filter(item => !deleted.has(item.id)).map(item => ({...item,...(overrides[item.id]||{}),custom:false}));
    const custom = customTodoItems().map(item => ({...item,...(overrides[item.id]||{}),custom:true}));
    return [...builtIn,...custom];
  }
  function renderTodo(){
    const container = $('#tcTodoList');
    if (!container) return;
    container.replaceChildren();
    const items = allTodoItems();
    $('#tcTodoCount').textContent = `${items.length} รายการ`;
    if (!items.length) { container.append(node('div',{class:'tc-card tc-empty'},'ยังไม่มีรายการสิ่งที่ต้องทำ')); return; }
    items.forEach((item,index) => {
      const card = node('article',{class:'tc-card tc-todo-item',dataset:{todoId:item.id}});
      const number = node('div',{class:'tc-number'},String(index+1));
      const content = node('div');
      content.append(node('h3',{},item.title),node('p',{},item.detail||'ไม่มีรายละเอียด'));
      const actions = node('div',{class:'tc-actions'});
      const edit = node('button',{type:'button',class:'tc-btn warning'},'แก้ไข');
      const remove = node('button',{type:'button',class:'tc-btn danger'},'ลบ');
      edit.addEventListener('click',()=>openEditor('todo',item));
      remove.addEventListener('click',()=>{ if(confirm(`ต้องการลบ “${item.title}” หรือไม่`)) deleteTodo(item); });
      actions.append(edit,remove); card.append(number,content,actions); container.append(card);
    });
  }
  function addTodo(event){
    event.preventDefault();
    const titleInput=$('#tcTodoTitle'); const detailInput=$('#tcTodoDetail'); const title=titleInput.value.trim();
    $('#tcTodoError').textContent='';
    if(!title){ $('#tcTodoError').textContent='กรุณากรอกหัวข้องาน'; titleInput.focus(); return; }
    const items=customTodoItems(); items.push({id:`custom-todo-${Date.now()}`,title,detail:detailInput.value.trim(),createdAt:new Date().toISOString()});
    write(STORAGE.customTodo,items); event.currentTarget.reset(); renderTodo(); notify('เพิ่มสิ่งที่ต้องทำแล้ว');
  }
  function deleteTodo(item){
    if(item.custom) write(STORAGE.customTodo,customTodoItems().filter(value=>value.id!==item.id));
    else { const deleted=deletedTodoIds(); deleted.add(item.id); write(STORAGE.todoDeleted,[...deleted]); }
    const overrides=todoOverrides(); delete overrides[item.id]; write(STORAGE.todoOverrides,overrides); renderTodo(); notify('ลบรายการงานแล้ว');
  }
  function restoreTodo(){
    if(!confirm('ต้องการคืนรายการเริ่มต้นทั้งหมดหรือไม่ รายการที่เพิ่มเองจะยังอยู่')) return;
    write(STORAGE.todoDeleted,[]); const overrides=todoOverrides(); DEFAULT_TODO.forEach(item=>delete overrides[item.id]); write(STORAGE.todoOverrides,overrides); renderTodo(); notify('คืนรายการเริ่มต้นแล้ว');
  }

  function checklistState(){ return read(STORAGE.checklist,{}); }
  function checklistNotes(){ return read(STORAGE.checklistNotes,{}); }
  function checklistCustom(){ return read(STORAGE.checklistCustom,[]); }
  function checklistOverrides(){ return read(STORAGE.checklistOverrides,{}); }
  function groups(){
    const overrides=checklistOverrides(); const custom=checklistCustom();
    return CHECKLIST_GROUPS.map(group=>({...group,items:[...group.items.map(([id,text])=>({id,text:overrides[id]||text,custom:false})),...custom.filter(item=>item.groupId===group.id).map(item=>({...item,text:overrides[item.id]||item.text,custom:true}))]}));
  }
  function allChecklist(){ return groups().flatMap(group=>group.items); }
  function populateGroups(){
    const select=$('#tcCheckGroup'); if(!select)return; select.replaceChildren(); CHECKLIST_GROUPS.forEach(group=>select.append(node('option',{value:group.id},group.title)));
  }
  function renderChecklist(){
    const container=$('#tcCheckCategories'); if(!container)return;
    const values=checklistState(); const notes=checklistNotes(); container.replaceChildren();
    groups().forEach((group,index)=>{
      const panel=node('section',{class:'tc-card',dataset:{groupId:group.id}});
      const head=node('div',{class:'tc-panel-head'}); head.append(node('h3',{},`${index+1}. ${group.title}`));
      const actions=node('div',{class:'tc-category-actions'}); const badge=node('span',{class:'tc-badge tc-group-count'},'0/0');
      const all=node('button',{type:'button',class:'tc-btn success'},'ติ๊กทั้งหมด'); const clear=node('button',{type:'button',class:'tc-btn'},'ยกเลิกทั้งหมด');
      all.addEventListener('click',()=>setGroup(group.id,true)); clear.addEventListener('click',()=>setGroup(group.id,false)); actions.append(badge,all,clear); head.append(actions); panel.append(head);
      const list=node('div',{class:'tc-check-items'});
      group.items.forEach(item=>{
        const done=Boolean(values[item.id]?.done); const row=node('article',{class:`tc-check-item${done?' done':''}`});
        const checkbox=node('input',{type:'checkbox',id:`tc-check-${item.id}`,checked:done,'aria-label':item.text}); checkbox.addEventListener('change',()=>setItem(item.id,checkbox.checked));
        const meta=node('div',{class:'tc-check-meta'}); meta.append(node('label',{for:`tc-check-${item.id}`},item.text),node('small',{},formatDateTime(values[item.id]?.completedAt)));
        if(notes[item.id]) meta.append(node('small',{class:'tc-note'},`หมายเหตุ: ${notes[item.id]}`));
        const itemActions=node('div',{class:'tc-actions'}); const note=node('button',{type:'button',class:'tc-btn'},notes[item.id]?'แก้หมายเหตุ':'หมายเหตุ'); const edit=node('button',{type:'button',class:'tc-btn warning'},'แก้ไข');
        note.addEventListener('click',()=>openEditor('note',{id:item.id,title:item.text,value:notes[item.id]||''})); edit.addEventListener('click',()=>openEditor('check',{id:item.id,title:item.text})); itemActions.append(note,edit);
        if(item.custom){ const remove=node('button',{type:'button',class:'tc-btn danger'},'ลบ'); remove.addEventListener('click',()=>{if(confirm(`ต้องการลบ “${item.text}” หรือไม่`))deleteCheck(item.id)}); itemActions.append(remove); }
        row.append(checkbox,meta,itemActions); list.append(row);
      });
      panel.append(list); container.append(panel);
    });
    updateProgress();
  }
  function addCheck(event){
    event.preventDefault(); const input=$('#tcCheckTitle'); const text=input.value.trim(); $('#tcCheckError').textContent='';
    if(!text){ $('#tcCheckError').textContent='กรุณากรอกข้อความหัวข้อ'; input.focus(); return; }
    const items=checklistCustom(); items.push({id:`custom-check-${Date.now()}`,groupId:$('#tcCheckGroup').value,text,createdAt:new Date().toISOString()}); write(STORAGE.checklistCustom,items); event.currentTarget.reset(); populateGroups(); renderChecklist(); notify('เพิ่มหัวข้อเช็กลิสต์แล้ว');
  }
  function setItem(id,done){ const data=checklistState(); data[id]={done,completedAt:done?new Date().toISOString():''}; write(STORAGE.checklist,data); renderChecklist(); notify(done?'ติ๊กเช็กลิสต์แล้ว':'ยกเลิกเช็กลิสต์แล้ว',done?'success':'info'); }
  function setGroup(id,done){ const group=groups().find(value=>value.id===id); if(!group)return; const data=checklistState(); const time=done?new Date().toISOString():''; group.items.forEach(item=>data[item.id]={done,completedAt:time}); write(STORAGE.checklist,data); renderChecklist(); }
  function setAll(done){ const data={}; const time=done?new Date().toISOString():''; allChecklist().forEach(item=>data[item.id]={done,completedAt:time}); write(STORAGE.checklist,data); renderChecklist(); notify(done?'ติ๊กเช็กลิสต์ทั้งหมดแล้ว':'ล้างเช็กลิสต์ทั้งหมดแล้ว',done?'success':'info'); }
  function deleteCheck(id){
    write(STORAGE.checklistCustom,checklistCustom().filter(item=>item.id!==id));
    const values=checklistState(); delete values[id]; write(STORAGE.checklist,values);
    const notes=checklistNotes(); delete notes[id]; write(STORAGE.checklistNotes,notes);
    const overrides=checklistOverrides(); delete overrides[id]; write(STORAGE.checklistOverrides,overrides); renderChecklist(); notify('ลบหัวข้อเช็กลิสต์แล้ว');
  }
  function updateProgress(){
    const items=allChecklist(); const data=checklistState(); const total=items.length; const done=items.filter(item=>data[item.id]?.done).length; const percent=total?Math.round(done/total*100):0;
    $('#tcCheckPercent').textContent=`${percent}%`; $('#tcCheckTotal').textContent=String(total); $('#tcCheckDone').textContent=String(done); $('#tcCheckRemain').textContent=String(total-done); $('#tcCheckProgress').style.width=`${percent}%`; $('#tcCheckCircle').style.background=`conic-gradient(var(--tc-cyan) ${percent*3.6}deg,#08234a 0deg)`; $('#tcCheckCircle strong').textContent=`${percent}%`;
    document.querySelectorAll('[data-group-id]').forEach(panel=>{ const group=groups().find(value=>value.id===panel.dataset.groupId); const badge=panel.querySelector('.tc-group-count'); if(group&&badge){const count=group.items.filter(item=>data[item.id]?.done).length;badge.textContent=`${count}/${group.items.length}`;badge.classList.toggle('ok',count===group.items.length&&group.items.length>0);}});
    window.dispatchEvent(new CustomEvent('nightNoc:data-changed',{detail:{source:'task-checklist-v7'}}));
  }

  function openEditor(mode,item){
    const dialog=$('#tcEditDialog'); $('#tcDialogError').textContent=''; $('#tcDialogDetailWrap').hidden=mode!=='todo'; $('#tcDialogTitle').textContent=mode==='todo'?'แก้ไขสิ่งที่ต้องทำ':mode==='note'?'เพิ่มหรือแก้ไขหมายเหตุ':'แก้ไขหัวข้อเช็กลิสต์'; $('#tcDialogMain').value=mode==='note'?item.value:item.title; $('#tcDialogDetail').value=item.detail||'';
    state.saveHandler=()=>{
      const value=$('#tcDialogMain').value.trim(); if(mode!=='note'&&!value){$('#tcDialogError').textContent='ข้อมูลต้องไม่ว่าง';return;}
      if(mode==='todo'){const overrides=todoOverrides();overrides[item.id]={title:value,detail:$('#tcDialogDetail').value.trim()};write(STORAGE.todoOverrides,overrides);renderTodo();}
      else if(mode==='check'){const overrides=checklistOverrides();overrides[item.id]=value;write(STORAGE.checklistOverrides,overrides);renderChecklist();}
      else {const notes=checklistNotes();if(value)notes[item.id]=value;else delete notes[item.id];write(STORAGE.checklistNotes,notes);renderChecklist();}
      dialog.close(); notify('บันทึกข้อมูลแล้ว');
    };
    dialog.showModal(); $('#tcDialogMain').focus();
  }
  function tickCountdown(){ const now=new Date(); const target=new Date(now); target.setHours(8,30,0,0); if(now>=target)target.setDate(target.getDate()+1); const diff=target-now; const h=Math.floor(diff/3600000),m=Math.floor(diff%3600000/60000),s=Math.floor(diff%60000/1000); const el=$('#tcCountdown'); if(el)el.textContent=[h,m,s].map(value=>String(value).padStart(2,'0')).join(':'); }

  function init(){
    if(!$('#tcTodoList')||!$('#tcCheckCategories'))return;
    populateGroups(); renderTodo(); renderChecklist(); tickCountdown(); setInterval(tickCountdown,1000);
    $('#tcTodoForm').addEventListener('submit',addTodo); $('#tcRestoreTodo').addEventListener('click',restoreTodo); $('#tcChecklistForm').addEventListener('submit',addCheck);
    $('#tcCheckAll').addEventListener('click',()=>{if(confirm('ต้องการติ๊กเช็กลิสต์ทั้งหมดหรือไม่'))setAll(true)}); $('#tcClearAll').addEventListener('click',()=>{if(confirm('ต้องการล้างสถานะเช็กลิสต์ทั้งหมดหรือไม่'))setAll(false)});
    $('#tcDialogSave').addEventListener('click',()=>state.saveHandler?.()); $('#tcEditDialog').addEventListener('close',()=>{state.saveHandler=null});
    window.addEventListener('nightNoc:route-changed',event=>{if(event.detail.route==='checklist')renderChecklist();if(event.detail.route==='todo')renderTodo();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();