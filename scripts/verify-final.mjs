import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const output = path.join(root, 'artifacts', 'verification');
fs.mkdirSync(output, { recursive: true });
const stages = {
  lint: ['node_modules/eslint/bin/eslint.js', '.'],
  types: ['node_modules/typescript/bin/tsc', '--noEmit'],
  tests: ['node_modules/vitest/vitest.mjs', 'run'],
  build: ['node_modules/next/dist/bin/next', 'build'],
};
const results = [];
(async () => {
  for (const name of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(stages)) {
    if (!stages[name]) throw new Error(`Unknown stage: ${name}`);
    const descriptor = fs.openSync(path.join(output, `${name}.log`), 'w');
    const started = new Date().toISOString();
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, stages[name], {
        cwd: root, windowsHide: true,
        env: { ...process.env, ...(name === 'build' ? { PORTFOLIO_OFFLINE_BUILD: 'true' } : {}) },
        stdio: ['ignore', descriptor, descriptor],
      });
      child.on('error', reject);
      child.on('exit', resolve);
    });
    fs.closeSync(descriptor);
    results.push({ stage: name, started, ended: new Date().toISOString(), code });
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
    console.log(`${name}: ${code === 0 ? 'PASS' : 'FAIL'}`);
    if (code !== 0) { process.exitCode = 1; break; }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
