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

// Pure canvas step: places the card on a 9:16 story canvas (optionally with a title and
// @handle above it), or returns the card as is.
export async function composeRecapImage(cardCanvas, { quality = 'hd', layout = 'story', title = '', handle = '' } = {}) {
  if (layout !== 'story') return canvasToBlob(cardCanvas);

  const { w: W, h: H } = outputSize(quality, 'story');
  const k = W / 1080;
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

  // Optional heading: title, then handle. Kept in the top part so TikTok's bottom buttons never cover it.
  const hasHead = !!(title || handle);
  const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let y = Math.round(H * 0.075);
  if (title) {
    let size = Math.round(54 * k);
    ctx.font = `700 ${size}px ${FONT}`;
    while (ctx.measureText(title).width > W * 0.88 && size > 24 * k) {
      size -= 2;
      ctx.font = `700 ${size}px ${FONT}`;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, W / 2, y);
    y += Math.round(58 * k);
  }
  if (handle) {
    ctx.font = `600 ${Math.round(34 * k)}px ${FONT}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`@${handle.replace(/^@/, '')}`, W / 2, y);
  }

  // Card centred in the space that is left, shrunk only if it is too tall or too wide.
  const top = hasHead ? H * 0.135 : H * 0.05;
  const bottom = hasHead ? H * 0.88 : H * 0.95;
  const regionH = bottom - top;
  let dw = cardCanvas.width;
  let dh = cardCanvas.height;
  const s = Math.min(1, regionH / dh, (W * 0.94) / dw);
  dw *= s;
  dh *= s;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cardCanvas, Math.round((W - dw) / 2), Math.round(top + (regionH - dh) / 2), Math.round(dw), Math.round(dh));

  const blob = await canvasToBlob(out);
  out.width = 0;
  out.height = 0;
  return blob;
}

// opts: quality ('hd' | '4k'), layout ('story' | 'card'), title, handle, backgroundColor
export async function renderRecapImage(node, opts = {}) {
  const { quality = 'hd', layout = 'story', title = '', handle = '', backgroundColor } = opts;
  const { toCanvas } = await import('html-to-image');
  const { w } = outputSize(quality, layout);
  const targetCardW = layout === 'story' ? Math.round(w * STORY_FILL) : w;
  const pixelRatio = targetCardW / (node.offsetWidth || 1);
  // Anything marked data-export-ignore (edit buttons and the like) is left out of the picture.
  const filter = (n) => !(n && n.hasAttribute && n.hasAttribute('data-export-ignore'));
  // Story images sit on their own dark backdrop, so only the card-only version needs a solid fill.
  const base = { cacheBust: true, filter, ...(backgroundColor && layout !== 'story' ? { backgroundColor } : {}) };

  // Safari sometimes skips background images on the first render, so do a quick throwaway pass.
  await toCanvas(node, { ...base, pixelRatio: 1 });
  const cardCanvas = await toCanvas(node, { ...base, pixelRatio });
  const blob = await composeRecapImage(cardCanvas, { quality, layout, title, handle });
  cardCanvas.width = 0;
  cardCanvas.height = 0;
  return blob;
}

export async function renderRecapImageSafe(node, opts = {}) {
  try {
    return await renderRecapImage(node, opts);
  } catch (err) {
    if (opts.quality === '4k') return renderRecapImage(node, { ...opts, quality: 'hd' });
    throw err;
  }
}
