export type ShareResult = "shared" | "cancelled" | "unsupported";

export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function canNativeShareFiles(files: File[]): boolean {
  return (
    canNativeShare() &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files })
  );
}

async function attempt(data: ShareData): Promise<ShareResult> {
  try {
    await navigator.share(data);
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "cancelled";
    }
    return "unsupported";
  }
}

export async function shareFiles(data: {
  files: File[];
  title?: string;
  text?: string;
  url?: string;
}): Promise<ShareResult> {
  if (!canNativeShareFiles(data.files)) return "unsupported";
  return attempt(data);
}

export async function shareLink(data: {
  title?: string;
  text?: string;
  url: string;
}): Promise<ShareResult> {
  if (!canNativeShare()) return "unsupported";
  return attempt(data);
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function xUrl(opts: { text: string; url: string }): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    opts.text,
  )}&url=${encodeURIComponent(opts.url)}`;
}

export function telegramUrl(opts: { url: string; text: string }): string {
  return `https://t.me/share/url?url=${encodeURIComponent(
    opts.url,
  )}&text=${encodeURIComponent(opts.text)}`;
}

export function facebookUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}
