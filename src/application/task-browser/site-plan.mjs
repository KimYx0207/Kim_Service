/** Select only the declared, self-contained showcase packages for publication. */
export function planSiteContent(data) {
  return [...new Set(data.showcases.map((sample) => sample.componentPath))].sort();
}
