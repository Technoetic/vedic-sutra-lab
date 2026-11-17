import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const assetPath = /^(?:assets\/[A-Za-z0-9.-]+\.[a-f0-9]{12}\.(?:js|css)|cards\/card-[0-9]{2}\.[a-f0-9]{12}\.webp)$/;
const fullDigest = (bytes) => createHash('sha256').update(bytes).digest('hex');
let manifestSequence = 0;

function publicationBase(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('An explicit baseURL is required');
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('baseURL must be an HTTP publication directory without credentials, query, or hash');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

function validateManifest(manifest, maxFiles, maxTotalBytes) {
  if (!manifest || Array.isArray(manifest) || manifest.schema !== 1 || !Array.isArray(manifest.files)) {
    throw new Error('Invalid asset manifest schema');
  }
  if (manifest.files.length > maxFiles) throw new Error('Asset manifest file count exceeds the retention limit');
  const seen = new Set();
  let totalBytes = 0;
  for (const file of manifest.files) {
    if (!file || !assetPath.test(file.path)) throw new Error('Invalid manifest asset path');
    if (seen.has(file.path)) throw new Error('Duplicate manifest asset path');
    seen.add(file.path);
    if (typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('Invalid manifest asset digest');
    const filenameHash = file.path.match(/\.([a-f0-9]{12})\.(?:js|css|webp)$/)[1];
    if (!file.sha256.startsWith(filenameHash)) throw new Error('Manifest asset path hash does not match its digest');
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0) throw new Error('Invalid manifest asset bytes');
    if (file.bytes > maxTotalBytes - totalBytes) throw new Error('Asset manifest bytes exceed the retention limit');
    totalBytes += file.bytes;
  }
  return totalBytes;
}

export async function retainAssets({ baseURL, destination, fetcher = globalThis.fetch, maxFiles = 4096, maxTotalBytes = 256 * 1024 * 1024 } = {}) {
  const base = publicationBase(baseURL);
  if (typeof destination !== 'string' || !destination.trim()) throw new Error('An asset destination is required');
  if (!Number.isSafeInteger(maxFiles) || maxFiles < 0 || !Number.isSafeInteger(maxTotalBytes) || maxTotalBytes < 0) {
    throw new Error('Invalid retention bounds');
  }
  const output = path.resolve(destination);
  async function request(relativePath, freshManifest = false) {
    const url = new URL(relativePath, base);
    if (freshManifest) url.searchParams.set('_fresh', `${Date.now().toString(36)}-${++manifestSequence}`);
    if (url.origin !== base.origin) throw new Error('Asset URL escapes the publication origin');
    const response = await fetcher(url.href, { cache: 'no-store', redirect: 'error' });
    if (response?.url && new URL(response.url).origin !== base.origin) throw new Error('Asset response redirected to another origin');
    return response;
  }

  const response = await request('asset-manifest.json', true);
  if (response?.status === 404) return { status: 'first-deploy', files: 0, bytes: 0 };
  if (!response?.ok) throw new Error(`Asset manifest HTTP ${response?.status ?? 'error'}`);
  let manifest;
  try {
    manifest = await response.json();
  } catch (error) {
    throw new Error('Invalid asset manifest JSON', { cause: error });
  }
  const totalBytes = validateManifest(manifest, maxFiles, maxTotalBytes);
  const verified = [];
  for (const file of manifest.files) {
    const asset = await request(file.path);
    if (!asset?.ok) throw new Error(`Retained asset HTTP ${asset?.status ?? 'error'}: ${file.path}`);
    const bytes = Buffer.from(await asset.arrayBuffer());
    if (bytes.length !== file.bytes) throw new Error(`Retained asset bytes mismatch: ${file.path}`);
    if (fullDigest(bytes) !== file.sha256) throw new Error(`Retained asset SHA-256 mismatch: ${file.path}`);
    const target = path.resolve(output, file.path);
    if (!target.startsWith(output + path.sep)) throw new Error('Retained asset path escapes the destination');
    try {
      const existing = await readFile(target);
      if (existing.length !== file.bytes || fullDigest(existing) !== file.sha256) {
        throw new Error(`Existing asset conflicts with the retained digest: ${file.path}`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    verified.push({ target, bytes });
  }
  for (const { target, bytes } of verified) {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  return { status: 'retained', files: verified.length, bytes: totalBytes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = {};
    for (let index = 2; index < process.argv.length; index += 1) {
      const option = process.argv[index];
      if (!['--baseURL', '--dest'].includes(option) || !process.argv[index + 1] || process.argv[index + 1].startsWith('--')) {
        throw new Error('Usage: retain-assets.mjs --baseURL <published-directory> [--dest <output-directory>]');
      }
      options[option.slice(2)] = process.argv[++index];
    }
    const result = await retainAssets({ baseURL: options.baseURL || process.env.RETAIN_BASE_URL, destination: options.dest || 'dist' });
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
