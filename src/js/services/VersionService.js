import { freshURL } from '../shared/freshURL.js';
let navigationSequence = 0;

const messageOf = (error) => error instanceof Error ? error.message : String(error || 'Version check failed');

export class VersionService {
  constructor({ loadedBuild, versionURL, fetcher = globalThis.fetch.bind(globalThis), timeoutMs = 1200 }) {
    if (typeof loadedBuild !== 'string' || !loadedBuild.trim()) throw new TypeError('A loaded HTML build identity is required');
    Object.defineProperty(this, 'loadedBuild', { value: loadedBuild, enumerable: true });
    this.versionURL = versionURL;
    this.fetcher = fetcher;
    this.timeoutMs = timeoutMs;
  }

  async check() {
    const controller = new AbortController();
    let timer;
    try {
      const timeout = new Promise((_resolve, reject) => {
        timer = setTimeout(() => {
          const error = new Error('Version check timed out');
          controller.abort(error);
          reject(error);
        }, this.timeoutMs);
      });
      const request = (async () => {
        const response = await this.fetcher(freshURL(this.versionURL), { cache: 'no-store', signal: controller.signal });
        if (!response?.ok) throw new Error(`Version HTTP ${response?.status ?? 'error'}`);
        const data = await response.json();
        if (!data || Array.isArray(data) || typeof data.buildId !== 'string' || !data.buildId.trim()) {
          throw new Error('Invalid version response');
        }
        return data.buildId;
      })();
      const build = await Promise.race([request, timeout]);
      return { changed: build !== this.loadedBuild, build };
    } catch (error) {
      return { changed: false, error: messageOf(error) };
    } finally {
      clearTimeout(timer);
    }
  }

  async beforeNavigate(target, { commit, finishSave, replace = false } = {}) {
    const result = await this.check();
    if (!result.changed) return 'spa';
    if (finishSave) await finishSave();

    const destination = new URL(target);
    destination.searchParams.set('_build', result.build);
    destination.searchParams.set('_nav', `${Date.now().toString(36)}-${++navigationSequence}`);
    commit(destination.href, replace);
    return 'document';
  }
}
