export interface PostcardStat {
  label: string;
  value: string;
}

export interface PostcardMeta {
  title: string;
  dateStamp: string;
  subtitle: string;
  stats: PostcardStat[];
}

function drawPostcard(
  source: HTMLCanvasElement,
  meta: PostcardMeta,
): HTMLCanvasElement | null {
  const W = 1200;
  const H = 1500;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#0b1120";
  ctx.fillRect(0, 0, W, H);

  const sSide = Math.min(source.width, source.height);
  const sx = (source.width - sSide) / 2;
  const sy = (source.height - sSide) / 2;
  try {
    ctx.drawImage(source, sx, sy, sSide, sSide, 0, 0, W, W);
  } catch {
    return null;
  }

  const grad = ctx.createLinearGradient(0, H * 0.45, 0, H);
  grad.addColorStop(0, "rgba(11,17,32,0)");
  grad.addColorStop(0.5, "rgba(11,17,32,0.85)");
  grad.addColorStop(1, "rgba(11,17,32,1)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(148,163,184,0.9)";
  ctx.font = "500 30px system-ui, sans-serif";
  ctx.fillText(meta.dateStamp.toUpperCase(), W / 2, 985);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 84px system-ui, sans-serif";
  ctx.fillText(meta.title, W / 2, 1085);

  ctx.fillStyle = "rgba(226,232,240,0.85)";
  ctx.font = "400 34px system-ui, sans-serif";
  ctx.fillText(meta.subtitle, W / 2, 1145);

  const n = meta.stats.length;
  const gap = W / (n + 1);
  meta.stats.forEach((st, i) => {
    const x = gap * (i + 1);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 54px system-ui, sans-serif";
    ctx.fillText(st.value, x, 1305);
    ctx.fillStyle = "rgba(148,163,184,0.9)";
    ctx.font = "500 24px system-ui, sans-serif";
    ctx.fillText(st.label.toUpperCase(), x, 1348);
  });

  ctx.fillStyle = "rgba(148,163,184,0.7)";
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillText("wanderpin", W / 2, 1445);

  return canvas;
}

export function exportPostcard(
  source: HTMLCanvasElement,
  meta: PostcardMeta,
): boolean {
  const canvas = drawPostcard(source, meta);
  if (!canvas) return false;
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "wanderpin-postcard.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

export function composePostcardBlob(
  source: HTMLCanvasElement,
  meta: PostcardMeta,
): Promise<Blob | null> {
  const canvas = drawPostcard(source, meta);
  if (!canvas) return Promise.resolve(null);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
