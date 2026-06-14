export function canRecord(canvas: HTMLCanvasElement | null): boolean {
  return (
    !!canvas &&
    typeof canvas.captureStream === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

export async function recordCanvas(
  canvas: HTMLCanvasElement,
  run: () => Promise<void>,
  opts?: { fps?: number; filename?: string },
): Promise<boolean> {
  if (!canRecord(canvas)) return false;
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t));
  if (!mimeType) return false;

  const stream = canvas.captureStream(opts?.fps ?? 30);
  const chunks: BlobPart[] = [];
  const rec = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 6_000_000,
  });
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    rec.onstop = () => resolve();
  });

  rec.start();
  try {
    await run();
  } finally {
    await new Promise((r) => setTimeout(r, 350));
    if (rec.state !== "inactive") rec.stop();
  }
  await stopped;

  const blob = new Blob(chunks, { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts?.filename ?? "wanderpin-journey.webm";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}
