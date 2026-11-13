import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildCapabilityIndex } from './capability-catalog.mjs';

function file(root, relative) {
  if (typeof relative !== 'string' || /[\\:\x00-\x1f]/u.test(relative) || relative.split('/').some(part=>!part || part==='.' || part==='..')) throw new Error('Helper descriptor requires a safe relative path');
  let current=root;
  for (const [index,part] of relative.split('/').entries()) {
    current=path.join(current,part); const stat=fs.lstatSync(current);
    if (stat.isSymbolicLink() || (index===relative.split('/').length-1 ? !stat.isFile() : !stat.isDirectory())) throw new Error('Helper descriptor must reference regular files');
  }
  const contents=fs.readFileSync(current);
  return { path:relative, sha256:crypto.createHash('sha256').update(contents).digest('hex'), contents };
}
/** Canonical contracts are read afresh. No parallel capability registry. */
export function exportServiceCapabilities(root) {
  const index=buildCapabilityIndex(root);
  return { schemaVersion:1, protocol:'kim-service-capabilities-v1', source:'canonical-capability-contracts',
    componentCount:index.componentCount, capabilityCount:index.capabilityCount, components:index.components,
    capabilities:index.capabilities.map(capability=> {
      if (!capability.helperContract) return { ...capability, helper:null };
      const descriptor=file(root,`${capability.componentPath}/${capability.helperContract}`);
      const contract=JSON.parse(descriptor.contents.toString('utf8'));
      if (contract.protocol!=='kim-service-helper-v1') return { ...capability, helper:null };
      if (contract.schemaVersion!==1 || contract.capabilityId!==capability.id || contract.invocation?.runtime!=='node' ||
        JSON.stringify(contract.invocation.argv)!==JSON.stringify(['--input-json','-']) || contract.invocation.shell!==false ||
        contract.invocation.inputTransport!=='stdin_json' || contract.invocation.outputTransport!=='stdout_json') throw new Error('Unsupported Service helper invocation');
      const metadata=relative=>{const {contents,...reference}=file(root,`${capability.componentPath}/${relative}`);return reference;};
      const entrypoint=metadata(contract.invocation.entrypoint);
      return { ...capability, helper: { schemaVersion:1, protocol:contract.protocol, contractPath:descriptor.path, contractSha256:descriptor.sha256,
        invocation:{...contract.invocation,entrypoint:entrypoint.path}, entrypointSha256:entrypoint.sha256,
        inputSchema:metadata(contract.inputSchema), outputSchema:metadata(contract.outputSchema), policy:metadata(contract.policy),
        authority:contract.authority, componentContentSha256:capability.componentContentSha256 } };
    }) };
}
