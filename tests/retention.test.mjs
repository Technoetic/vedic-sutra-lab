import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { retainAssets } from '../scripts/retain-assets.mjs';

const run = promisify(execFile);
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const baseURL = 'https://technoetic.github.io/vedic-sutra-lab/';
const isManifestURL = (url) => new URL(url).pathname === '/vedic-sutra-lab/asset-manifest.json';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const manifestResponse = (manifest, status = 200) => ({ ok: status >= 200 && status < 300, status, url: baseURL + 'asset-manifest.json', json: async () => manifest });
const assetResponse = (bytes, url) => ({ ok: true, status: 200, url, arrayBuffer: async () => Uint8Array.from(bytes).buffer });

function asset(content, basename = 'old', extension = 'js') {
  const bytes = Buffer.from(content);
  const sha256 = digest(bytes);
  return { bytes, file: { path: `assets/${basename}.${sha256.slice(0, 12)}.${extension}`, sha256, bytes: bytes.length } };
}

async function temporaryFixture(callback) {
  const temporaryBase = path.resolve(tmpdir());
  const directory = await mkdtemp(path.join(temporaryBase, 'sutra-retention-'));
  try {
    return await callback(directory);
  } finally {
    const cleanupTarget = path.resolve(directory);
    const relativeTarget = path.relative(temporaryBase, cleanupTarget);
    assert.ok(relativeTarget && !relativeTarget.startsWith('..') && !path.isAbsolute(relativeTarget), 'cleanup stays within the intended temporary directory');
    assert.ok(path.basename(cleanupTarget).startsWith('sutra-retention-'), 'cleanup targets this generated fixture');
    await rm(cleanupTarget, { recursive: true, force: true });
  }
}

test('a missing published manifest is the only first-deployment skip', async () => temporaryFixture(async (destination) => {
  const result = await retainAssets({ baseURL, destination, fetcher: async (url, options) => {
    assert.equal(isManifestURL(url), true);
    assert.equal(options.cache, 'no-store');
    assert.equal(options.redirect, 'error');
    return manifestResponse(null, 404);
  } });
  assert.deepEqual(result, { status: 'first-deploy', files: 0, bytes: 0 });
  assert.deepEqual(await readdir(destination), []);
}));

test('each manifest request has a unique freshness query while preserving the publication path', async () => temporaryFixture(async (destination) => {
  const requests = [];
  const fetcher = async (url) => {
    requests.push(new URL(url));
    return manifestResponse({ schema: 1, files: [] });
  };
  await retainAssets({ baseURL, destination, fetcher });
  await retainAssets({ baseURL, destination, fetcher });
  for (const url of requests) {
    assert.equal(url.origin, 'https://technoetic.github.io');
    assert.equal(url.pathname, '/vedic-sutra-lab/asset-manifest.json');
    assert.ok(url.searchParams.get('_fresh'), 'manifest requests must bypass a previously cached directory response');
  }
  assert.notEqual(requests[0].searchParams.get('_fresh'), requests[1].searchParams.get('_fresh'));
}));

test('authentication, server, and network failures stop retention', async (t) => {
  for (const status of [401, 403, 500]) await t.test(`HTTP ${status}`, async () => temporaryFixture(async (destination) => {
    await assert.rejects(retainAssets({ baseURL, destination, fetcher: async () => manifestResponse(null, status) }), new RegExp(`HTTP.*${status}`));
    assert.deepEqual(await readdir(destination), []);
  }));
  await t.test('network failure', async () => temporaryFixture(async (destination) => {
    await assert.rejects(retainAssets({ baseURL, destination, fetcher: async () => { throw new Error('offline'); } }), /offline/);
  }));
});

