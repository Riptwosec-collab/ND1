(() => {
  'use strict';

  const root = document.getElementById('page-work-links');
  const report = document.getElementById('temperatureReport');
  if (!root || !report) return;

  const ids = [
    'reportDateMode',
    'reportDateStart',
    'reportDateEnd',
    'reportShift',
    'incidentMode',
    'attackCount',
    'temp1',
    'temp2',
    'temp3'
  ];

  const months = [
    'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
  ];

  const get = id => document.getElementById(id);

  function parseDate(value) {
    const parts = String(value || '').split('-').map(Number);
    return parts.length === 3 && parts.every(Number.isFinite) ? parts : null;
  }

  function thaiDateLong(value) {
    const parts = parseDate(value);
    if (!parts) return '-';
    return `${parts[2]} ${months[parts[1] - 1]} ${parts[0] + 543}`;
  }

  function thaiDateRange(startValue, endValue, mode) {
    if (mode !== 'range') return thaiDateLong(startValue);
    const start = parseDate(startValue);
    const end = parseDate(endValue);
    if (!start || !end) return thaiDateLong(startValue);
    if (start[0] === end[0] && start[1] === end[1]) {
      return `${start[2]} - ${end[2]} ${months[start[1] - 1]} ${start[0] + 543}`;
    }
    if (start[0] === end[0]) {
      return `${start[2]} ${months[start[1] - 1]} - ${end[2]} ${months[end[1] - 1]} ${start[0] + 543}`;
    }
    return `${thaiDateLong(startValue)} - ${thaiDateLong(endValue)}`;
  }

  function buildReport() {
    const dateMode = get('reportDateMode')?.value || 'single';
    const dateText = thaiDateRange(
      get('reportDateStart')?.value,
      get('reportDateEnd')?.value,
      dateMode
    );
    const shift = get('reportShift')?.value || 'day';
    const times = shift === 'night'
      ? { start: '20.30', end: '06.00' }
      : { start: '06.00', end: '20.30' };
    const incidentMode = get('incidentMode')?.value || 'found';
    const count = Math.max(1, Number.parseInt(get('attackCount')?.value || '4', 10));
    const incidentText = incidentMode === 'none'
      ? 'ไม่พบเหตุการณ์การโจมตี เว็บไซต์สรรพากรสามารถใช้งานได้ตามปกติ'
      : `พบ ${count} เหตุการณ์ การโจมตีถูก Block โดย Arbor เว็บไซต์สรรพากรสามารถใช้งานได้ตามปกติ`;

    const temp3 = get('temp3')?.value || '-';
    const temp1 = get('temp1')?.value || '-';
    const temp2 = get('temp2')?.value || '-';

    return `${dateText} เวลา ${times.start} - ${times.end} น. ${incidentText}\n\n- IT05-C3750X-Intra-Inter (10.1.100.3)\n  System Temperature Value: ${temp3} Degree Celsius\n\n- IT06-C9500-CSW1-A01 (10.1.100.1)\n  FL6-Rack A01 Temperature: ${temp1} Degree Celsius\n\n- IT06-C9500-CSW2-A02 (10.1.100.2)\n  FL6-Rack A02 Temperature: ${temp2} Degree Celsius\n\nเมื่ออุณหภูมิถึงประมาณ 50 องศาเซลเซียส อุปกรณ์จะปิดโดยอัตโนมัติเพื่อป้องกันความเสียหายของฮาร์ดแวร์`;
  }

  function updateReport() {
    report.value = buildReport();
  }

  ids.forEach(id => {
    const element = get(id);
    if (!element) return;
    const refresh = () => queueMicrotask(updateReport);
    element.addEventListener('input', refresh);
    element.addEventListener('change', refresh);
  });

  updateReport();
})();
