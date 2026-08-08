import sharp from 'sharp';
import { CardRenderer } from '../services/cardRenderer';

describe('CardRenderer', () => {
  it('renders the welcome experience as a high-resolution PNG', async () => {
    const renderer = new CardRenderer();
    const image = await renderer.renderWelcomeCard({
      address: '19 Silver Birch Close',
      postcode: 'PE29 7BW',
    });
    const metadata = await sharp(image).metadata();

    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1350);
    expect(image.length).toBeGreaterThan(20_000);
  });
});
