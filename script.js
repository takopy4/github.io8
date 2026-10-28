// 1. Создайте форму в Formcarry и замените адрес ниже на выданный endpoint.
const FORM_ENDPOINT = 'https://formcarry.com/s/qi9heKg27Qb';
const STORAGE_KEY = 'feedback-form-draft-v1';

(() => {
  const dialog = document.querySelector('#contact-modal');
  const form = document.querySelector('#contact-form');
  const opener = document.querySelector('#open-contact');
  const closer = document.querySelector('#close-contact');
  const submitButton = document.querySelector('#submit-contact');
  const status = document.querySelector('#form-status');
  const policyLink = document.querySelector('#policy-link');
  const policyNote = document.querySelector('#privacy-note');
  let modalHistoryEntry = false;
  let oldBodyOverflow = '';

  function setStatus(message, type = '') {
    status.textContent = message;
    status.className = `form-status${type ? ` is-${type}` : ''}`;
  }

  function showDialog() {
    if (dialog.open) return;
    oldBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    window.setTimeout(() => form.elements.fullName.focus(), 40);
  }

  function hideDialog() {
    if (dialog.open) dialog.close();
    document.body.style.overflow = oldBodyOverflow;
    opener.focus({ preventScroll: true });
  }

  function openDialog() {
    setStatus('');
    if (window.location.hash !== '#feedback') {
      const nextUrl = new URL(window.location.href);
      nextUrl.hash = 'feedback';
      window.history.pushState({ ...(window.history.state || {}), contactModal: true }, '', nextUrl);
      modalHistoryEntry = true;
    } else {
      modalHistoryEntry = Boolean(window.history.state?.contactModal);
    }
    showDialog();
  }

  function closeDialog() {
    if (modalHistoryEntry && window.location.hash === '#feedback') {
      modalHistoryEntry = false;
      window.history.back();
      return;
    }
    if (window.location.hash === '#feedback') {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.hash = '';
      window.history.replaceState(window.history.state, '', cleanUrl);
    }
    modalHistoryEntry = false;
    hideDialog();
  }

  function saveDraft() {
    const values = {};
    for (const field of form.elements) {
      if (!field.name) continue;
      values[field.name] = field.type === 'checkbox' ? field.checked : field.value;
    }
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); }
    catch (error) { console.warn('Не удалось сохранить черновик формы в LocalStorage.', error); }
  }

  function restoreDraft() {
    try {
      const values = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
      for (const field of form.elements) {
        if (!field.name || !(field.name in values)) continue;
        if (field.type === 'checkbox') field.checked = Boolean(values[field.name]);
        else field.value = String(values[field.name] ?? '');
      }
    } catch (error) { console.warn('Не удалось восстановить черновик формы.', error); }
  }

  opener.addEventListener('click', openDialog);
  closer.addEventListener('click', closeDialog);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });

  // URL hash is managed with History API; Back closes the open modal.
  window.addEventListener('popstate', () => {
    if (window.location.hash === '#feedback') {
      modalHistoryEntry = Boolean(window.history.state?.contactModal);
      showDialog();
    } else if (dialog.open) {
      modalHistoryEntry = false;
      hideDialog();
    }
  });

  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);
  restoreDraft();

  policyLink.addEventListener('click', event => {
    event.preventDefault();
    policyNote.hidden = !policyNote.hidden;
    policyLink.setAttribute('aria-expanded', String(!policyNote.hidden));
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    setStatus('');
    if (!form.reportValidity()) {
      setStatus('Проверьте обязательные поля и согласие на обработку данных.', 'error');
      return;
    }
    if (FORM_ENDPOINT.includes('REPLACE_WITH_YOUR_FORM_ID')) {
      setStatus('Для отправки укажите endpoint Formcarry в начале файла script.js.', 'error');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Отправляем…';
    setStatus('Отправляем ваше сообщение…');
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });
      const responseBody = await response.json().catch(() => null);
      const responseSaysError = responseBody && /error|fail/i.test(String(responseBody.status || responseBody.type || ''));
      if (!response.ok || responseSaysError) throw new Error('Сервис не принял форму. Проверьте endpoint и попробуйте ещё раз.');

      form.reset();
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (_) { /* Storage may be disabled. */ }
      policyNote.hidden = true;
      policyLink.setAttribute('aria-expanded', 'false');
      setStatus('Спасибо! Ваше сообщение отправлено.', 'success');
    } catch (error) {
      setStatus(error.message || 'Не удалось отправить сообщение. Проверьте подключение и попробуйте ещё раз.', 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Отправить <span aria-hidden="true">↗</span>';
    }
  });

  if (window.location.hash === '#feedback') {
    modalHistoryEntry = Boolean(window.history.state?.contactModal);
    showDialog();
  }
})();
