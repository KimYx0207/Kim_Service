import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildCapabilityIndex } from './capability-catalog.mjs';
import { checkAgentPack } from './check-agent-pack.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const groups = {
  media: ['topic-planner', 'headline-cover-optimizer', 'script-writer'],
  ecommerce: ['product-listing-writer', 'customer-service-writer', 'store-performance-analyst'],
  career: ['resume-editor', 'interview-coach', 'workplace-writer'],
  education: ['lesson-planner', 'concept-tutor', 'exercise-designer'],
  business: ['side-business-evaluator', 'launch-planner', 'pricing-cost-analyst'],
  procurement: ['supplier-comparison-analyst'],
  delivery: ['product-architect', 'interaction-designer', 'frontend-engineer', 'backend-data-engineer', 'media-production-engineer', 'quantitative-researcher', 'source-evidence-analyst', 'delivery-verifier']
};

test('the agreed scopes expose bounded industry and task-delivery agent contracts', () => {
  const index = buildCapabilityIndex(root);
  const agents = index.components.filter((component) => component.componentType === 'agent');
  assert.deepEqual(agents.map((component) => component.id).sort(), Object.values(groups).flat().sort());
  for (const component of agents) {
    assert.deepEqual(checkAgentPack(path.join(root, component.path)), [], component.id);
    const capability = index.capabilities.find((entry) => entry.componentId === component.id);
    assert.ok(capability.useWhen.length >= 3 && capability.doNotUseWhen.length >= 3, component.id);
    assert.deepEqual(capability.sideEffects, [], component.id);
    assert.equal(capability.humanGate.required, true, component.id);
  }
});

test('each industry component can run its declared check outside the repository', async (t) => {
  const agents = buildCapabilityIndex(root).components.filter((entry) => entry.componentType === 'agent');
  for (const component of agents) {
    await t.test(component.id, () => {
      const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kim-service-agent-standalone-'));
      try {
        const standalone = path.join(temporaryRoot, component.id);
        fs.cpSync(path.join(root, component.path), standalone, { recursive: true });
        const validationEnv = { ...process.env };
        // Nested test files are independent CLI validations, not children of
        // Node's binary test-runner protocol. Keep failure diagnostics readable.
        delete validationEnv.NODE_TEST_CONTEXT;
        for (const validation of component.validation) {
          const result = spawnSync(process.execPath, [path.join(standalone, validation)], {
            cwd: standalone, encoding: 'utf8', shell: false, env: validationEnv
          });
          assert.ifError(result.error);
          assert.equal(result.status, 0, `${component.id}: ${result.stdout}\n${result.stderr}`);
        }
      } finally {
        assert.equal(path.dirname(temporaryRoot), path.resolve(os.tmpdir()));
        fs.rmSync(temporaryRoot, { recursive: true, force: true });
      }
    });
  }
});
