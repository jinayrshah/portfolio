/**
 * Turns the soul picture into points of light. Brighter parts of the picture
 * receive more points, so the particles settle into the same figure.
 */
export function seeded(seed: number): () => number {
  let s = seed % 2147483647;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

export type SoulPoints = { positions: Float32Array; colours: Float32Array };

/**
 * Samples `count` points from the picture.
 * `width` and `height` are the picture's size in world units, and `heart`
 * is the point of the picture (0..1, from the bottom left) that sits at the
 * origin, so the figure is placed by its heart.
 */
export function sampleImage(
  img: HTMLImageElement,
  count: number,
  rand: () => number,
  size: { width: number; height: number; heart: readonly [number, number] },
): SoulPoints {
  const w = 320;
  const h = Math.round((w * img.naturalHeight) / img.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  // Running total of brightness, so a random number picks a pixel by weight.
  const total = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const l = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 765;
    sum += Math.pow(Math.max(0, l - 0.03), 1.25);
    total[i] = sum;
  }

  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  for (let n = 0; n < count; n++) {
    const pick = rand() * sum;
    let lo = 0;
    let hi = w * h - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (total[mid] < pick) lo = mid + 1;
      else hi = mid;
    }
    const px = (lo % w) + rand();
    const py = Math.floor(lo / w) + rand();
    positions[n * 3] = (px / w - size.heart[0]) * size.width;
    positions[n * 3 + 1] = (1 - py / h - size.heart[1]) * size.height;
    positions[n * 3 + 2] = (rand() - 0.5) * 0.5;
    // Keep the hue of the picture, lifted so every point reads as light.
    const r = data[lo * 4];
    const g = data[lo * 4 + 1];
    const b = data[lo * 4 + 2];
    const peak = Math.max(r, g, b, 1);
    const lift = (0.55 + (0.45 * peak) / 255) / peak;
    colours[n * 3] = r * lift;
    colours[n * 3 + 1] = g * lift;
    colours[n * 3 + 2] = b * lift;
  }
  return { positions, colours };
}
