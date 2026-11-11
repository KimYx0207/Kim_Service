const attribute = value => String(value).replaceAll('&','&amp;').replaceAll('\"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function serializePageData(data) {
  return JSON.stringify(data).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
}

export function renderPage({ data, template, css, script }) {
  return template.replace('/* PAGE_STYLE */', () => css)
    .replace('/* PAGE_DATA */', () => serializePageData(data))
    .replace('/* PAGE_SCRIPT */', () => script)
    .replaceAll('<!-- REPOSITORY_URL -->', () => attribute(data.ui.repository.url))
    .replaceAll('<!-- SOURCE_BASE -->', () => attribute(data.ui.repository.url + '/blob/' + encodeURIComponent(data.ui.repository.ref)));
}
