# Artifact verification v1

## Scope and binding

This component-owned protocol is separate from capability.invocation (the repository currently defines that field for Python only). It does not expand the Agent's Read permission. The caller verifies the package source/version/hash, binds a fixed Node executable and this script with shell=false, and supplies a task-authorized, stable artifact directory. No command from the task JSON is evaluated.

```sh
node scripts/verify.mjs --artifact-root /absolute/authorized/artifacts --input-json -
```

The root argument is a host binding, not proof of authorization. It must be an absolute, normalized path other than the filesystem root, without symlink ancestors. The helper does not look for directories, infer the user's home, enumerate contents, create locks, or obtain permissions. The caller must use a stable read-only snapshot or its existing lock and OS controls. This is not a filesystem sandbox and cannot guarantee protection from hostile concurrent path replacement, privileged mutation, mount changes or misleading receipt sources. Atime updates by the filesystem may occur on reads.

Node 22+ on POSIX with O_NOFOLLOW and O_NONBLOCK is required; unsupported safe-open flags block execution. Files are inspected with lstat, opened read-only with O_NOFOLLOW/O_NONBLOCK, checked against fstat, bounded-read and checked again. Root/directory identities are checked before and after reading. Symlinks, hardlinks and non-regular files are rejected. No network, arbitrary commands, paid model, persistent state or file writes occur in verify.mjs.

Host status is requires_host_binding and native Agent status is needs_probe. This Node contract is **not automatically compatible with an existing Python-only Meta delivery CLI**. A host adapter is future, separately authorized work; this package does not install one.

## Input

UTF-8 stdin is exactly one JSON object. Duplicate keys (including escape-equivalent names), unknown envelope/manifest/criterion fields, invalid UTF-8, nonfinite numbers, unsafe integers, excessive depth and malformed JSON are rejected. No `approved`, `passed`, root, command, permission or runtime flag is accepted in task JSON.

```json
{
  "schemaVersion": 1,
  "taskId": "demo-task",
  "artifacts": [{"id":"note", "path":"note.txt", "bytes":3, "sha256":"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"}],
  "criteria": [
    {"id":"integrity", "description":"File matches the agreed manifest", "type":"artifact_integrity", "artifactId":"note"},
    {"id":"style", "description":"Human review of writing", "type":"external_review", "capability":"human-review"}
  ]
}
```

This example expects the three bytes `abc`; it is a design sample, not an execution record. `node scripts/demo.mjs` creates real synthetic input/output/receipt files in its own temporary directory, invokes the fixed helper and cleans up. Demo/test code writes fixtures; production verify.mjs does not.

Every manifest item is checked, even if no criterion directly names it. Ids are 1–80 ASCII letters/digits/dot/underscore/hyphen, starting with a letter or digit. SHA256 is 64 lowercase hex characters. bytes is a nonnegative safe integer. Relative paths use slash-separated, nonempty portable ASCII segments starting with a letter or digit; later characters may include spaces, dot, underscore and hyphen. No dot segments, leading dot, trailing spaces/dots, reserved Windows device names, colon, backslash, absolute path or encoded path syntax. Paths are at most 240 characters and case-insensitively unique. Non-ASCII filenames must be provided as caller-controlled copies under this portable naming convention, outside the helper.

Criteria have unique `id`, a nonblank `description` (at most 500 characters) and exactly one of:

- `artifact_integrity`: `artifactId`. Passes only after actual bytes and hash match the manifest.
- `json_equals`: `artifactId`, `pointer`, `equals`. Reads the verified file as strict JSON and compares the actual RFC 6901 JSON pointer value using structural equality. The empty pointer selects the whole document; arrays use canonical integer indices. No evaluation, regex, JSONPath or command syntax is run. Missing values fail, including when expected is null. Object key order is irrelevant, arrays are ordered, numbers are finite/safe as above. JSON numeric comparison uses JavaScript Number semantics, not arbitrary precision arithmetic.
- `tool_receipt`: `receiptArtifactId`, `inputArtifactId`, `outputArtifactIds`, `tool`, `toolVersion`, `invocationId`, `assertions`. All references must be distinct as input/receipt/output roles, with at least one output; each assertion is exactly `{pointer, equals}`, with a distinct pointer starting `/result/`. Receipt, input and outputs must all pass actual file integrity first.
- `external_review`: `capability`. Always unverified and included in missingCapabilities. This is how human, browser, model or other unavailable review is represented. It cannot be marked passed by the caller. Unknown criterion types are invalid input, not silently ignored.

