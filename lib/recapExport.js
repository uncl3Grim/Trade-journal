// Turns a recap card on screen into a crisp, fixed-size PNG for TikTok / Instagram.
//
// The old export took the card's size on YOUR screen and doubled it, so a phone
// produced a small, soft image. Here the output size is fixed instead:
//   HD  = 1080 px wide (what TikTok and Instagram use natively)
//   4K  = 2160 px wide
// and the card is drawn at that size from the live page, so text and charts stay sharp.

export const QUALITIES = { hd: 1080, '4k': 2160 };
const STORY_FILL = 0.92; // how much of the story's width the card takes up

export function outputSize(quality = 'hd', layout = 'story') {
  const w = QUALITIES[quality] || QUALITIES.hd;
  return layout === 'story' ? { w, h: Math.round((w * 16) / 9) } : { w, h: null };
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image.'))), 'image/png');
  });
}

// Pure canvas step: places the card on a 9:16 story canvas, or returns it as is.
export async function composeRecapImage(cardCanvas, { quality = 'hd', layout = 'story' } = {}) {
  if (layout !== 'story') return canvasToBlob(cardCanvas);

  const { w: W, h: H } = outputSize(quality, 'story');
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const ctx = out.getContext('2d');

  // Dark backdrop with a soft glow at the top, matching the app.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b0d1a');
  bg.addColorStop(1, '#05060c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.28, 0, W / 2, H * 0.28, W * 0.9);
  glow.addColorStop(0, 'rgba(99,102,241,0.20)');
  glow.addColorStop(1, 'rgba(99,102,241,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Card centred, shrunk only if it is too tall to fit.
  let dw = cardCanvas.width;
  let dh = cardCanvas.height;
  const maxH = H * 0.9;
  if (dh > maxH) {
    const s = maxH / dh;
    dw *= s;
    dh *= s;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cardCanvas, Math.round((W - dw) / 2), Math.round((H - dh) / 2), Math.round(dw), Math.round(dh));

  const blob = await canvasToBlob(out);
  out.width = 0;
  out.height = 0;
  return blob;
}

export async function renderRecapImage(node, { quality = 'hd', layout = 'story' } = {}) {
  const { toCanvas } = await import('html-to-image');
  const { w } = outputSize(quality, layout);
  const targetCardW = layout === 'story' ? Math.round(w * STORY_FILL) : w;
  const pixelRatio = targetCardW / (node.offsetWidth || 1);

  // Safari sometimes skips background images on the first render, so do a quick throwaway pass.
  await toCanvas(node, { pixelRatio: 1, cacheBust: true });
  const cardCanvas = await toCanvas(node, { pixelRatio, cacheBust: true });
  const blob = await composeRecapImage(cardCanvas, { quality, layout });
  cardCanvas.width = 0;
  cardCanvas.height = 0;
  return blob;
}

// Tries the chosen quality; if a phone runs out of memory at 4K, quietly falls back to HD.
export async function renderRecapImageSafe(node, opts = {}) {
  try {
    return await renderRecapImage(node, opts);
  } catch (err) {
    if (opts.quality === '4k') return renderRecapImage(node, { ...opts, quality: 'hd' });
    throw err;
  }
}
