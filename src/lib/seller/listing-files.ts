import { constants, type ReadStream } from "node:fs";
import { mkdir, open, realpath, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export class ListingInputError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function starts(data: Buffer, bytes: number[]) {
  return data.length >= bytes.length && bytes.every((value, index) => data[index] === value);
}

function zipNames(data: Buffer) {
  if (data.length < 22 || !starts(data, [80, 75, 3, 4])) return null;
  const start = Math.max(0, data.length - 65557);
  let end = data.length - 22;
  while (end >= start && (data.readUInt32LE(end) !== 0x06054b50 ||
    end + 22 + data.readUInt16LE(end + 20) !== data.length)) end--;
  if (end < start || data.readUInt32LE(end + 4) !== 0) return null;
  const count = data.readUInt16LE(end + 10);
  if (!count || count > 8000 || count !== data.readUInt16LE(end + 8)) return null;
  const offset = data.readUInt32LE(end + 16);
  const size = data.readUInt32LE(end + 12);
  if (offset + size !== end) return null;
  const names = new Set<string>();
  let cursor = offset;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || data.readUInt32LE(cursor) !== 0x02014b50 ||
      data.readUInt16LE(cursor + 8) & 1 || data.readUInt16LE(cursor + 34) !== 0) return null;
    const nameLength = data.readUInt16LE(cursor + 28);
    const next = cursor + 46 + nameLength + data.readUInt16LE(cursor + 30) + data.readUInt16LE(cursor + 32);
    if (!nameLength || next > end) return null;
    const name = data.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    if (name.includes("\0") || /^(?:[\\/]|[A-Za-z]:)/.test(name) || name.split(/[\\/]/).includes("..")) return null;
    const local = data.readUInt32LE(cursor + 42);
    if (local + 30 > offset || data.readUInt32LE(local) !== 0x04034b50) return null;
    names.add(name.toLowerCase());
    cursor = next;
  }
  return cursor === end ? names : null;
}

const zipped: Record<string, string[]> = {
  ".zip": [], ".pbix": ["report/layout", "report/definition/report.json", "datamodel"],
  ".twbx": [".twb"], ".docx": ["word/document.xml"], ".pptx": ["ppt/presentation.xml"],
  ".xlsx": ["xl/workbook.xml"], ".xlsm": ["xl/workbook.xml"], ".ods": ["content.xml"],
  ".odp": ["content.xml"], ".epub": ["meta-inf/container.xml"], ".sketch": ["document.json"],
};
const textFormats = new Set([".txt", ".md", ".csv", ".json", ".py", ".js", ".ts", ".jsx", ".tsx",
  ".gs", ".mq4", ".mq5", ".set", ".pine", ".cube", ".svg", ".xmp", ".obj", ".mtl", ".gltf"]);
const stillImages: Record<string, string> = { ".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png", ".webp": "webp" };

