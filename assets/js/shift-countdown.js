(() => {
  'use strict';

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function getCountdownState(now = new Date()) {
    const current = new Date(now);
    const morningEnd = new Date(current);
    morningEnd.setHours(8, 30, 0, 0);

    const eveningStart = new Date(current);
    eveningStart.setHours(20, 30, 0, 0);

    let target;
    let active;

    if (current < morningEnd) {
      target = morningEnd;
      active = true;
    } else if (current >= eveningStart) {
      target = new Date(current);
      target.setDate(target.getDate() + 1);
      target.setHours(8, 30, 0, 0);
      active = true;
    } else {
      target = eveningStart;
      active = false;
    }

    const secondsTotal = Math.max(0, Math.floor((target.getTime() - current.getTime()) / 1000));
    return {
      active,
      hours: Math.floor(secondsTotal / 3600),
      minutes: Math.floor((secondsTotal % 3600) / 60),
      seconds: secondsTotal % 60,
      label: active ? 'เวลาที่เหลือของกะ' : 'นับถอยหลังก่อนเริ่มกะ'
    };
  }

  function ensureCountdownBox() {
    const panel = document.querySelector('#page-dashboard .hero-command-panel');
    if (!panel) return null;

    let box = document.getElementById('shiftCountdownBox');
    if (box) return box;

    box = document.createElement('div');
    box.className = 'shift-countdown-box';
    box.id = 'shiftCountdownBox';
    box.setAttribute('aria-live', 'polite');

    const label = document.createElement('small');
    label.id = 'shiftCountdownLabel';
    label.textContent = 'กำลังคำนวณเวลา';

    const value = document.createElement('strong');
    value.id = 'shiftCountdown';
    value.textContent = '--:--:--';

    const range = document.createElement('span');
    range.id = 'shiftCountdownSub';
    range.textContent = 'เวลาทำงาน 20:30 - 08:30 น.';

    box.append(label, value, range);
    panel.append(box);
    return box;
  }

  function update() {
    const box = ensureCountdownBox();
    if (!box) return;

    const state = getCountdownState(new Date());
    const label = document.getElementById('shiftCountdownLabel');
    const value = document.getElementById('shiftCountdown');

    if (label) label.textContent = state.label;
    if (value) value.textContent = `${pad(state.hours)}:${pad(state.minutes)}:${pad(state.seconds)}`;
    box.dataset.shiftState = state.active ? 'active' : 'waiting';
  }

  function init() {
    update();
    window.setInterval(update, 1000);
    window.addEventListener('hashchange', update);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
