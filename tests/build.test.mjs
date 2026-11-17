import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const projectRoot = fileURLToPath(new URL('../', import.meta.url));

test('an HTML-only change gets a new build identity while identical inputs stay stable', async () => {
  const temporaryBase = path.resolve(tmpdir());
  const fixtureRoot = await mkdtemp(path.join(temporaryBase, 'sutra-build-'));
  try {
    await Promise.all(['scripts', 'src/js', 'src/css', 'data', 'public/cards'].map((directory) =>
      mkdir(path.join(fixtureRoot, directory), { recursive: true })));
    await copyFile(path.join(projectRoot, 'scripts/build.mjs'), path.join(fixtureRoot, 'scripts/build.mjs'));
    const template = '<!doctype html><html><head><meta name="app-build" content="{{BUILD_ID}}"><link rel="stylesheet" href="{{CSS_URL}}"></head><body><h1>Initial title</h1><script type="module" src="{{JS_URL}}"></script></body></html>';
    await Promise.all([
      writeFile(path.join(fixtureRoot, 'index.template.html'), template),
      writeFile(path.join(fixtureRoot, 'src/js/app.js'), 'import { lesson } from "./lesson.js"; console.log(lesson);'),
      writeFile(path.join(fixtureRoot, 'src/js/lesson.js'), 'export const lesson = "unchanged";'),
      ...['tokens', 'base', 'components'].map((name) => writeFile(path.join(fixtureRoot, 'src/css', `${name}.css`), `/* ${name} */`)),
      writeFile(path.join(fixtureRoot, 'data/sutras.json'), '[{"id":"01","cardPath":"cards/card-01.webp"}]'),
      writeFile(path.join(fixtureRoot, 'public/cards/card-01.webp'), Buffer.from('fixture-card-bytes')),
    ]);
    const environment = { ...process.env, OUT_DIR: 'dist' };
    delete environment.BUILD_ID;
    async function build() {
      await run(process.execPath, ['scripts/build.mjs'], { cwd: fixtureRoot, env: environment, timeout: 10000 });
      const version = JSON.parse(await readFile(path.join(fixtureRoot, 'dist/version.json'), 'utf8'));
      const html = await readFile(path.join(fixtureRoot, 'dist/index.html'), 'utf8');
      assert.ok(html.includes(`content="${version.buildId}"`), 'HTML and version.json must identify the same build');
      return { buildId: version.buildId, html };
    }
    const first = await build();
    const identical = await build();
    assert.equal(identical.buildId, first.buildId, 'unchanged inputs should not cause an open-tab refresh');

    await writeFile(path.join(fixtureRoot, 'index.template.html'), template.replace('Initial title', 'Revised title'));
    const changed = await build();
    assert.ok(changed.html.includes('<h1>Revised title</h1>'));
    assert.notEqual(changed.buildId, first.buildId, 'HTML-only releases must be visible to open tabs');
  } finally {
    const cleanupTarget = path.resolve(fixtureRoot);
    const relativeTarget = path.relative(temporaryBase, cleanupTarget);
    assert.ok(relativeTarget && !relativeTarget.startsWith('..') && !path.isAbsolute(relativeTarget), 'cleanup must stay inside the intended temporary directory');
    assert.ok(path.basename(cleanupTarget).startsWith('sutra-build-'), 'cleanup must target this test fixture');
    await rm(cleanupTarget, { recursive: true, force: true });
  }
});
