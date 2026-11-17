// Tiny check helper shared by every scenario. Prints one line per check, which
// e2e/run.mjs parses: "PASS  name  (detail)", "FAIL  ...", "SKIP  ...".
'use strict';

let failed = 0;

const print = (status, name, detail) =>
  console.log(`${status}  ${name}${detail ? `  (${detail})` : ''}`);

/** Record a check. `detail` is shown in parentheses (handy for actual values). */
exports.check = (name, ok, detail) => {
  if (!ok) failed++;
  print(ok ? 'PASS' : 'FAIL', name, detail);
  return ok;
};

/** Record a check that was deliberately not run. */
exports.skip = (name, reason) => print('SKIP', name, reason);

/** Run an async check; an exception counts as a failure with its message. */
exports.attempt = async (name, fn) => {
  try {
    const result = await fn();
    const [ok, detail] = Array.isArray(result) ? result : [result];
    return exports.check(name, ok, detail);
  } catch (error) {
    return exports.check(name, false, `threw: ${error && error.message}`);
  }
};

/** Set the exit code from the results. Call at the end of each scenario. */
exports.done = () => {
  if (failed > 0) process.exitCode = 1;
};

/** Encode a FormData exactly as Node's fetch sends it; returns the raw body and boundary. */
exports.encodeForm = async (form) => {
  const request = new Request('http://localhost/', { method: 'POST', body: form });
  const contentType = request.headers.get('content-type');
  return {
    body: Buffer.from(await request.arrayBuffer()),
    boundary: contentType.split('boundary=')[1],
    contentType,
  };
};

exports.sha256 = (data) =>
  require('node:crypto').createHash('sha256').update(data).digest('hex');

/** Node major version, for scenarios that depend on it. */
exports.nodeMajor = Number(process.versions.node.split('.')[0]);
