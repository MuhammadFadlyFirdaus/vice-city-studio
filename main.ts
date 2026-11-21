// VICE CITY STUDIO — Make.fun gta6-cover-art-01 entry packager (Node 22 stdlib only).
// Deterministically copies the static offline app/ and screenshots/ into /output
// (or MAKEFUN_OUTPUT_DIR locally) and writes /output/dossier.json via the vendored
// makefun-app.ts library unchanged.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const REPO_ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
} as const;

function packageViceCityStudio(sourceRoot: string, outDir: string): void {
  const appSrc = join(sourceRoot, 'app');
  const shotsSrc = join(sourceRoot, 'screenshots');

  mkdirSync(outDir, { recursive: true });
  cpSync(appSrc, join(outDir, 'app'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  if (existsSync(shotsSrc)) {
    cpSync(shotsSrc, join(outDir, 'screenshots'), { recursive: true });
  }

  const dossierBytes = buildDossier(outDir, GATE_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossierBytes);
}

packageViceCityStudio(REPO_ROOT, OUTPUT_DIR);
