(function () {
  "use strict";
  const model = Registration.createModel();
  const byId = id => document.getElementById(id);
  const form = byId("registration-form");
  const fields = { name: byId("name"), email: byId("email") };
  const submitButton = byId("submit-button");
  const submitLabel = byId("submit-label");
  const failureOption = byId("simulate-failure");
  const errorSummary = byId("error-summary");
  const feedback = byId("feedback");
  const viewRecord = byId("view-record");
  const themeButton = byId("theme-toggle");
  const defaultButtonLabel = submitLabel.textContent;
  let latestEntryId = null;

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    byId("theme-label").textContent = theme === "dark" ? "浅色主题" : "深色主题";
    themeButton.setAttribute("aria-label", theme === "dark" ? "切换为浅色主题" : "切换为深色主题");
    themeButton.setAttribute("title", theme === "dark" ? "切换为浅色主题" : "切换为深色主题");
  }

  setTheme(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  themeButton.addEventListener("click", function () {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  function setFeedback(state, title, message, symbol) {
    feedback.dataset.state = state;
    byId("feedback-title").textContent = title;
    byId("feedback-message").textContent = message;
    byId("feedback-symbol").textContent = symbol;
  }

  function setFieldError(key, message) {
    const error = byId(key + "-error");
    error.textContent = message || "";
    error.hidden = !message;
    fields[key].setAttribute("aria-invalid", String(Boolean(message)));
  }

  function clearErrors() {
    Object.keys(fields).forEach(key => setFieldError(key, ""));
    errorSummary.textContent = "";
    errorSummary.hidden = true;
  }

  function setBusy(busy) {
    form.setAttribute("aria-busy", String(busy));
    submitButton.disabled = busy;
    submitButton.setAttribute("aria-busy", String(busy));
    Object.values(fields).forEach(field => { field.readOnly = busy; });
    failureOption.disabled = busy;
    submitButton.classList.toggle("is-loading", busy);
    submitLabel.textContent = busy ? "正在加入演示名单…" : defaultButtonLabel;
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }

  function renderEntries() {
    const entries = model.snapshot().entries;
    const list = byId("attendee-list");
    const fragment = document.createDocumentFragment();
    entries.forEach(function (entry) {
      const row = makeElement("li", "attendee" + (entry.id === latestEntryId ? " latest-entry" : ""));
      row.id = entry.id;
      row.tabIndex = -1;
      const avatar = makeElement("span", "avatar", Array.from(entry.name)[0]);
      avatar.setAttribute("aria-hidden", "true");
      const details = makeElement("div", "attendee-details");
      details.appendChild(makeElement("h3", "", entry.name));
      details.appendChild(makeElement("p", "", entry.email || "原始示例未提供邮箱"));
      details.appendChild(makeElement("span", "entry-note", entry.original ? "初始合成示例" : "本页新增 · 合成演示"));
      const badge = makeElement("span", "status-badge " + (entry.original ? "pending" : "added"));
      const dot = makeElement("span", "status-dot");
      dot.setAttribute("aria-hidden", "true");
      badge.appendChild(dot);
      badge.appendChild(document.createTextNode(entry.original ? "待确认" : "已加入"));
      row.appendChild(avatar);
      row.appendChild(details);
      row.appendChild(badge);
      fragment.appendChild(row);
    });
    list.replaceChildren(fragment);
    byId("entry-count").textContent = entries.length + " 条";
    byId("entry-count").setAttribute("aria-label", "共 " + entries.length + " 条示例记录");
  }

  Object.keys(fields).forEach(function (key) {
    fields[key].addEventListener("input", function () {
      if (fields[key].getAttribute("aria-invalid") === "true") {
        const validation = Registration.validate({ name: fields.name.value, email: fields.email.value });
        setFieldError(key, validation.errors[key]);
        if (!Object.values(fields).some(field => field.getAttribute("aria-invalid") === "true")) {
          errorSummary.hidden = true;
          errorSummary.textContent = "";
        }
      }
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    // The model guard also blocks keyboard or scripted duplicate submits.
    if (model.snapshot().busy) return;
    clearErrors();
    viewRecord.hidden = true;
    const result = model.begin({ name: fields.name.value, email: fields.email.value }, { fail: failureOption.checked });
    if (result.kind === "invalid") {
      Object.keys(result.errors).forEach(key => setFieldError(key, result.errors[key]));
      errorSummary.textContent = "还未加入名单。请检查上方标记的输入后重试。";
      errorSummary.hidden = false;
      setFeedback("idle", "等待修正", "输入已经保留。补全或修正信息后即可提交。", "○");
      fields[Object.keys(result.errors)[0]].focus();
      return;
    }
    if (result.kind !== "loading") return;

    // Consume the option only after validation passes; one simulated failure.
    failureOption.checked = false;
    setBusy(true);
    setFeedback("loading", "正在模拟保存", "请稍候，约 1 秒完成。无需重复点击。", "…");
    window.setTimeout(function () {
      const completion = model.finish(result.id);
      if (completion.kind === "stale") return;
      setBusy(false);
      if (completion.kind === "error") {
        // Do not reset the form. Preserve the exact typed values, including spaces.
        errorSummary.textContent = "这次模拟提交失败，名单未更新。输入已保留，直接再次提交即可模拟成功。";
        errorSummary.hidden = false;
        setFeedback("error", "名单尚未更新", "这是一条演示错误。请检查信息，然后再次提交。", "!");
        errorSummary.focus();
        return;
      }

      latestEntryId = completion.entry.id;
      renderEntries();
      setFeedback("success", "已加入演示名单", "已添加「" + completion.entry.name + "」，当前共 " + completion.count + " 条示例记录。可以继续录入下一位。", "✓");
      viewRecord.href = "#" + latestEntryId;
      viewRecord.hidden = false;
      form.reset();
      clearErrors();
      fields.name.focus();
    }, 1100);
  });

  viewRecord.addEventListener("click", function (event) {
    if (!latestEntryId) return;
    const row = byId(latestEntryId);
    if (!row) return;
    event.preventDefault();
    row.focus();
    row.scrollIntoView({ behavior: "auto", block: "nearest" });
  });

  clearErrors();
  setBusy(false);
})();
