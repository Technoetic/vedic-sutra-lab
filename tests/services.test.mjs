import test from 'node:test';
import assert from 'node:assert/strict';
import { VersionService } from '../src/js/services/VersionService.js';
import { ProgressService } from '../src/js/services/ProgressService.js';
import { CourseService } from '../src/js/services/CourseService.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const response = (body, ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => body });
const version = (buildId, options = {}) => new VersionService({
  loadedBuild: 'build-A',
  versionURL: 'https://example.test/lab/version.json',
  fetcher: async () => response({ buildId }),
  ...options,
});

function memoryStorage(initial = null) {
  const entries = new Map();
  return {
    getItem(key) { return entries.has(key) ? entries.get(key) : initial; },
    setItem(key, value) { entries.set(key, value); },
  };
}

function catalog() {
  return ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16'].map((id) => ({
    id, name: `수트라 ${id}`, title: '계산을 관찰하기', summary: '입력에 따른 계산 과정',
    category: '기초', tags: ['곱셈'], tip: '숫자를 바꿔 보세요.', condition: '정수 입력',
    defaults: { a: 12, mode: 'correct' },
    controls: [
      { key: 'a', label: '첫 수', type: 'number', min: 1, max: 99, step: 1 },
      { key: 'mode', label: '검산', type: 'select', options: [{ value: 'correct', label: '일치' }] },
    ],
    visual: 'cross', sourceUrl: 'https://example.test/source', cardPath: `cards/card-${id}.webp`,
  }));
}

test('version checks request fresh data and keep the HTML build identity fixed', async () => {
  const builds = ['build-B', 'build-A'];
  const service = version('unused', { fetcher: async (url, options) => {
    assert.equal(url.split('?')[0], 'https://example.test/lab/version.json');
    assert.ok(new URL(url).searchParams.get('_fresh'));
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal instanceof AbortSignal);
    return response({ buildId: builds.shift() });
  } });
  assert.deepEqual(await service.check(), { changed: true, build: 'build-B' });
  assert.deepEqual(await service.check(), { changed: false, build: 'build-A' });
  assert.equal(service.loadedBuild, 'build-A');
});

test('a rollback is a changed build too', async () => {
  const service = version('build-000');
  assert.deepEqual(await service.check(), { changed: true, build: 'build-000' });
});

test('failed version checks keep the loaded application usable', async (t) => {
  const failures = [
    ['HTTP failure', async () => response({ buildId: 'build-B' }, false)],
    ['invalid JSON', async () => ({ ok: true, json: async () => { throw new SyntaxError('bad JSON'); } })],
    ['missing build', async () => response({})],
    ['numeric build', async () => response({ buildId: 7 })],
    ['empty build', async () => response({ buildId: ' ' })],
    ['network failure', async () => { throw new Error('offline'); }],
  ];
  for (const [name, fetcher] of failures) await t.test(name, async () => {
    const service = version('unused', { fetcher });
    const result = await service.check();
    assert.equal(result.changed, false);
    assert.equal(typeof result.error, 'string');
    assert.ok(result.error.length > 0);
    assert.equal(service.loadedBuild, 'build-A');
    assert.equal(await service.beforeNavigate('https://example.test/lab/#/about'), 'spa');
  });
});

test('version checks time out and abort the request', async () => {
  let requestSignal;
  const service = version('unused', { timeoutMs: 15, fetcher: async (_url, { signal }) => {
    requestSignal = signal;
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  } });
  const result = await service.check();
  assert.equal(result.changed, false);
  assert.equal(typeof result.error, 'string');
  assert.equal(requestSignal.aborted, true);
});

test('an unchanged clean navigation stays in the SPA without committing a document', async () => {
  let commits = 0;
  assert.equal(await version('build-A').beforeNavigate('https://example.test/lab/#/about', {
    commit: () => { commits += 1; }, isDirty: () => false, isSaving: () => false,
  }), 'spa');
  assert.equal(commits, 0);
});

test('a changed build commits a fresh full-document URL, retaining query and destination hash', async () => {
  const commits = [];
  const service = version('build-B');
  const options = { commit: (...args) => commits.push(args), replace: true };
  const target = 'https://example.test/lab/?filter=all&_build=old&_nav=old#/sutra/03';
  assert.equal(await service.beforeNavigate(target, options), 'document');
  assert.equal(await service.beforeNavigate(target, options), 'document');
  assert.equal(commits.length, 2);
  const [firstURL, replace] = commits[0];
  const first = new URL(firstURL);
  const second = new URL(commits[1][0]);
  assert.equal(first.origin + first.pathname, 'https://example.test/lab/');
  assert.equal(first.hash, '#/sutra/03');
  assert.equal(first.searchParams.get('filter'), 'all');
  assert.equal(first.searchParams.get('_build'), 'build-B');
  assert.ok(first.searchParams.get('_nav'));
  assert.notEqual(first.searchParams.get('_nav'), second.searchParams.get('_nav'));
  assert.notEqual(first.search, new URL(target).search);
  assert.equal(replace, true);
});

