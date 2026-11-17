import { freshURL } from '../shared/freshURL.js';
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const scalar = (value) => typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
const validId = (id) => typeof id === 'string' && /^(0[1-9]|1[0-6])$/.test(id);

function validControl(control, defaults) {
  if (!record(control) || !text(control.key) || !text(control.label)
    || !Object.hasOwn(defaults, control.key)) return false;
  if (control.type === 'select') {
    return Array.isArray(control.options) && control.options.length > 0
      && control.options.every((option) => record(option) && scalar(option.value) && text(option.label))
      && control.options.some((option) => option.value === defaults[control.key]);
  }
  return ['range', 'number'].includes(control.type)
    && [control.min, control.max, control.step, defaults[control.key]].every((value) => typeof value === 'number' && Number.isFinite(value))
    && control.min <= control.max && control.step > 0
    && defaults[control.key] >= control.min && defaults[control.key] <= control.max;
}

function validSutra(sutra) {
  if (!record(sutra) || !validId(sutra.id)) return false;
  const fields = ['name', 'title', 'summary', 'tip', 'condition', 'visual', 'sourceUrl', 'cardPath'];
  return fields.every((field) => text(sutra[field]))
    && ['기초', '응용', '심화'].includes(sutra.category)
    && Array.isArray(sutra.tags) && sutra.tags.every(text)
    && record(sutra.defaults) && Object.values(sutra.defaults).every(scalar)
    && Array.isArray(sutra.controls) && sutra.controls.length > 0
    && sutra.controls.every((control) => validControl(control, sutra.defaults))
    && new Set(sutra.controls.map((control) => control.key)).size === sutra.controls.length;
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Course request aborted', 'AbortError');
}

export class CourseService {
  constructor({ url, fetcher = globalThis.fetch.bind(globalThis) }) {
    this.url = url;
    this.fetcher = fetcher;
  }

  async load({ signal } = {}) {
    throwIfAborted(signal);
    const response = await this.fetcher(freshURL(this.url), { signal, cache: 'no-store' });
    throwIfAborted(signal);
    if (!response?.ok) throw new Error(`Course HTTP ${response?.status ?? 'error'}`);
    const data = await response.json();
    throwIfAborted(signal);
    if (!Array.isArray(data) || data.length !== 16 || !data.every(validSutra)
      || new Set(data.map((sutra) => sutra.id)).size !== 16) {
      throw new Error('Invalid sutra course catalog schema');
    }
    return data;
  }
}
