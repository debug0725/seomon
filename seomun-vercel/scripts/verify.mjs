import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GET, POST } from '../api/raid.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = join(root, 'public');
const manifest = JSON.parse(await readFile(join(root, 'asset-manifest.json'), 'utf8'));
const verifyOriginal = process.argv.includes('--original');
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else {
      assert(entry.isFile(), 'Export assets must be regular files: ' + path);
      files.push(relative(publicRoot, path).split(sep).join('/'));
    }
  }
}
await walk(publicRoot);
if (verifyOriginal) assert.deepEqual(files.sort(), Object.keys(manifest).sort(), 'Missing or unexpected exported asset');
const sources = new Map();
for (const name of files) {
  const bytes = await readFile(join(publicRoot, name));
  if (verifyOriginal) assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest[name], 'Changed asset: ' + name);
  if (/\.(html|css|js)$/.test(name)) sources.set(name, bytes.toString('utf8'));
}
function localReference(name, target) {
  if (/^(?:[a-z]+:|#|\/\/)/i.test(target)) return;
  const clean = target.split(/[?#]/)[0];
  const destination = clean.startsWith('/') ? resolve(publicRoot, '.' + clean) : resolve(publicRoot, dirname(name), clean);
  assert(destination.startsWith(publicRoot + sep), 'Asset path escapes public/: ' + target);
  assert(files.includes(relative(publicRoot, destination).split(sep).join('/')), name + ' has a missing local asset: ' + target);
}
for (const [name, source] of sources) {
  if (name.endsWith('.html')) {
    for (const match of source.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) localReference(name, match[1]);
  }
  if (name.endsWith('.css')) {
    for (const match of source.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]+))\s*\)/g)) localReference(name, (match[1] ?? match[2] ?? match[3]).trim());
  }
  if (name.endsWith('.js')) {
    const syntax = spawnSync(process.execPath, ['--check', join(publicRoot, name)], { encoding: 'utf8' });
    assert.equal(syntax.status, 0, syntax.stderr);
    for (const match of source.matchAll(/\bfrom\s*["']([^"']+)["']|\bimport\s*["']([^"']+)["']/g)) localReference(name, match[1] || match[2]);
    for (const match of source.matchAll(/["']((?:\/|\.\.?\/)[^"'\s]+\.(?:webp|woff|svg|css|js))["']/g)) localReference(name, match[1]);
  }
}
// Cinematic image paths are assembled at runtime, so verify both variants.
for (const key of ['player-ultimate', 'enemy-ultimate', 'guardian-scene']) {
  for (const variant of ['mobile', 'lite']) localReference('cinematics.js', '/' + key + '-' + variant + '.webp');
}
const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));
assert.equal(config.framework, null);
assert.equal(config.outputDirectory, 'dist');
assert.equal(config.installCommand, '');
const headers = new Map(config.headers[0].headers.map(h => [h.key.toLowerCase(), h.value]));
assert.equal(headers.get('x-content-type-options'), 'nosniff');
assert(headers.get('content-security-policy').includes("object-src 'none'"));
assert(headers.get('content-security-policy').includes('frame-src https://www.youtube-nocookie.com'));
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
assert.equal(Object.keys(pkg.dependencies || {}).length, 0);
assert.equal(Object.keys(pkg.devDependencies || {}).length, 0);
for (const handler of [GET, POST]) {
  const response = await handler();
  assert.equal(response.status, 410);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match((await response.json()).error, /혼자 플레이/);
}
console.log('검증 완료: ' + files.length + '개 파일, 로컬 경로, JS 문법, 보안 헤더, 종료된 레이드 API' + (verifyOriginal ? ' · 원본 SHA-256 일치' : ''));
