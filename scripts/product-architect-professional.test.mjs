import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkComponentMethod } from './check-agent-pack.mjs';

// Repository validation belongs here, so the separately installable component
// keeps all of its own validation files independent of the repository layout.
test('product architect counterexamples bind to live diagnostics and decision rules', () => {
  const component = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../agents/product-architect');
  assert.deepEqual(checkComponentMethod(component), []);
});
