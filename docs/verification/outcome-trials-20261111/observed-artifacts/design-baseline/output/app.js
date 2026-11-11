(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const form = $('signup-form');
  const fields = $('entry-fields');
  const nameInput = $('name');
  const emailInput = $('email');
  const submitButton = $('submit-button');
  const sampleButton = $('sample-button');
  const retryButton = $('retry-button');
  const viewListLink = $('view-list-link');
  const themeButton = $('theme-toggle');
  const participantList = $('participant-list');
  const submitLabel = $('submit-label');
  const arrow = submitButton.querySelector('.submit-arrow');
  const spinner = submitButton.querySelector('.spinner');
  const successRadio = form.querySelector('input[name="outcome"][value="success"]');
  const longButtonLabel = 'Confirm this appointment and keep my details';
  const themeStorageKey = 'store-signup-demo-theme';
  const samples = [
    { name: '林予安', email: 'lin.yuan@example.com' },
    { name: '陈知夏', email: 'chen.zhixia@example.com' },
    { name: '周念初', email: 'zhou.nianchu@example.com' },
  ];
  const participants = [{ name: '示例用户A', email: 'user.a@example.com', initial: true }];
  let isSubmitting = false;
  let sampleIndex = 0;
  let explicitTheme = false;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
  }

  try {
    const savedTheme = localStorage.getItem(themeStorageKey);
    explicitTheme = savedTheme === 'dark' || savedTheme === 'light';
    applyTheme(explicitTheme ? savedTheme : (systemTheme.matches ? 'dark' : 'light'));
  } catch (_) {
    applyTheme(systemTheme.matches ? 'dark' : 'light');
  }

  themeButton.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    explicitTheme = true;
    applyTheme(next);
    try { localStorage.setItem(themeStorageKey, next); } catch (_) { /* Theme still works when storage is unavailable. */ }
  });
  systemTheme.addEventListener('change', (event) => {
    if (!explicitTheme) applyTheme(event.matches ? 'dark' : 'light');
  });

  function showFeedback(tone, title, body) {
    $('feedback').dataset.tone = tone;
    $('feedback-title').textContent = title;
    $('feedback-body').textContent = body;
    $('feedback-symbol').textContent = ({ neutral: 'i', loading: '…', success: '✓', error: '!' })[tone];
  }

  function fieldMessage(input) {
    if (!input.value.trim()) return input === nameInput ? '请填写姓名，或使用「填入示例」。' : '请填写邮箱，例如 lin.yuan@example.com。';
    if (input === nameInput && Array.from(input.value.trim()).length > 40) return '姓名请控制在 40 个字符以内。';
    if (input === emailInput && (input.validity.typeMismatch || input.value.trim().length > 254)) return '请填写有效的邮箱格式，例如 lin.yuan@example.com。';
    return '';
  }

  function validateField(input) {
    const message = fieldMessage(input);
    const error = $(input.id + '-error');
    error.textContent = message;
    error.hidden = !message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
    return !message;
  }

  function clearErrors() {
    [nameInput, emailInput].forEach((input) => {
      input.removeAttribute('aria-invalid');
      const error = $(input.id + '-error');
      error.hidden = true;
      error.textContent = '';
    });
  }

  function setBusy(busy) {
    isSubmitting = busy;
    fields.disabled = busy;
    submitButton.disabled = busy;
    sampleButton.disabled = busy;
    retryButton.disabled = busy;
    form.setAttribute('aria-busy', String(busy));
    participantList.setAttribute('aria-busy', String(busy));
    spinner.hidden = !busy;
    arrow.toggleAttribute('hidden', busy);
    submitLabel.textContent = busy ? 'Processing this demonstration…' : longButtonLabel;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderParticipants() {
    const fragment = document.createDocumentFragment();
    participants.forEach((person, index) => {
      const isLatest = index === 0 && !person.initial;
      const item = element('li', 'participant' + (isLatest ? ' is-new' : ''));
      const avatar = element('span', 'avatar', person.initial ? 'A' : Array.from(person.name)[0]);
      avatar.setAttribute('aria-hidden', 'true');
      const content = element('div', 'participant-content');
      const heading = element('div', 'participant-heading');
      const name = element('h3', '', person.name);
      const badge = element('span', 'status-pill ' + (person.initial ? 'status-pending' : 'status-added'), person.initial ? '待确认' : '已登记');
      heading.append(name, badge);
      content.append(
        heading,
        element('p', 'participant-email', person.email),
        element('p', 'participant-meta', person.initial ? '合成示例 · 初始名单' : (isLatest ? '合成示例 · 刚刚添加' : '合成示例 · 本次演示添加')),
      );
      item.append(avatar, content);
      fragment.append(item);
    });
    participantList.replaceChildren(fragment);
    $('participant-count').textContent = String(participants.length);
    $('roster-summary').textContent = '名单已更新 · 本次新增 ' + (participants.length - 1) + ' 位';
  }

  [nameInput, emailInput].forEach((input) => {
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validateField(input);
    });
  });

  sampleButton.addEventListener('click', () => {
    if (isSubmitting) return;
    const sample = samples[sampleIndex++ % samples.length];
    nameInput.value = sample.name;
    emailInput.value = sample.email;
    clearErrors();
    retryButton.hidden = true;
    viewListLink.hidden = true;
    showFeedback('neutral', '示例已填入', '可直接确认，也可先切换本次演示结果。');
    nameInput.focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nameIsValid = validateField(nameInput);
    const emailIsValid = validateField(emailInput);
    retryButton.hidden = true;
    viewListLink.hidden = true;
    if (!nameIsValid || !emailIsValid) {
      showFeedback('error', '请检查报名信息', '标出的字段需要调整，已经填写的内容会保留。');
      (nameIsValid ? emailInput : nameInput).focus();
      return;
    }

    const person = { name: nameInput.value.trim(), email: emailInput.value.trim(), initial: false };
    const outcome = form.querySelector('input[name="outcome"]:checked').value;
    setBusy(true);
    showFeedback('loading', '正在更新演示名单…', '本地模拟处理中，请稍候。');

    // This timer simulates latency. No fetch, request, business connection, or data persistence is used.
    window.setTimeout(() => {
      setBusy(false);
      if (outcome === 'failure') {
        showFeedback('error', '本次演示未添加成功', '这是所选的模拟失败。输入已保留，名单未改变；可以按下方按钮重试。');
        retryButton.hidden = false;
        $('feedback').focus();
        return;
      }

      participants.unshift(person);
      renderParticipants();
      form.reset();
      clearErrors();
      showFeedback('success', '已加入演示名单', person.name + ' 已添加，当前共 ' + participants.length + ' 位。名单显示在「报名名单」区域，可继续录入下一位。');
      viewListLink.hidden = false;
      nameInput.focus();
    }, 900);
  });

  retryButton.addEventListener('click', () => {
    if (isSubmitting) return;
    successRadio.checked = true;
    form.requestSubmit();
  });

  // Enable the form only after event handlers are attached.
  setBusy(false);
})();
