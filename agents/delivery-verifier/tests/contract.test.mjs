import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('standalone Agent follows the eight-section readonly pack contract', () => {
  const contract = JSON.parse(read('capability.json')), agent = read('AGENT.md');
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.id, 'delivery-verifier');
  assert.equal(contract.componentType, 'agent');
  assert.equal(contract.componentVersion, '0.1.0');
  assert.equal(contract.entrypoint, 'AGENT.md');
  assert.ok(agent.startsWith('---\nname: delivery-verifier\n'));
  assert.ok(agent.includes('tools: Read\n'));
  assert.equal(agent.includes('\r'), false);
  const lines = agent.trimEnd().split('\n').length;
  assert.ok(lines >= 60 && lines <= 130, `AGENT has ${lines} lines`);
  assert.deepEqual([...agent.matchAll(/^## (.+)$/gm)].map(match => match[1]), [
    '角色定位', '什么情况找我，什么情况别找我', '需要你提供什么', '我会给你什么',
    '工作步骤', '边界与不确定时怎么办', '示例', '交付前自查清单'
  ]);
  assert.ok(read('README.md').trimEnd().split('\n').length <= 40);
  assert.equal(contract.capabilities.length, 1);
  const cap = contract.capabilities[0];
  assert.equal(cap.id, 'delivery-evidence-verify');
  assert.equal(Object.hasOwn(cap, 'invocation'), false);
  assert.deepEqual(cap.permissions, ['filesystem:read-user-materials']);
  assert.deepEqual(cap.sideEffects, []);
  assert.equal(cap.humanGate.required, true);
  for (const term of ['医疗', '法律', '金融', '停']) assert.ok(cap.humanGate.when.join('').includes(term));
  assert.ok(cap.useWhen.length >= 3 && cap.doNotUseWhen.length >= 3);
  for (const shape of [cap.input, cap.output]) {
    assert.ok(shape.required.length > 0);
    for (const name of shape.required) assert.ok(Object.hasOwn(shape.properties, name));
  }
  assert.equal(cap.output.deliveryFormat, 'conceptual-human-delivery');
  assert.deepEqual(cap.validation, ['tests/contract.test.mjs', 'tests/verification.test.mjs']);
  for (const name of ['status', 'artifactRefs', 'criterionResults', 'missingCapabilities', 'failures', 'stopReason', 'handoff'])
    assert.ok(cap.output.required.includes(name));
  for (const name of ['LICENSE', 'NOTICE', 'CHANGELOG.md', 'docs/delivery-api.md', 'scripts/demo.mjs', ...cap.validation]) assert.ok(read(name));
  for (const attribution of ['2025 Michael Sitarzewski', '2026 jnMetaCode', '2026 KimYx0207']) assert.ok(read('LICENSE').includes(attribution));
  assert.match(read('LICENSE'), /MIT License/);
  assert.match(read('NOTICE'), /delivery-verifier/);
  for (const term of ['needs_probe', 'requires_host_binding', 'nativeDecision', 'not_tested']) assert.ok(agent.includes(term));
});

test('Node descriptor requires explicit host binding and never extends current Python invocation schema', () => {
  const cap = JSON.parse(read('capability.json')).capabilities[0];
  assert.equal(cap.deliveryContract, 'delivery-tool.json');
  const descriptor = JSON.parse(read(cap.deliveryContract));
  assert.equal(descriptor.protocol, 'artifact-verification-v1');
  assert.equal(descriptor.toolVersion, '0.1.0');
  assert.deepEqual(descriptor.invocation, { type: 'local_cli', runtime: 'node', entrypoint: 'scripts/verify.mjs',
    argv: ['--artifact-root', '<host-authorized-root>', '--input-json', '-'], inputTransport: 'stdin_json', outputTransport: 'stdout_json', shell: false });
  assert.deepEqual(descriptor.files, ['scripts/verify.mjs']);
  assert.deepEqual(descriptor.sideEffects, []);
  assert.equal(descriptor.networkUsed, false);
  assert.equal(descriptor.filesModified, false);
  assert.equal(descriptor.nativeAgentInvocation, false);
  assert.equal(descriptor.requiresStableSnapshot, true);
  assert.equal(descriptor.hostBinding, 'requires_host_binding');
  assert.equal(descriptor.nativeAgentStatus, 'needs_probe');
  assert.ok(read(descriptor.inputContract));
  const script = read(descriptor.invocation.entrypoint);
  assert.doesNotMatch(script, /node:(?:child_process|net|http|https|tls|dgram)|\b(?:eval|fetch)\s*\(|\bnew\s+Function\b/);
  assert.doesNotMatch(script, /fs\.(?:write|append|mkdir|rm|unlink|rename|chmod|symlink|link|truncate)/);
  assert.match(script, /O_RDONLY/);
  assert.match(script, /O_NOFOLLOW/);
  assert.match(read('docs/delivery-api.md'), /not automatically compatible/);
  assert.match(read('docs/delivery-api.md'), /hashing is not a signature/);
});
