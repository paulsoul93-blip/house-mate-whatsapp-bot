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
