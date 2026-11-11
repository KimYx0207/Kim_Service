/* Editable design tokens; shared by the rendered example and JSON export. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KimServiceConsoleTokens = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  function resolve(source, path, seen = new Set()) {
    if (seen.has(path)) throw new Error(`循环 token 引用：${path}`);
    const value = path.split('.').reduce((current,key) => current?.[key],source);
    if (typeof value !== 'string') throw new Error(`缺少颜色 token：${path}`);
    const alias = value.match(/^\{([a-zA-Z0-9.]+)\}$/);
    if (alias) return resolve(source,alias[1],new Set([...seen,path]));
    if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`颜色必须为六位十六进制：${path}`);
    return value;
  }
  function luminance(hex) {
    const parts=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
    return .2126*parts[0]+.7152*parts[1]+.0722*parts[2];
  }
  function contrast(first,second) { const a=luminance(first),b=luminance(second); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); }
  function actionText(background) {
    if(!/^#[0-9a-f]{6}$/i.test(background)) throw new Error('品牌色格式无效');
    return contrast(background,'#ffffff')>=contrast(background,'#101810')?'#ffffff':'#101810';
  }
  return { resolve, contrast, actionText };
});
