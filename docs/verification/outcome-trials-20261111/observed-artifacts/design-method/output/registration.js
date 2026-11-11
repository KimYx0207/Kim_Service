/* Local-only registration state. No DOM, persistence, or network requests. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Registration = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const INITIAL_ENTRY = Object.freeze({
    id: "entry-original", name: "示例用户A", email: "", status: "pending", original: true
  });

  function validate(values) {
    const name = String(values.name == null ? "" : values.name).trim();
    const email = String(values.email == null ? "" : values.email).trim();
    const errors = {};
    if (!name) errors.name = "请填写报名者姓名。";
    else if (name.length > 100) errors.name = "姓名不能超过 100 个字符，请缩短后重试。";
    if (!email) errors.email = "请填写邮箱。";
    else if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) {
      errors.email = "请输入完整邮箱，例如 ming@example.test。";
    }
    return { valid: Object.keys(errors).length === 0, errors, values: { name, email } };
  }

  function createModel() {
    let entries = [{ ...INITIAL_ENTRY }];
    let pending = null;
    let sequence = 0;
    let phase = "idle";

    function begin(values, options = {}) {
      if (pending) return { kind: "busy" };
      const validation = validate(values);
      if (!validation.valid) {
        phase = "invalid";
        return { kind: "invalid", errors: validation.errors };
      }
      sequence += 1;
      pending = { id: sequence, values: validation.values, fail: options.fail === true };
      phase = "loading";
      return { kind: "loading", id: pending.id, values: { ...pending.values } };
    }

    function finish(id) {
      if (!pending || pending.id !== id) return { kind: "stale" };
      const operation = pending;
      pending = null;
      if (operation.fail) {
        phase = "error";
        return { kind: "error", values: { ...operation.values } };
      }
      const entry = { id: "entry-" + operation.id, ...operation.values, status: "added", original: false };
      entries.unshift(entry);
      phase = "success";
      return { kind: "success", entry: { ...entry }, count: entries.length };
    }

    function snapshot() {
      return { phase, busy: pending !== null, entries: entries.map(entry => ({ ...entry })) };
    }

    return Object.freeze({ begin, finish, snapshot });
  }

  return Object.freeze({ INITIAL_ENTRY, validate, createModel });
});
