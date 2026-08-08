import fs from 'fs/promises';

const MAX_SHARED_PHOTO_BYTES = 8 * 1024 * 1024;

export async function readPussyImage(imagePath: string): Promise<Buffer> {
  try {
    const stats = await fs.stat(imagePath);
    if (!stats.isFile() || stats.size === 0 || stats.size > MAX_SHARED_PHOTO_BYTES) {
      throw new Error('invalid file');
    }
    return await fs.readFile(imagePath);
  } catch {
    throw new Error('Configured shared photo is unavailable');
  }
}

export async function readRandomPussyImage(
  imagePaths: readonly string[]
): Promise<Buffer> {
  const candidates = imagePaths.filter(Boolean);
  if (candidates.length === 0) {
    throw new Error('Configured shared photo is unavailable');
  }

  const startIndex = Math.floor(Math.random() * candidates.length);
  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(startIndex + offset) % candidates.length];
    try {
      return await readPussyImage(candidate);
    } catch {
      continue;
    }
  }

  throw new Error('Configured shared photo is unavailable');
}
