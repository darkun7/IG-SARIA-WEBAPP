export type UploadMode = 'csv' | 'json' | 'html' | 'zip';

export interface CompareResult {
  mutuals: Array<{ username: string; profile_url: string }>;
  notFolback: Array<{ username: string; profile_url: string }>;
  onlyFollowers: Array<{ username: string; profile_url: string }>;
}

const USERNAME_RE = /^[A-Za-z0-9._]{1,30}$/;
const RESERVED_NAMES = new Set([
  'accounts', 'about', 'create', 'developer', 'direct', 'directory', 'discover',
  'explore', 'help', 'login', 'p', 'privacy', 'r', 'reel', 'settings', 'share',
  'stories', 'tags', 'terms', 'www',
]);
const MAX_UPLOAD_SIZE = 200 * 1024 * 1024;
const MAX_ENTRY_SIZE = MAX_UPLOAD_SIZE;
const MAX_TOTAL_SIZE = MAX_UPLOAD_SIZE;

function addUsername(target: Set<string>, value: unknown): void {
  if (typeof value !== 'string') return;
  let username = value.trim();
  const fromUrl = usernameFromUrl(username);
  if (fromUrl) username = fromUrl;
  username = username.replace(/^@+/, '').toLowerCase();
  if (USERNAME_RE.test(username) && !RESERVED_NAMES.has(username)) target.add(username);
}

function usernameFromUrl(value: string): string {
  const match = value.match(/instagram\.com\/(?:_u\/)?([A-Za-z0-9._]{1,30})/i);
  return match?.[1] ?? '';
}

function parseJson(content: string): string[] {
  const data: unknown = JSON.parse(content);
  const usernames = new Set<string>();

  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== 'object') return;

    const record = value as Record<string, unknown>;
    if (Array.isArray(record.string_list_data)) {
      if (record.title) addUsername(usernames, record.title);
      record.string_list_data.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const entry = item as Record<string, unknown>;
        addUsername(usernames, entry.value || entry.href);
      });
    }
    if (record.username) addUsername(usernames, record.username);
    if (record.href) addUsername(usernames, record.href);
    if (record.value && !record.string_list_data) addUsername(usernames, record.value);

    Object.values(record).forEach(walk);
  };

  walk(data);
  return [...usernames];
}

function parseHtml(content: string): string[] {
  const usernames = new Set<string>();
  const document = new DOMParser().parseFromString(content, 'text/html');
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    addUsername(usernames, link.getAttribute('href'));
  });
  return [...usernames];
}

function parseCsv(content: string): string[] {
  const lines = content.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];

  const headerIndex = lines.findIndex((line) => /(^|,)\s*username\s*(,|$)/i.test(line));
  const start = headerIndex >= 0 ? headerIndex + 1 : 0;
  const usernames = new Set<string>();
  for (const line of lines.slice(start)) {
    const value = line.split(',')[headerIndex >= 0 ? 0 : 0].replace(/^"|"$/g, '');
    addUsername(usernames, value);
  }
  return [...usernames];
}

function extension(name: string): string {
  return name.toLowerCase().match(/\.(json|html?|csv|txt|zip)$/)?.[1] ?? '';
}

function parseText(content: string, format: Exclude<UploadMode, 'zip'>): string[] {
  const clean = content.replace(/^\uFEFF/, '').trim();
  if (!clean) return [];
  if (format === 'json') return parseJson(clean);
  if (format === 'html') return parseHtml(clean);
  return parseCsv(clean);
}

function readUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function findEndOfCentralDirectory(view: DataView): number {
  const start = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= start; offset -= 1) {
    if (readUint32(view, offset) === 0x06054b50) return offset;
  }
  return -1;
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot decompress ZIP files.');
  }
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([arrayBuffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

interface ZipEntry {
  name: string;
  text: string;
}

async function readZipEntries(buffer: ArrayBuffer): Promise<ZipEntry[]> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const directoryOffset = findEndOfCentralDirectory(view);
  if (directoryOffset < 0) throw new Error('Invalid ZIP file.');

  const count = readUint16(view, directoryOffset + 10);
  let offset = readUint32(view, directoryOffset + 16);
  let totalSize = 0;
  const entries: ZipEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    if (readUint32(view, offset) !== 0x02014b50) throw new Error('Invalid ZIP directory.');
    const method = readUint16(view, offset + 10);
    const compressedSize = readUint32(view, offset + 20);
    const uncompressedSize = readUint32(view, offset + 24);
    const nameLength = readUint16(view, offset + 28);
    const extraLength = readUint16(view, offset + 30);
    const commentLength = readUint16(view, offset + 32);
    const localOffset = readUint32(view, offset + 42);
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;

    if (!name || name.endsWith('/')) continue;
    if (compressedSize > MAX_ENTRY_SIZE || uncompressedSize > MAX_ENTRY_SIZE) {
      throw new Error('ZIP entry is too large.');
    }
    totalSize += uncompressedSize;
    if (totalSize > MAX_TOTAL_SIZE) throw new Error('ZIP contents are too large.');
    if (readUint32(view, localOffset) !== 0x04034b50) throw new Error('Invalid ZIP entry.');

    const localNameLength = readUint16(view, localOffset + 26);
    const localExtraLength = readUint16(view, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    let content: Uint8Array;
    if (method === 0) content = compressed;
    else if (method === 8) content = await inflateRaw(compressed);
    else continue;
    if (content.byteLength > MAX_ENTRY_SIZE) throw new Error('ZIP entry is too large.');

    entries.push({ name, text: new TextDecoder().decode(content) });
  }
  return entries;
}

function entryScore(name: string, role: 'followers' | 'following'): number {
  const base = name.split('/').pop()?.toLowerCase() ?? '';
  const exact = role === 'followers'
    ? /^followers(?:_\d+)?\.(json|html?)$/.test(base)
    : /^following(?:_\d+)?\.(json|html?)$/.test(base);
  if (exact) return 100;
  if (base.includes(role)) return 50;
  return 0;
}

function parseZipEntry(entry: ZipEntry): string[] {
  const ext = extension(entry.name);
  if (ext === 'json') return parseText(entry.text, 'json');
  if (ext === 'html' || ext === 'htm') return parseText(entry.text, 'html');
  if (ext === 'csv' || ext === 'txt') return parseText(entry.text, 'csv');
  return [];
}

function selectZipList(entries: ZipEntry[], role: 'followers' | 'following'): string[] {
  const candidates = entries
    .filter((entry) => ['json', 'html', 'htm', 'csv', 'txt'].includes(extension(entry.name)))
    .map((entry) => {
      try {
        return { entry, usernames: parseZipEntry(entry), score: entryScore(entry.name, role) };
      } catch {
        return { entry, usernames: [], score: entryScore(entry.name, role) };
      }
    })
    .filter((candidate) => candidate.usernames.length > 0)
    .sort((a, b) => b.score - a.score || b.usernames.length - a.usernames.length);
  if (!candidates[0]) throw new Error(`ZIP does not contain a readable ${role} export.`);
  const exactCandidates = candidates.filter((candidate) => candidate.score === 100);
  const selected = exactCandidates.length ? exactCandidates : [candidates[0]];
  return [...new Set(selected.flatMap((candidate) => candidate.usernames))];
}

export async function parseZipFile(file: File): Promise<{ followers: string[]; following: string[] }> {
  if (file.size > MAX_UPLOAD_SIZE) throw new Error('File is too large. Maximum size is 200 MB.');
  const entries = await readZipEntries(await file.arrayBuffer());
  return {
    followers: selectZipList(entries, 'followers'),
    following: selectZipList(entries, 'following'),
  };
}

export async function parseListFile(file: File, format: Exclude<UploadMode, 'zip'>): Promise<string[]> {
  return parseText(await file.text(), format);
}

function normalizeList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.toLowerCase().trim()).filter(Boolean))].sort();
}

export function compareLists(followers: string[], following: string[]): CompareResult {
  const followerSet = new Set(normalizeList(followers));
  const followingSet = new Set(normalizeList(following));
  const mutuals = [...followerSet].filter((username) => followingSet.has(username));
  const notFolback = [...followingSet].filter((username) => !followerSet.has(username));
  const onlyFollowers = [...followerSet].filter((username) => !followingSet.has(username));

  const makeList = (items: string[]) => items.map((username) => ({
    username,
    profile_url: `https://instagram.com/${encodeURIComponent(username)}`,
  }));

  return {
    mutuals: makeList(mutuals),
    notFolback: makeList(notFolback),
    onlyFollowers: makeList(onlyFollowers),
  };
}
