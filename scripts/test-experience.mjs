import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../node_modules/.tmp/experience-tests.cjs', import.meta.url));
await build({ absWorkingDir: root, entryPoints: ['tests/experience.test.tsx'], bundle: true, platform: 'node', format: 'cjs', outfile: output, jsx: 'automatic', logLevel: 'warning' });
const result = spawnSync(process.execPath, ['--test', output], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
