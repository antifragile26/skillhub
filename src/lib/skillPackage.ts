import { unzipSync } from "fflate";

export const MAX_SKILL_PACKAGE_BYTES = 10 * 1024 * 1024;
const MAX_SKILL_PACKAGE_FILES = 200;
const MAX_SKILL_UNCOMPRESSED_BYTES = 20 * 1024 * 1024;
const MAX_README_BYTES = 60 * 1024;

export type SkillPackageManifest = {
  fileCount: number;
  unpackedBytes: number;
  readme: string;
  name?: string;
  description?: string;
  license?: string;
  tags: string[];
  platforms: string[];
};

function packageError(message: string): never {
  throw new Error(message);
}

function readUint16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function safeZipPath(path: string) {
  return (
    Boolean(path) &&
    !path.includes("\\") &&
    !path.startsWith("/") &&
    !path.includes("\0") &&
    !path.split("/").some((part) => part === "..")
  );
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  const start = Math.max(0, bytes.length - 65_557);
  for (let index = bytes.length - 22; index >= start; index -= 1) {
    if (readUint32(bytes, index) === 0x06054b50) return index;
  }
  packageError("压缩包格式无效：未找到 ZIP 目录。");
}

function frontMatterValue(readme: string, key: string) {
  const match = readme.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return undefined;
  const line = match[1].split(/\r?\n/).find((item) => item.toLowerCase().startsWith(`${key.toLowerCase()}:`));
  const value = line?.slice(line.indexOf(":") + 1).trim().replace(/^['"]|['"]$/g, "");
  return value || undefined;
}

function frontMatterList(readme: string, key: string) {
  const value = frontMatterValue(readme, key);
  if (!value) return [];
  return value
    .replace(/^\[|\]$/g, "")
    .split(/[，,]/)
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * Validates a ZIP without running anything inside it. The central directory is
 * inspected before decompression, preventing path traversal and oversized
 * payloads from reaching unzipSync.
 */
export function inspectSkillPackage(buffer: ArrayBuffer): SkillPackageManifest {
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_SKILL_PACKAGE_BYTES) {
    packageError("技能包必须大于 0，且不能超过 10 MB。");
  }

  const eocdOffset = findEndOfCentralDirectory(bytes);
  const entryCount = readUint16(bytes, eocdOffset + 10);
  const centralDirectorySize = readUint32(bytes, eocdOffset + 12);
  const centralDirectoryOffset = readUint32(bytes, eocdOffset + 16);
  if (entryCount === 0 || entryCount > MAX_SKILL_PACKAGE_FILES) {
    packageError(`技能包应包含 1 至 ${MAX_SKILL_PACKAGE_FILES} 个文件。`);
  }
  if (
    centralDirectoryOffset + centralDirectorySize > eocdOffset ||
    centralDirectoryOffset >= bytes.byteLength ||
    centralDirectorySize === 0
  ) {
    packageError("压缩包目录损坏或使用了不支持的 ZIP64 格式。");
  }

  let offset = centralDirectoryOffset;
  let unpackedBytes = 0;
  let readmeName: string | undefined;
  const decoder = new TextDecoder("utf-8", { fatal: false });

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.byteLength || readUint32(bytes, offset) !== 0x02014b50) {
      packageError("压缩包目录条目无效。");
    }
    const flags = readUint16(bytes, offset + 8);
    const compression = readUint16(bytes, offset + 10);
    const unpackedSize = readUint32(bytes, offset + 24);
    const nameLength = readUint16(bytes, offset + 28);
    const extraLength = readUint16(bytes, offset + 30);
    const commentLength = readUint16(bytes, offset + 32);
    const nextOffset = offset + 46 + nameLength + extraLength + commentLength;
    if (nextOffset > bytes.byteLength) packageError("压缩包目录长度无效。");
    if ((flags & 0x1) !== 0) packageError("不支持加密的技能包。");
    if (compression !== 0 && compression !== 8) packageError("技能包包含不支持的压缩方式。");

    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    if (!safeZipPath(name)) packageError("技能包包含不安全的文件路径。");
    if (!name.endsWith("/")) {
      unpackedBytes += unpackedSize;
      if (unpackedBytes > MAX_SKILL_UNCOMPRESSED_BYTES) {
        packageError("技能包解压后不能超过 20 MB。");
      }
      if (name.toLowerCase() === "skill.md") readmeName = name;
    }
    offset = nextOffset;
  }

  if (!readmeName) packageError("技能包根目录必须包含 SKILL.md 说明文件。");

  let unpacked: Record<string, Uint8Array>;
  try {
    unpacked = unzipSync(bytes);
  } catch {
    packageError("技能包无法解压，请重新打包为标准 ZIP 文件。");
  }
  const readmeBytes = unpacked[readmeName];
  if (!readmeBytes || readmeBytes.byteLength === 0 || readmeBytes.byteLength > MAX_README_BYTES) {
    packageError("SKILL.md 必须存在、非空且不能超过 60 KB。");
  }
  const readme = decoder.decode(readmeBytes).trim();
  if (!readme) packageError("SKILL.md 不能为空。");

  return {
    fileCount: entryCount,
    unpackedBytes,
    readme,
    name: frontMatterValue(readme, "name"),
    description: frontMatterValue(readme, "description"),
    license: frontMatterValue(readme, "license"),
    tags: frontMatterList(readme, "tags"),
    platforms: frontMatterList(readme, "platforms"),
  };
}

export function sanitizeSkillPackageName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "skill.zip";
}
