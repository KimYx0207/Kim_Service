// Canonical runtime. scripts/build-service-helpers.mjs projects this file into
// standalone packages; edit this source, never its generated copies.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

export function requireValue(condition, message) { if (!condition) throw new Error(message); }
export const equal = isDeepStrictEqual;
export const bytes = value => Buffer.byteLength(value, 'utf8');
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
export const hash = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : canonical(value)).digest('hex');
export const readJson = url => JSON.parse(fs.readFileSync(url, 'utf8'));
export function unique(items, label, key = 'id') {
  const result = new Map();
  for (const item of items) { requireValue(!result.has(item[key]), `${label}: duplicate ${key} ${item[key]}`); result.set(item[key], item); }
  return result;
}
export function boundedInteger(value, minimum, maximum, label) {
  requireValue(Number.isSafeInteger(value) && value >= minimum && value <= maximum, `${label} must be an integer in ${minimum}..${maximum}`);
  return value;
}
export function validate(value, schema, root = schema, label = 'input', depth = 0) {
  requireValue(depth <= 40, `${label}: nesting budget exceeded`);
  if (schema.$ref) { const key = schema.$ref.match(/^#\/\$defs\/([\w-]+)$/)?.[1]; requireValue(key && root.$defs?.[key], 'Unsupported local schema reference'); return validate(value, root.$defs[key], root, label, depth + 1); }
  if (schema.anyOf) { requireValue(schema.anyOf.some(rule => { try { validate(value, rule, root, label, depth + 1); return true; } catch { return false; } }), `${label}: does not match an allowed shape`); return; }
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (schema.type) requireValue([schema.type].flat().some(item => item === type || item === 'integer' && Number.isSafeInteger(value)), `${label}: invalid type`);
  if (Object.hasOwn(schema, 'const')) requireValue(equal(value, schema.const), `${label}: invalid constant`);
  if (schema.enum) requireValue(schema.enum.some(item => equal(value, item)), `${label}: unsupported value`);
  if (type === 'number') requireValue(Number.isFinite(value) && (schema.minimum === undefined || value >= schema.minimum) && (schema.maximum === undefined || value <= schema.maximum), `${label}: number out of bounds`);
  if (type === 'string') requireValue((schema.minLength === undefined || value.length >= schema.minLength) && (schema.maxLength === undefined || value.length <= schema.maxLength) && (!schema.pattern || new RegExp(schema.pattern, 'u').test(value)), `${label}: text out of bounds or format`);
  if (type === 'array') {
    requireValue((schema.minItems === undefined || value.length >= schema.minItems) && (schema.maxItems === undefined || value.length <= schema.maxItems), `${label}: list out of bounds`);
    if (schema.uniqueItems) requireValue(new Set(value.map(canonical)).size === value.length, `${label}: duplicate values`);
    if (schema.items) value.forEach((item, index) => validate(item, schema.items, root, `${label}[${index}]`, depth + 1));
  }
  if (type === 'object') {
    for (const key of schema.required ?? []) requireValue(Object.hasOwn(value, key), `${label}: missing ${key}`);
    for (const [key, item] of Object.entries(value)) {
      const rule = Object.hasOwn(schema.properties ?? {}, key) ? schema.properties[key] : schema.additionalProperties;
      requireValue(rule !== false, `${label}: unsupported field ${key}`);
      if (rule && typeof rule === 'object') validate(item, rule, root, `${label}.${key}`, depth + 1);
    }
  }
}
function checkTree(value, policy) {
  const stack = [[value, 0]]; let count = 0;
  while (stack.length) {
    const [item, depth] = stack.pop();
    requireValue(++count <= policy.maxJsonNodes && depth <= policy.maxJsonDepth, 'JSON node/depth budget exceeded');
    if (typeof item === 'number') requireValue(Number.isFinite(item), 'Non-finite JSON number');
    if (typeof item === 'string') requireValue(Buffer.from(item,'utf8').toString('utf8') === item, 'Text contains an unpaired Unicode surrogate');
    if (item && typeof item === 'object') for (const child of Object.values(item)) stack.push([child, depth + 1]);
  }
}
export function receipt(input, policy, id, outcome) {
  return { schemaVersion:1, protocol:'kim-service-helper-v1', capabilityId:`${id}-deliver`, context:input.context,
    inputSha256:hash(input), policySha256:hash(policy), status:outcome.status ?? 'completed', result:outcome.result,
    claims:{modelCalled:false,networkAccessed:false,businessStatePersisted:false,finalAcceptance:'not_decided'} };
}
export function createHelper(metaUrl, id, operation, schemas = {}) {
  const policy = readJson(new URL('../policy.json', metaUrl));
  const inputSchema = readJson(new URL(schemas.input ?? '../schemas/input.schema.json', metaUrl));
  const outputSchema = readJson(new URL(schemas.output ?? '../schemas/output.schema.json', metaUrl));
  const run = input => {
    checkTree(input, policy);
    requireValue(bytes(JSON.stringify(input)) <= policy.maxInputBytes, 'Input exceeds configured byte budget');
    validate(input, inputSchema);
    const outcome = operation(input, policy);
    const result = receipt(input, policy, id, outcome);
    validate(result, outputSchema);
    requireValue(bytes(JSON.stringify(result)) <= policy.maxOutputBytes, 'Output exceeds configured byte budget; narrow this operation');
    return result;
  };
  if (process.argv[1] && pathToFileURL(process.argv[1]).href === metaUrl) {
    try {
      requireValue(process.argv.length === 4 && process.argv[2] === '--input-json' && process.argv[3] === '-', 'Usage: node scripts/run.mjs --input-json - < request.json');
      const chunks = []; let size = 0; let received;
      do { const chunk = Buffer.alloc(65536); received = fs.readSync(0, chunk, 0, chunk.length, null); if (received) { size += received; requireValue(size <= policy.maxInputBytes, 'Input exceeds configured byte budget'); chunks.push(chunk.subarray(0, received)); } } while (received);
      const input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
      process.stdout.write(JSON.stringify(run(input)) + '\n');
    } catch (error) { process.stderr.write(JSON.stringify({ protocol: 'kim-service-helper-v1', status: 'invalid_input', error: error.message }) + '\n'); process.exitCode = 1; }
  }
  return run;
}