## Tool receipt evidence

Receipt files use exactly these fields. Tools with a different native receipt format must supply an explicitly mapped evidence envelope through a separately authorized caller adapter. The verifier does not invoke or install that adapter or certify its source.

```json
{
  "schemaVersion": 1,
  "taskId": "demo-task",
  "tool": "demo-count",
  "toolVersion": "0.1.0",
  "invocationId": "demo-invocation",
  "inputSha256": "<sha256 of actual input artifact>",
  "status": "completed",
  "exitCode": 0,
  "outputArtifacts": [{"id":"report", "bytes":12, "sha256":"<sha256 of actual output artifact>"}],
  "result": {"count":3}
}
```

Placeholders here are illustrative and not valid digests. The helper compares task/tool/version/invocation bindings, the verified input hash, completed/exitCode=0, exact output reference set plus each bytes/hash, and every explicit result assertion. A string `passed`, a status-only object, or a matching hash with an incorrect result cannot satisfy this protocol. Unknown receipt fields fail the criterion; result data fields are tool-specific and only explicit assertions are checked. Add json_equals criteria for semantic requirements in output files; the helper cannot infer that a count field proves every item was processed.

Crucially, a self-consistent fabricated envelope **can** pass consistency checks: hashing is not a signature, receipts are not authenticated here, and the verifier did not observe the tool run. `receiptAuthenticity: not_verified` is always emitted. The caller must establish provenance, freshness, input authorization and evidence sufficiency independently before final acceptance. No host/browser/model runtime execution is claimed or inferred.

## Bounds

- stdin: 262144 bytes; 1–64 artifacts; 1–128 criteria; 1–32 assertions per receipt criterion
- One file: at most 8388608 bytes; declared/actual aggregate at most 33554432 bytes (a current bounded read may reach the aggregate guard before stopping)
- Parsed evidence JSON: at most 1048576 bytes; parsed JSON depth at most 32 and values at most 50000
- JSON pointers: at most 500 characters; duplicate ids, aliases and output references rejected

The helper reads only named files, caches at most the bounded verified artifact bytes, and reports sanitized codes rather than exceptions, contents or absolute paths. Evidence files over the JSON bound may still pass integrity checks but cannot satisfy JSON/receipt criteria.

## Output and stop conditions

stdout is one JSON object with schemaVersion, tool/toolVersion, taskId, status, verificationScope, artifactRefs, criterionResults, missingCapabilities, failures, stopReason, handoff, runtimeVerification, receiptAuthenticity, networkUsed=false and filesModified=false. No report file is written.

Each artifactRef contains the manifest reference, actualBytes/actualSha256 (null if unread), status and code. Each criterionResult identifies the standard, type, passed/failed/unverified state, code and evidenceArtifactIds. Failed values and arbitrary material text are not echoed.

- `completed` / exit 0: all manifest integrity checks and every listed criterion pass; stopReason=local_checks_completed; handoff=ready_for_caller_review
- `partial` / exit 1: usable verified file evidence exists, but failures or external-review gaps remain; stopReason=verification_incomplete; handoff=needs_evidence
- `blocked` / exit 2: invalid input/root, unsafe or unstable scope, unsupported safe-open behavior, resource safety failure, or no verifiable file evidence; safety blocks stop further reading

Missing/unreadable files and bytes/hash mismatches are recorded and other safe items continue. Unsafe paths, symlinks, hardlinks, non-regular files and observed mutations block the run. Failures within a well-formed JSON/receipt criterion fail that criterion without rerunning any tool. A file that matches its manifest remains usable integrity evidence even if its JSON is invalid; hence this may be partial rather than blocked.

handoff always leaves decisionOwner=caller_or_meta and finalAcceptance=not_decided. runtimeVerification always says host/browser/model=not_tested, nativeAgent=needs_probe, hostBinding=requires_host_binding. A completed verification does not override these fields or mean that the substantive task, an external action or a model evaluation succeeded.

## Local checks

Run `node tests/contract.test.mjs`, `node tests/verification.test.mjs`, and `node scripts/demo.mjs` in this standalone package. They use only Node built-ins and package files. They cover real files and adversarial failure cases, not an authenticated external tool, native Agent loading, a browser session, or model behavior. Shell binding, authorization, package pinning, concurrency control and final acceptance remain the host's responsibility.
