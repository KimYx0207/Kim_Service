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
  procurement: ['supplier-comparison-analyst', 'supply-chain-planner'],
  operations: ['business-finance-analyst', 'sales-operations-analyst', 'user-researcher', 'hiring-process-designer'],
  engineering: ['data-quality-analyst', 'application-security-reviewer', 'manufacturing-quality-analyst', 'systems-engineering-analyst'],
  sectorOperations: ['sustainability-analyst', 'healthcare-operations-analyst', 'agronomy-planner'],
  softwareDelivery: ['mobile-app-engineer', 'data-pipeline-engineer', 'applied-ai-engineer', 'reliability-engineer', 'test-automation-engineer'],
  designPractice: ['design-system-designer', 'brand-visual-designer'],
  financialResearch: ['financial-modeler', 'accounting-reconciliation-analyst', 'investment-research-analyst'],
  commerceAndEnergy: ['commerce-operations-designer', 'energy-project-analyst'],
  delivery: ['product-architect', 'interaction-designer', 'frontend-engineer', 'backend-data-engineer', 'media-production-engineer', 'quantitative-researcher', 'source-evidence-analyst', 'delivery-verifier']
};

test('the agreed scopes expose bounded industry and task-delivery agent contracts', () => {
  const index = buildCapabilityIndex(root);
  const agents = index.components.filter((component) => component.componentType === 'agent');
  const published = new Set(agents.map((component) => component.id));
  for (const id of Object.values(groups).flat()) assert.ok(published.has(id), `Missing agreed scope: ${id}`);
  // New packages are discovered and checked below without a production role
  // allow-list; keeping an agreed scope is separate from counting all roles.
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