test('manifest paths, duplicate entries, and integrity metadata are validated before downloading', async (t) => {
  const valid = asset('old module').file;
  const cases = [
    ['wrong schema', { schema: 2, files: [valid] }],
    ['wrong file list', { schema: 1, files: {} }],
    ['traversal', { schema: 1, files: [{ ...valid, path: '../escape.js' }] }],
    ['encoded traversal', { schema: 1, files: [{ ...valid, path: 'assets/%2e%2e/escape.js' }] }],
    ['another origin', { schema: 1, files: [{ ...valid, path: 'https://evil.test/file.js' }] }],
    ['unhashed asset', { schema: 1, files: [{ ...valid, path: 'assets/app.js' }] }],
    ['backslashes', { schema: 1, files: [{ ...valid, path: 'assets\\app.0123456789ab.js' }] }],
    ['duplicates', { schema: 1, files: [valid, { ...valid }] }],
    ['bad digest', { schema: 1, files: [{ ...valid, sha256: 'short' }] }],
    ['bad byte count', { schema: 1, files: [{ ...valid, bytes: -1 }] }],
  ];
  for (const [name, manifest] of cases) await t.test(name, async () => temporaryFixture(async (destination) => {
    await assert.rejects(retainAssets({ baseURL, destination, fetcher: async (url) => {
      assert.equal(isManifestURL(url), true, 'invalid manifest must not trigger asset downloads');
      return manifestResponse(manifest);
    } }), /manifest|asset path|digest|bytes|duplicate/i);
    assert.deepEqual(await readdir(destination), []);
  }));
});

test('downloaded assets must match their complete SHA-256 and byte count before any writes', async (t) => {
  for (const mismatch of ['sha256', 'bytes']) await t.test(mismatch, async () => temporaryFixture(async (destination) => {
    const first = asset('first valid module', 'first');
    const second = asset('second valid module', 'second');
    const badBytes = Buffer.from(mismatch === 'sha256' ? 'second wrong module' : 'short');
    const fetcher = async (url) => {
      if (isManifestURL(url)) return manifestResponse({ schema: 1, files: [first.file, second.file] });
      return assetResponse(url.endsWith(first.file.path) ? first.bytes : badBytes, url);
    };
    await assert.rejects(retainAssets({ baseURL, destination, fetcher }), /sha-?256|hash|digest|length|bytes/i);
    assert.deepEqual(await readdir(destination), [], 'a later corrupt asset must not leave a partially retained set');
  }));
});

test('asset failures and redirects to another origin cannot silently publish an incomplete set', async (t) => {
  const previous = asset('previous module');
  for (const failure of ['missing', 'redirect']) await t.test(failure, async () => temporaryFixture(async (destination) => {
    await assert.rejects(retainAssets({ baseURL, destination, fetcher: async (url) => {
      if (isManifestURL(url)) return manifestResponse({ schema: 1, files: [previous.file] });
      return failure === 'missing' ? { ok: false, status: 404, url } : assetResponse(previous.bytes, 'https://evil.test/redirected.js');
    } }), /HTTP.*404|origin|redirect/i);
    assert.deepEqual(await readdir(destination), []);
  }));
});

test('retention enforces declared count and byte bounds before downloading', async (t) => {
  const previous = asset('previous module');
  await t.test('file count', async () => temporaryFixture(async (destination) => {
    await assert.rejects(retainAssets({ baseURL, destination, maxFiles: 0, fetcher: async () => manifestResponse({ schema: 1, files: [previous.file] }) }), /limit|bound|count/i);
  }));
  await t.test('byte count', async () => temporaryFixture(async (destination) => {
    await assert.rejects(retainAssets({ baseURL, destination, maxTotalBytes: 1, fetcher: async () => manifestResponse({ schema: 1, files: [previous.file] }) }), /limit|bound|bytes/i);
  }));
});

