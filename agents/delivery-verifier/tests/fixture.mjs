import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
// Only tests/demo write these explicitly synthetic files, never the verifier.
export function fixture() {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'delivery-verifier-'));
  const request = { schemaVersion: 1, taskId: 'demo-task', artifacts: [], criteria: [] };
  const put = (id, relative, content) => {
    const bytes = Buffer.isBuffer(content) ? content : Buffer.from(typeof content === 'string' ? content : JSON.stringify(content));
    fs.writeFileSync(path.join(root, relative), bytes);
    const artifact = { id, path: relative, bytes: bytes.length, sha256: digest(bytes) };
    const existing = request.artifacts.findIndex(item => item.id === id);
    if (existing < 0) request.artifacts.push(artifact); else request.artifacts[existing] = artifact;
    return artifact;
  };
  const input = { items: ['alpha', 'beta', 'gamma'] };
  const inputRef = put('input', 'input.json', input);
  // An actual, deterministic local demo calculation; not an external runtime test.
  const report = { count: input.items.length };
  const reportRef = put('report', 'report.json', report);
  const receipt = { schemaVersion: 1, taskId: request.taskId, tool: 'demo-count', toolVersion: '0.1.0',
    invocationId: 'demo-invocation', inputSha256: inputRef.sha256, status: 'completed', exitCode: 0,
    outputArtifacts: [{ id: reportRef.id, bytes: reportRef.bytes, sha256: reportRef.sha256 }], result: report };
  put('receipt', 'receipt.json', receipt);
  request.criteria = [
    { id: 'file', description: 'Report integrity', type: 'artifact_integrity', artifactId: 'report' },
    { id: 'count', description: 'Expected count in actual output', type: 'json_equals', artifactId: 'report', pointer: '/count', equals: 3 },
    { id: 'receipt', description: 'Bound local receipt fields', type: 'tool_receipt', receiptArtifactId: 'receipt', inputArtifactId: 'input',
      outputArtifactIds: ['report'], tool: 'demo-count', toolVersion: '0.1.0', invocationId: 'demo-invocation', assertions: [{ pointer: '/result/count', equals: 3 }] }
  ];
  return { root, request, receipt, put, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}