async function matchesContent(ext: string, data: Buffer) {
  if (Object.hasOwn(zipped, ext)) {
    const names = zipNames(data);
    return Boolean(names && (!zipped[ext].length || zipped[ext].some(name =>
      name === ".twb" ? [...names].some(entry => entry.endsWith(".twb")) : names.has(name))));
  }
  if (Object.hasOwn(stillImages, ext)) {
    const info = await sharp(data, { limitInputPixels: 24_000_000 }).metadata();
    return info.format === stillImages[ext] && (info.pages ?? 1) === 1;
  }
  const head = data.toString("ascii", 0, 64);
  switch (ext) {
    case ".pdf": return head.startsWith("%PDF-");
    case ".ai": return head.startsWith("%PDF-") || head.startsWith("%!PS-Adobe");
    case ".eps": return head.startsWith("%!PS-Adobe") || starts(data, [197, 208, 211, 198]);
    case ".psd": return head.startsWith("8BPS");
    case ".tgz": return starts(data, [31, 139, 8]);
    case ".dng": return starts(data, [73, 73, 42, 0]) || starts(data, [77, 77, 0, 42]);
    case ".otf": return head.startsWith("OTTO");
    case ".ttf": return starts(data, [0, 1, 0, 0]) || head.startsWith("true");
    case ".blend": return head.startsWith("BLENDER") || starts(data, [40, 181, 47, 253]) || starts(data, [31, 139, 8]);
    case ".glb": return data.length >= 20 && head.startsWith("glTF") &&
      data.readUInt32LE(4) === 2 && data.readUInt32LE(8) === data.length;
    case ".fbx": return head.startsWith("Kaydara FBX Binary") || /FBX/i.test(head);
    case ".stl": return (data.length >= 84 && 84 + 50 * data.readUInt32LE(80) === data.length) || /^solid[\s\0]/i.test(head);
    case ".mp4": return data.length >= 16 && head.slice(4, 8) === "ftyp";
    case ".webm": return starts(data, [26, 69, 223, 163]) && data.subarray(0, 4096).includes(Buffer.from("webm"));
  }
  if (!textFormats.has(ext)) return false;
  let decoded: string;
  try {
    decoded = ext === ".mq4" || ext === ".mq5" || ext === ".set"
      ? (starts(data, [255, 254]) ? new TextDecoder("utf-16le", { fatal: true }).decode(data)
        : starts(data, [254, 255]) ? new TextDecoder("utf-16be", { fatal: true }).decode(data)
          : new TextDecoder("windows-1252").decode(data))
      : new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch { return false; }
  if (!decoded.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(decoded)) return false;
  if (ext === ".svg") return /<svg[\s>]/i.test(decoded);
  if (ext === ".xmp") return /<(?:x:xmpmeta|rdf:RDF)[\s>]/i.test(decoded);
  if (ext === ".json" || ext === ".gltf") {
    try {
      const json = JSON.parse(decoded);
      return ext === ".json" ? json !== null && typeof json === "object" : typeof json?.asset?.version === "string";
    } catch { return false; }
  }
  return true;
}

export async function validatedBytes(file: File, extension: string, role: FileRole, platform: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    if (!(await matchesContent(extension, bytes))) throw new Error();
    if (role === "main" && extension === ".json" && (platform === "n8n" || platform === "Make")) {
      const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      if (platform === "n8n" ? !Array.isArray(value?.nodes) || !value?.connections : !Array.isArray(value?.flow)) throw new Error();
    }
    if (role === "cover" || role === "image") {
      // Confirm the whole preview decodes. The original stays private and is only served as a download.
      await sharp(bytes, { limitInputPixels: 24_000_000, failOn: "error" }).stats();
    }
  } catch {
    throw new ListingInputError(415, `“${file.name}” does not appear to contain a compatible ${extension} file.`);
  }
  return bytes;
}

export type FileRole = "cover" | "image" | "video" | "pdf" | "main" | "extra";
function inside(parent: string, candidate: string) {
  const delta = relative(parent, candidate);
  return !delta || (!isAbsolute(delta) && delta !== ".." && !delta.startsWith(`..${sep}`));
}

async function root() {
  const configured = process.env.KITCART_SELLER_STORAGE_DIR?.trim();
  if ((configured && !isAbsolute(configured)) || (!configured && process.env.NODE_ENV === "production")) {
    throw new ListingInputError(503, "Private seller storage is not configured.");
  }
  const project = await realpath(/* turbopackIgnore: true */ process.cwd());
  const directory = resolve(/* turbopackIgnore: true */ configured || resolve(homedir(), ".kitcart", "seller-assets"));
  if (directory === sep || inside(directory, project) || inside(project, directory)) {
    throw new ListingInputError(503, "Private seller storage must be outside the web project.");
  }
  // Check the actual path after resolving any links before storing any bytes.
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const actual = await realpath(/* turbopackIgnore: true */ directory);
  if (actual === sep || inside(actual, project) || inside(project, actual)) {
    throw new ListingInputError(503, "Private seller storage must be outside the web project.");
  }
  return actual;
}

export async function createListingDirectory(listingId: string) {
  if (!uuidPattern.test(listingId)) throw new Error("Invalid listing ID");
  const dir = resolve(await root(), listingId);
  await mkdir(dir, { mode: 0o700 });
  return dir;
}

export async function writeListingFile(dir: string, data: Buffer) {
  const id = randomUUID();
  await writeFile(resolve(dir, id), data, { flag: "wx", mode: 0o600 });
  return id;
}

export async function removeListingDirectory(path: string) {
  await rm(path, { recursive: true, force: true });
}

export async function openListingFile(listingId: string, fileId: string): Promise<ReadStream> {
  if (!uuidPattern.test(listingId) || !uuidPattern.test(fileId)) throw new Error("Invalid listing file ID");
  const file = await open(resolve(await root(), listingId, fileId), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  return file.createReadStream();
}
