(() => {
  const stylesheetId = 'shift-countdown-v26-styles';
  const stylesheetHref = './assets/css/shift-countdown-v25.css?v=20260808-26';
  if (!document.getElementById(stylesheetId)) {
    const link = document.createElement('link');
    link.id = stylesheetId;
    link.rel = 'stylesheet';
    link.href = stylesheetHref;
    document.head.append(link);
  }

  const pad = value => String(value).padStart(2, '0');

  function getShiftCountdownState(now = new Date()) {
    const current = new Date(now);
    const shiftEnd = new Date(current);
    shiftEnd.setHours(8, 30, 0, 0);
    const shiftStart = new Date(current);
    shiftStart.setHours(20, 30, 0, 0);

    let target;
    let activeShift;

    if (current < shiftEnd) {
      target = shiftEnd;
      activeShift = true;
    } else if (current >= shiftStart) {
      target = new Date(current);
      target.setDate(target.getDate() + 1);
      target.setHours(8, 30, 0, 0);
      activeShift = true;
    } else {
      target = shiftStart;
      activeShift = false;
    }

    const totalSeconds = Math.max(0, Math.floor((target.getTime() - current.getTime()) / 1000));
    return {
      activeShift,
      hours: Math.floor(totalSeconds / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60
    };
  }

  function initShiftCountdown() {
    const labelNode = document.getElementById('clock-date');
    const timeNode = document.getElementById('clock-time');
    if (!labelNode || !timeNode) return;

    const clockNode = timeNode.closest('.live-clock') || timeNode.parentElement;
    clockNode?.classList.add('shift-countdown-clock');
    window.__shiftCountdownInitialized = true;

    const tick = () => {
      const state = getShiftCountdownState(new Date());
      const status = state.activeShift ? 'เหลือเวลากะ' : 'เริ่มกะใน';
      const countdown = `${pad(state.hours)}:${pad(state.minutes)}:${pad(state.seconds)}`;

      labelNode.textContent = 'กะดึก 20.30 - 08.30 น.';
      timeNode.textContent = countdown;
      clockNode?.setAttribute('data-shift-state', state.activeShift ? 'active' : 'waiting');
      clockNode?.setAttribute('title', `${status} ${countdown}`);
      clockNode?.setAttribute('aria-label', `${status} ${countdown} กะดึก 20.30 ถึง 08.30 น.`);
    };

    tick();
    window.setInterval(tick, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShiftCountdown, { once: true });
  } else {
    initShiftCountdown();
  }
})();
