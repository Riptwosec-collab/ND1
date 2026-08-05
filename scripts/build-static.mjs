import { inflateRawSync } from 'node:zlib';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.PROJECT_ROOT
  ? resolve(process.env.PROJECT_ROOT)
  : fileURLToPath(new URL('../', import.meta.url));
const archiveDir = join(root, 'archive');
const outputDir = join(root, 'dist');
const allowedRootFiles = new Set(['index.html', '404.html', '.nojekyll']);

function safeOutputPath(name) {
  const stripped = name.replace(/^Night-D1\//, '').replace(/^\/+/, '');
  const normalized = normalize(stripped);
  if (!normalized || normalized === '.' || normalized.startsWith(`..${sep}`) || normalized === '..') return null;
  if (!(allowedRootFiles.has(normalized) || normalized.startsWith(`assets${sep}`))) return null;
  const destination = resolve(outputDir, normalized);
  const relativePath = relative(outputDir, destination);
  if (relativePath.startsWith('..') || relativePath.includes(`..${sep}`)) return null;
  return destination;
}

async function extractZip(buffer) {
  let offset = 0;
  let extracted = 0;
  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    if (flags & 0x08) throw new Error('ZIP data descriptor is not supported');
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) throw new Error('ZIP entry exceeds archive size');
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString('utf8');
    if (!name.endsWith('/')) {
      const destination = safeOutputPath(name);
      if (destination) {
        const compressed = buffer.subarray(dataStart, dataEnd);
        const content = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
        if (!content) throw new Error(`Unsupported ZIP compression method: ${method}`);
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, content);
        extracted += 1;
      }
    }
    offset = dataEnd;
  }
  return extracted;
}

const partNames = (await readdir(archiveDir))
  .filter(name => /^part\d+\.b64$/.test(name))
  .sort((a, b) => a.localeCompare(b, 'en'));
if (!partNames.length) throw new Error('No archive parts found');

const encoded = (await Promise.all(partNames.map(name => readFile(join(archiveDir, name), 'utf8'))))
  .join('')
  .replace(/\s+/g, '');
const archive = Buffer.from(encoded, 'base64');
if (archive.length < 4 || archive.readUInt32LE(0) !== 0x04034b50) throw new Error('Invalid ZIP archive');

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
const extracted = await extractZip(archive);
const index = await readFile(join(outputDir, 'index.html'), 'utf8');
if (!index.includes('./assets/js/app.js') || index.includes('archive/part') || index.includes('Failed to fetch')) {
  throw new Error('Generated index.html is not a direct-source dashboard');
}
console.log(`PASS: built ${extracted} website files in dist/ from ${partNames.length} verified archive parts.`);