test('a background check never initiates a document transition', async () => {
  const service = version('build-B');
  assert.equal((await service.check()).changed, true);
  assert.equal(service.loadedBuild, 'build-A');
});

for (const state of ['dirty', 'saving']) {
  test(`navigation rechecks ${state} state after the version request resolves`, async () => {
    const pending = deferred();
    let dirty = false;
    let saving = false;
    let commits = 0;
    const notices = [];
    const service = version('unused', { fetcher: () => pending.promise });
    const navigation = service.beforeNavigate('https://example.test/lab/#/sutra/02', {
      isDirty: () => dirty, isSaving: () => saving,
      commit: () => { commits += 1; }, notify: (message) => notices.push(message),
    });
    if (state === 'dirty') dirty = true;
    else saving = true;
    pending.resolve(response({ buildId: 'build-B' }));
    assert.equal(await navigation, 'blocked');
    assert.equal(commits, 0);
    assert.equal(notices.length, 1);
    assert.equal(typeof notices[0], 'string');
  });
}

test('dirty inputs block ordinary navigation even when the version request fails', async () => {
  let notices = 0;
  const service = version('unused', { fetcher: async () => { throw new Error('offline'); } });
  const outcome = await service.beforeNavigate('https://example.test/lab/#/about', {
    isDirty: () => true, isSaving: () => false,
    commit: () => assert.fail('dirty inputs must remain in the document'),
    notify: () => { notices += 1; },
  });
  assert.equal(outcome, 'blocked');
  assert.equal(notices, 1);
});

test('an unchanged version still blocks navigation while a save is in flight', async () => {
  const service = version('build-A');
  assert.equal(await service.beforeNavigate('https://example.test/lab/#/about', {
    isSaving: () => true, notify: () => {},
    commit: () => assert.fail('an in-flight save must not lose its document'),
  }), 'blocked');
});

test('progress starts empty and explicitly saved values survive a reload', async () => {
  const storage = memoryStorage();
  const first = new ProgressService(storage);
  first.load();
  assert.deepEqual([...first.visited], []);
  assert.deepEqual(first.values, {});
  assert.equal(await first.save('03', { a: 42, mode: 'correct' }), true);
  const restored = new ProgressService(storage);
  restored.load();
  assert.deepEqual([...restored.visited], ['03']);
  assert.deepEqual(restored.values, { '03': { a: 42, mode: 'correct' } });
  assert.equal(restored.error, null);
});

test('progress promotes values and visited state only after persistence succeeds', async () => {
  const pending = deferred();
  const storage = memoryStorage();
  storage.setItem = () => pending.promise;
  const service = new ProgressService(storage);
  const draft = { a: 12 };
  const save = service.save('01', draft);
  draft.a = 99;
  assert.equal(service.saving, true);
  assert.deepEqual(service.values, {});
  assert.equal(service.visited.has('01'), false);
  pending.resolve();
  assert.equal(await save, true);
  assert.deepEqual(service.values, { '01': { a: 12 } });
  assert.equal(service.visited.has('01'), true);
  assert.equal(service.saving, false);
});

test('quota failures preserve the last successful save and expose an error', async () => {
  const storage = memoryStorage();
  const service = new ProgressService(storage);
  await service.save('01', { a: 12 });
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(await service.save('01', { a: 88 }), false);
  assert.deepEqual(service.values, { '01': { a: 12 } });
  assert.equal(service.saving, false);
  assert.match(service.error, /QuotaExceededError/);
});

test('queued saves preserve both records and keep saving true until the queue drains', async () => {
  const releases = [];
  const stored = memoryStorage();
  const storage = { getItem: stored.getItem, setItem: async (key, value) => {
    const next = deferred();
    releases.push(next);
    await next.promise;
    stored.setItem(key, value);
  } };
  const service = new ProgressService(storage);
  const first = service.save('01', { a: 11 });
  const second = service.save('02', { a: 22 });
  await Promise.resolve();
  releases[0].resolve();
  await first;
  assert.equal(service.saving, true);
  await Promise.resolve();
  releases[1].resolve();
  await second;
  assert.equal(service.saving, false);
  const restored = new ProgressService(stored);
  restored.load();
  assert.deepEqual(restored.values, { '01': { a: 11 }, '02': { a: 22 } });
  assert.deepEqual([...restored.visited], ['01', '02']);
});

