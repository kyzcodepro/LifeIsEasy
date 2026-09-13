import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const entryPoints = readdirSync(new URL('../tests/', import.meta.url))
  .filter((f) => /\.test\.tsx?$/.test(f))
  .map((f) => `tests/${f}`);

const outdir = fileURLToPath(new URL('../node_modules/.tmp/tests/', import.meta.url));
// On repart d'un dossier vide : sinon le bundle d'un test supprimé continuerait
// d'être exécuté, et un fichier effacé passerait pour vert indéfiniment.
rmSync(outdir, { recursive: true, force: true });
await build({ absWorkingDir: root, entryPoints, bundle: true, platform: 'node', format: 'cjs', outdir, outExtension: { '.js': '.cjs' }, jsx: 'automatic', logLevel: 'warning' });

const files = readdirSync(outdir).filter((f) => f.endsWith('.cjs')).map((f) => `${outdir}${f}`);
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