test('old hashed files survive a clean-checkout build and are included alongside current files in the next manifest', async () => temporaryFixture(async (fixtureRoot) => {
  await Promise.all(['scripts', 'src/js', 'src/css', 'data', 'public/cards'].map((directory) => mkdir(path.join(fixtureRoot, directory), { recursive: true })));
  await copyFile(path.join(projectRoot, 'scripts/build.mjs'), path.join(fixtureRoot, 'scripts/build.mjs'));
  await Promise.all([
    writeFile(path.join(fixtureRoot, 'index.template.html'), '<html><head><meta name="app-build" content="{{BUILD_ID}}"><link href="{{CSS_URL}}"></head><body><script type="module" src="{{JS_URL}}"></script></body></html>'),
    writeFile(path.join(fixtureRoot, 'src/js/app.js'), 'console.log("current module");'),
    ...['tokens', 'base', 'components'].map((name) => writeFile(path.join(fixtureRoot, 'src/css', `${name}.css`), `/* current ${name} */`)),
    writeFile(path.join(fixtureRoot, 'data/sutras.json'), '[{"id":"01"}]'),
    writeFile(path.join(fixtureRoot, 'public/cards/card-01.webp'), Buffer.from('current-card')),
  ]);
  const environment = { ...process.env, OUT_DIR: 'dist' };
  delete environment.BUILD_ID;
  const build = async () => {
    await run(process.execPath, ['scripts/build.mjs'], { cwd: fixtureRoot, env: environment, timeout: 10000 });
    return JSON.parse(await readFile(path.join(fixtureRoot, 'dist/version.json'), 'utf8'));
  };
  const firstVersion = await build();
  const previous = asset('previous release module');
  const oldCardBytes = Buffer.from('previous card');
  const oldCardHash = digest(oldCardBytes);
  const oldCard = { path: `cards/card-01.${oldCardHash.slice(0, 12)}.webp`, sha256: oldCardHash, bytes: oldCardBytes.length };
  const destination = path.join(fixtureRoot, 'dist');
  const result = await retainAssets({ baseURL, destination, fetcher: async (url, options) => {
    assert.equal(new URL(url).origin, new URL(baseURL).origin);
    assert.equal(options.redirect, 'error');
    if (isManifestURL(url)) return manifestResponse({ schema: 1, files: [previous.file, oldCard] });
    assert.equal(new URL(url).search, '', 'immutable hashed asset URLs must not get freshness queries');
    return assetResponse(url.endsWith(previous.file.path) ? previous.bytes : oldCardBytes, url);
  } });
  assert.deepEqual(result, { status: 'retained', files: 2, bytes: previous.bytes.length + oldCardBytes.length });
  assert.equal((await readFile(path.join(destination, previous.file.path))).toString(), 'previous release module');
  assert.equal((await readFile(path.join(destination, oldCard.path))).toString(), 'previous card');
  const nextVersion = await build();
  assert.equal(nextVersion.buildId, firstVersion.buildId, 'retained files must not change the current application build identity');
  const manifest = JSON.parse(await readFile(path.join(destination, 'asset-manifest.json'), 'utf8'));
  assert.equal(manifest.schema, 1);
  assert.equal(manifest.files.length, 5);
  assert.deepEqual(manifest.files.map((file) => file.path), manifest.files.map((file) => file.path).sort());
  assert.ok(manifest.files.some((file) => file.path === previous.file.path));
  assert.ok(manifest.files.some((file) => file.path === oldCard.path));
  for (const file of manifest.files) {
    const bytes = await readFile(path.join(destination, file.path));
    assert.equal(file.sha256, digest(bytes));
    assert.equal(file.bytes, bytes.length);
  }
}));

test('the retention CLI requires an explicit publication base URL', async () => temporaryFixture(async (destination) => {
  const environment = { ...process.env };
  delete environment.RETAIN_BASE_URL;
  await assert.rejects(run(process.execPath, [path.join(projectRoot, 'scripts/retain-assets.mjs'), '--dest', destination], { env: environment }), (error) => {
    assert.match(error.stderr, /baseURL|base URL/i);
    return error.code === 1;
  });
}));
