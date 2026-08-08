import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  readPussyImage,
  readRandomPussyImage,
} from '../services/pussyImageService';

describe('readPussyImage', () => {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'house-mate-photo-')
  );

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('reads the configured local image', async () => {
    const imagePath = path.join(temporaryDirectory, 'pussy.jpg');
    const expected = Buffer.from('image-bytes');
    fs.writeFileSync(imagePath, expected);

    await expect(readPussyImage(imagePath)).resolves.toEqual(expected);
  });

  it('returns a controlled error when the image is missing', async () => {
    await expect(
      readPussyImage(path.join(temporaryDirectory, 'missing.jpg'))
    ).rejects.toThrow('Configured shared photo is unavailable');
  });

  it('falls back to the next configured photo when one is unavailable', async () => {
    const imagePath = path.join(temporaryDirectory, 'second.jpg');
    const expected = Buffer.from('second-image-bytes');
    fs.writeFileSync(imagePath, expected);

    await expect(
      readRandomPussyImage([
        path.join(temporaryDirectory, 'missing-first.jpg'),
        imagePath,
      ])
    ).resolves.toEqual(expected);
  });
});
