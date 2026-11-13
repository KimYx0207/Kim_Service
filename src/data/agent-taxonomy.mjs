/** One authored discovery taxonomy, checked against actual Agent identities. */
export function validateAgentTaxonomy(taxonomy, agentIds) {
  const require = (condition, reason) => { if (!condition) throw new Error(`Invalid Agent taxonomy: ${reason}`); };
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const title = value => value && text(value['zh-CN']) && text(value.en);
  const ids = new Set(agentIds), seen = new Set(), groups = new Set();
  require(taxonomy?.schemaVersion === 1 && Array.isArray(taxonomy.groups), 'schema');
  for (const group of taxonomy.groups) {
    require(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(group.id) && !groups.has(group.id), 'duplicate or invalid group');
    require(['industry','cross-industry'].includes(group.kind) && title(group.title), 'group labels or kind');
    require(Array.isArray(group.roles) && group.roles.length > 0, 'empty roles');groups.add(group.id);
    for (const role of group.roles) {
      require(ids.has(role.componentId) && !seen.has(role.componentId) && title(role.title), `unknown, duplicated or unlabeled role ${role.componentId}`);
      seen.add(role.componentId);
    }
  }
  require(seen.size === ids.size, 'missing Agent classification');
  return taxonomy;
}
