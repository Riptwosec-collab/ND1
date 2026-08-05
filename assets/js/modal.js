import { buildButton } from './utils.js';

let layer;
let modal;
let titleNode;
let eyebrowNode;
let bodyNode;
let footerNode;
let closeButton;
let activeOpener = null;
let cleanupCallback = null;

const focusableSelector = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export function initModal() {
  layer = document.getElementById('modal-layer');
  modal = document.getElementById('app-modal');
  titleNode = document.getElementById('modal-title');
  eyebrowNode = document.getElementById('modal-eyebrow');
  bodyNode = document.getElementById('modal-body');
  footerNode = document.getElementById('modal-footer');
  closeButton = document.getElementById('modal-close');

  closeButton.addEventListener('click', closeModal);
  layer.addEventListener('click', event => {
    if (event.target.hasAttribute('data-modal-close')) closeModal();
  });
  document.addEventListener('keydown', handleKeydown);
}

function handleKeydown(event) {
  if (!layer || layer.hidden) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusables = [...modal.querySelectorAll(focusableSelector)].filter(element => !element.hidden && element.offsetParent !== null);
  if (!focusables.length) {
    event.preventDefault();
    modal.focus();
    return;
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function openModal({ title, eyebrow = 'NOC TOOL', content, footer = null, opener = document.activeElement, onClose = null }) {
  if (!layer) initModal();
  activeOpener = opener instanceof HTMLElement ? opener : null;
  cleanupCallback = typeof onClose === 'function' ? onClose : null;
  titleNode.textContent = title;
  eyebrowNode.textContent = eyebrow;
  bodyNode.replaceChildren();
  footerNode.replaceChildren();
  if (content) bodyNode.append(content);
  if (footer) footerNode.append(footer);
  footerNode.hidden = !footer;
  layer.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    const first = modal.querySelector(focusableSelector);
    (first || modal).focus();
  });
}

export function closeModal() {
  if (!layer || layer.hidden) return;
  layer.hidden = true;
  document.body.style.overflow = '';
  bodyNode.replaceChildren();
  footerNode.replaceChildren();
  if (cleanupCallback) cleanupCallback();
  cleanupCallback = null;
  const focusTarget = activeOpener;
  activeOpener = null;
  if (focusTarget?.isConnected) focusTarget.focus();
}

export function openInputModal({ title, label, value = '', submitLabel = 'บันทึก', opener, onSubmit }) {
  const form = document.createElement('form');
  form.className = 'form-grid';
  const field = document.createElement('label');
  field.className = 'field';
  const fieldLabel = document.createElement('span');
  fieldLabel.textContent = label;
  const input = document.createElement('input');
  input.type = 'text';
  input.required = true;
  input.maxLength = 160;
  input.value = value;
  field.append(fieldLabel, input);
  form.append(field);

  const footer = document.createElement('div');
  footer.className = 'button-row';
  const cancel = buildButton('ยกเลิก', 'button button-ghost');
  const submit = buildButton(submitLabel, 'button button-primary');
  submit.type = 'submit';
  cancel.addEventListener('click', closeModal);
  footer.append(cancel, submit);
  form.append(footer);

  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    onSubmit(text);
    closeModal();
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal();
  });
  openModal({ title, eyebrow: 'EDIT DATA', content: form, opener });
  requestAnimationFrame(() => { input.focus(); input.select(); });
}
