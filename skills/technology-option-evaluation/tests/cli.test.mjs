import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const entry = fileURLToPath(new URL('../scripts/assess-options.mjs', import.meta.url));
test('malformed input fails without echoing supplied private content', () => {
 const result = spawnSync(process.execPath, [entry, '--input-json', '-'], {input: 'private-customer-phrase', encoding:'utf8'});
 assert.equal(result.status, 1);
 assert.doesNotMatch(result.stdout + result.stderr, /private-cu/);
 assert.equal(JSON.parse(result.stdout).error, 'invalid_json');
});