test('corrupt or invalid persisted progress resets safely without claiming saved values', async (t) => {
  for (const saved of ['{broken', '{}', '{"version":1,"visited":"01","values":{}}', '{"version":1,"visited":["99"],"values":{}}', '{"version":1,"visited":["01"],"values":{"01":{"a":null}}}']) {
    await t.test(saved, () => {
      const service = new ProgressService(memoryStorage(saved));
      assert.doesNotThrow(() => service.load());
      assert.deepEqual([...service.visited], []);
      assert.deepEqual(service.values, {});
      assert.equal(typeof service.error, 'string');
    });
  }
});

test('private-mode storage reads and writes fail without crashing the current session', async () => {
  const service = new ProgressService({
    getItem() { throw new Error('storage denied'); },
    setItem() { throw new Error('storage denied'); },
  });
  assert.doesNotThrow(() => service.load());
  assert.match(service.error, /storage denied/);
  assert.equal(await service.save('01', { a: 12 }), false);
  assert.deepEqual(service.values, {});
});

test('accessing default localStorage in a private browser does not throw from construction', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try {
    let service;
    assert.doesNotThrow(() => { service = new ProgressService(); service.load(); });
    assert.equal(typeof service.error, 'string');
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('invalid draft values cannot overwrite a valid saved record', async () => {
  const service = new ProgressService(memoryStorage());
  await service.save('01', { a: 12 });
  assert.equal(await service.save('01', { a: Number.NaN }), false);
  assert.equal(await service.save('99', { a: 12 }), false);
  assert.deepEqual(service.values, { '01': { a: 12 } });
  assert.equal(service.saving, false);
});

test('the course loader returns all 16 validated records and passes cancellation through', async () => {
  const controller = new AbortController();
  const data = catalog();
  data[0].controls.push({ key: 'denominator', label: '분모', type: 'select', options: [{ value: 7, label: '7' }] });
  data[0].defaults.denominator = 7;
  const service = new CourseService({ url: '/data/sutras.json', fetcher: async (url, options) => {
    assert.equal(url.split('?')[0], '/data/sutras.json');
    assert.ok(new URL(url,'https://example.test').searchParams.get('_fresh'));
    assert.equal(options.signal, controller.signal);
    assert.equal(options.cache, 'no-store');
    return response(data);
  } });
  assert.deepEqual(await service.load({ signal: controller.signal }), data);
});

test('the course loader rejects an HTTP error rather than showing untrusted response data', async () => {
  const service = new CourseService({ url: '/data/sutras.json', fetcher: async () => response(catalog(), false) });
  await assert.rejects(service.load(), /HTTP.*503/i);
});

test('the course loader rejects incomplete, duplicate, or malformed catalog records', async (t) => {
  const cases = [
    ['empty', () => []],
    ['non-array', () => ({ records: catalog() })],
    ['missing entry', () => catalog().slice(1)],
    ['duplicate id', () => { const data = catalog(); data[1].id = '01'; return data; }],
    ['out-of-range id', () => { const data = catalog(); data[0].id = '99'; return data; }],
    ['missing text', () => { const data = catalog(); delete data[0].summary; return data; }],
    ['wrong tags', () => { const data = catalog(); data[0].tags = '곱셈'; return data; }],
    ['wrong category', () => { const data = catalog(); data[0].category = 'anything'; return data; }],
    ['bad default', () => { const data = catalog(); data[0].defaults.a = null; return data; }],
    ['missing default', () => { const data = catalog(); delete data[0].defaults.a; return data; }],
    ['empty controls', () => { const data = catalog(); data[0].controls = []; return data; }],
    ['duplicate control', () => { const data = catalog(); data[0].controls.push({ ...data[0].controls[0] }); return data; }],
    ['bad numeric range', () => { const data = catalog(); data[0].controls[0].max = '99'; return data; }],
    ['empty select', () => { const data = catalog(); data[0].controls[1].options = []; return data; }],
    ['bad select value', () => { const data = catalog(); data[0].controls[1].options[0].value = {}; return data; }],
    ['missing visual', () => { const data = catalog(); delete data[0].visual; return data; }],
  ];
  for (const [name, make] of cases) await t.test(name, async () => {
    const service = new CourseService({ url: '/data/sutras.json', fetcher: async () => response(make()) });
    await assert.rejects(service.load(), /catalog|course|schema|record|sutra/i);
  });
});

test('an already aborted course request never fetches', async () => {
  const controller = new AbortController();
  controller.abort();
  const service = new CourseService({ url: '/data/sutras.json', fetcher: () => assert.fail('aborted request must not fetch') });
  await assert.rejects(service.load({ signal: controller.signal }), { name: 'AbortError' });
});

test('a course response that arrives after cancellation is discarded', async () => {
  const pending = deferred();
  const controller = new AbortController();
  const service = new CourseService({ url: '/data/sutras.json', fetcher: async () => ({ ok: true, json: () => pending.promise }) });
  const load = service.load({ signal: controller.signal });
  await Promise.resolve();
  controller.abort();
  pending.resolve(catalog());
  await assert.rejects(load, { name: 'AbortError' });
});
