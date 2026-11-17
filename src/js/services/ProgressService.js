const STORAGE_KEY = 'sutra-lab-progress-v1';
const validId = (id) => typeof id === 'string' && /^(0[1-9]|1[0-6])$/.test(id);
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const controlValue = (value) => typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
const validValues = (values) => record(values) && Object.values(values).every(controlValue);
const messageOf = (error) => error instanceof Error ? error.message : String(error || 'Progress storage failed');

export class ProgressService {
  constructor(storage) {
    this.visited = new Set();
    this.values = {};
    this.saving = false;
    this.error = null;
    this.pendingSaves = 0;
    this.queue = Promise.resolve();
    try {
      this.storage = arguments.length ? storage : globalThis.localStorage;
    } catch (error) {
      this.storageError = error;
      this.error = messageOf(error);
    }
  }

  load() {
    this.visited = new Set();
    this.values = {};
    this.error = null;
    try {
      if (this.storageError) throw this.storageError;
      if (!this.storage?.getItem) throw new Error('Progress storage is unavailable');
      const saved = this.storage.getItem(STORAGE_KEY);
      if (saved === null) return this;
      const data = JSON.parse(saved);
      if (!record(data) || data.version !== 1 || !Array.isArray(data.visited)
        || !data.visited.every(validId) || new Set(data.visited).size !== data.visited.length
        || !record(data.values) || !Object.entries(data.values).every(([id, values]) => validId(id) && validValues(values))) {
        throw new Error('Invalid saved progress');
      }
      this.visited = new Set(data.visited);
      this.values = Object.fromEntries(Object.entries(data.values).map(([id, values]) => [id, { ...values }]));
    } catch (error) {
      this.error = messageOf(error);
    }
    return this;
  }

  async save(id, values) {
    if (!validId(id) || !validValues(values)) {
      this.error = 'Invalid progress values';
      return false;
    }
    const snapshot = { ...values };
    this.pendingSaves += 1;
    this.saving = true;
    const operation = this.queue.then(async () => {
      try {
        if (this.storageError) throw this.storageError;
        if (!this.storage?.setItem) throw new Error('Progress storage is unavailable');
        const nextValues = { ...this.values, [id]: snapshot };
        const nextVisited = new Set([...this.visited, id]);
        const serialized = JSON.stringify({ version: 1, visited: [...nextVisited], values: nextValues });
        await this.storage.setItem(STORAGE_KEY, serialized);
        this.values = nextValues;
        this.visited = nextVisited;
        this.error = null;
        return true;
      } catch (error) {
        this.error = messageOf(error);
        return false;
      }
    });
    this.queue = operation;
    try {
      return await operation;
    } finally {
      this.pendingSaves -= 1;
      this.saving = this.pendingSaves > 0;
    }
  }
}
