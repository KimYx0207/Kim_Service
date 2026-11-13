import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

function loadPolicy() {
  const value = JSON.parse(fs.readFileSync(new URL('../policy.json', import.meta.url), 'utf8'));
  for (const key of ['maxEventBytes','maxConfigBytes','maxArtifacts','maxArtifactBytes','maxTotalArtifactBytes','maxPathChars','readTimeoutMs']) check(Number.isSafeInteger(value[key]) && value[key] > 0, 'invalid_policy');
  check(Array.isArray(value.supportedTools) && value.supportedTools.every(tool => typeof tool === 'string' && tool.trim()), 'invalid_policy');
  return value;
}
const check = (condition, code) => { if (!condition) { const e = new Error(code); e.code = code; throw e; } };
const canonical = value => Array.isArray(value) ? '['+value.map(canonical).join(',')+']' : value && typeof value==='object' ? '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}' : JSON.stringify(value);
const hash = value => crypto.createHash('sha256').update(Buffer.isBuffer(value) ? value : canonical(value)).digest('hex');
function regularBytes(file, maximum) {
  const before = fs.lstatSync(file);
  check(before.isFile() && !before.isSymbolicLink(), 'not_regular_file');
  check(before.size <= maximum, 'file_size_limit');
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const current = fs.fstatSync(fd);
    check(current.isFile() && current.size <= maximum && current.dev === before.dev && current.ino === before.ino, 'file_changed_during_read');
    const bytes = fs.readFileSync(fd);
    check(bytes.length <= maximum, 'file_size_limit');
    const after = fs.fstatSync(fd);
    check(after.size === current.size && after.mtimeMs === current.mtimeMs, 'file_changed_during_read');
    return bytes;
  } finally { fs.closeSync(fd); }
}
function parts(relative, policy) {
  check(typeof relative === 'string' && relative.length > 0 && relative.length <= policy.maxPathChars, 'invalid_relative_path');
  check(!/[\\:\x00-\x1f]/u.test(relative) && !path.isAbsolute(relative), 'invalid_relative_path');
  const segments = relative.split('/');
  check(segments.every(part => part && part !== '.' && part !== '..'), 'invalid_relative_path');
  return segments;
}
function resolveWithin(root, relative, createDirectory, policy) {
  const segments = parts(relative, policy); let current = root;
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    if (createDirectory && !fs.existsSync(current)) fs.mkdirSync(current, { mode: 0o700 });
    const stat = fs.lstatSync(current);
    check(!stat.isSymbolicLink(), 'symlink_refused');
    if (index < segments.length - 1 || createDirectory) check(stat.isDirectory(), 'not_directory');
  }
  return current;
}
function loadConfig(file, policy) {
  check(typeof file === 'string' && path.isAbsolute(file), 'explicit_absolute_config_required');
  const config = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(regularBytes(file, policy.maxConfigBytes)));
  check(config && typeof config === 'object' && !Array.isArray(config), 'invalid_config');
  check(Object.keys(config).every(k=>['workspaceRoot','artifactPaths','receiptsDir','workId','revision'].includes(k)), 'unknown_config_field');
  check(typeof config.workspaceRoot === 'string' && path.isAbsolute(config.workspaceRoot), 'absolute_workspace_required');
  const root = fs.realpathSync(config.workspaceRoot); check(fs.statSync(root).isDirectory(), 'not_directory');
  check(Array.isArray(config.artifactPaths) && config.artifactPaths.length > 0 && config.artifactPaths.length <= policy.maxArtifacts, 'artifact_count_limit');
  check(new Set(config.artifactPaths).size === config.artifactPaths.length, 'duplicate_artifact');
  parts(config.receiptsDir, policy);
  for (const relative of config.artifactPaths) {
    parts(relative, policy);
    check(relative !== config.receiptsDir && !relative.startsWith(config.receiptsDir+'/'), 'receipt_artifact_overlap');
  }
  for (const field of ['workId','revision']) check(typeof config[field] === 'string' && /^[A-Za-z0-9_.-]{1,128}$/u.test(config[field]), 'invalid_work_identity');
  return { config, root };
}
export function capture(event, configPath) {
  const policy = loadPolicy();
  check(event && typeof event === 'object' && !Array.isArray(event), 'invalid_event');
  if (event.hook_event_name !== 'PostToolUse' || !policy.supportedTools.includes(event.tool_name)) return {};
  const { config, root } = loadConfig(configPath, policy);
  let total = 0;
  const artifacts = [...config.artifactPaths].sort().map(relativePath => {
    const bytes = regularBytes(resolveWithin(root, relativePath, false, policy), Math.min(policy.maxArtifactBytes, policy.maxTotalArtifactBytes-total));
    total += bytes.length; check(total <= policy.maxTotalArtifactBytes, 'artifact_total_limit');
    return { relativePath, bytes: bytes.length, sha256: hash(bytes) };
  });
  const receipt = { schemaVersion:1, protocol:'kim-artifact-byte-snapshot-v1', workId:config.workId, revision:config.revision,
    configSha256:hash(config), policySha256:hash(policy), artifacts,
    observation:'local_file_bytes', qualityVerification:'not_performed', finalAcceptance:'not_decided' };
  const sha = hash(receipt); const output = Buffer.from(JSON.stringify(receipt,null,2)+'\n');
  const directory = resolveWithin(root, config.receiptsDir, true, policy);
  const target = path.join(directory, `${sha}.json`);
  try { fs.writeFileSync(target, output, { flag:'wx', mode:0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    check(regularBytes(target, output.length).equals(output), 'existing_receipt_conflict');
  }
  return { hookSpecificOutput:{hookEventName:'PostToolUse',additionalContext:`Local artifact byte snapshot recorded for ${artifacts.length} configured file(s), SHA256 ${sha}. Content quality and final acceptance are not decided.`} };
}
async function eventFromStdin(policy) {
  return new Promise((resolve,reject)=>{
    const chunks=[];let size=0,done=false;
    const finish=(error,value)=>{
      if(done)return;done=true;clearTimeout(timer);
      process.stdin.removeListener('data',onData);process.stdin.removeListener('end',onEnd);process.stdin.removeListener('error',onError);
      if(error){process.stdin.destroy();reject(error);}else resolve(value);
    };
    const onError=()=>finish(Object.assign(new Error('event_read_failed'),{code:'event_read_failed'}));
    const onData=chunk=>{size+=chunk.length;if(size>policy.maxEventBytes)finish(Object.assign(new Error('event_size_limit'),{code:'event_size_limit'}));else chunks.push(chunk);};
    const onEnd=()=>{try {finish(null,JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))));}catch{finish(Object.assign(new Error('invalid_event'),{code:'invalid_event'}));}};
    const timer=setTimeout(()=>finish(Object.assign(new Error('event_read_timeout'),{code:'event_read_timeout'})),policy.readTimeoutMs);
    process.stdin.on('data',onData);process.stdin.once('end',onEnd);process.stdin.once('error',onError);
  });
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    check(process.argv.length === 4 && process.argv[2] === '--config', 'config_argument_required');
    const event = await eventFromStdin(loadPolicy());
    process.stdout.write(JSON.stringify(capture(event,process.argv[3]))+'\n');
  } catch (error) {
    const code = /^[a-z_]{1,64}$/u.test(String(error.code)) ? error.code : 'receipt_failed';
    process.stderr.write(JSON.stringify({protocol:'kim-artifact-byte-snapshot-v1',status:'not_recorded',code})+'\n');
    process.stdout.write('{}\n');
  }
}
