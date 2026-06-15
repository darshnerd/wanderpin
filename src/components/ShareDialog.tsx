import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Code2, Copy, Download, Loader2, Share2 } from "lucide-react";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { classify } from "@/lib/tripScale";
import { totalDistance } from "@/lib/distance";
import { tripHours } from "@/lib/transport";
import { formatDuration } from "@/lib/stats";
import { formatKm } from "@/lib/utils";
import { composePostcardBlob, type PostcardMeta } from "@/lib/postcard";
import {
  canNativeShareFiles,
  shareFiles,
  shareLink,
  whatsappUrl,
  xUrl,
} from "@/lib/socialShare";
import type { Spot } from "@/types";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Spot[];
  getCanvas: () => HTMLCanvasElement | null;
  publishLink: () => Promise<string>;
}

function postcardMeta(trip: Spot[]): PostcardMeta {
  const info = classify(trip);
  const first = trip[0];
  const last = trip[trip.length - 1];
  const subtitle =
    first && last && first.id !== last.id
      ? `${first.name} to ${last.name}`
      : (first?.name ?? "");
  const countryCodes = new Set(trip.map((s) => s.countryCode).filter(Boolean));
  const single = countryCodes.size <= 1;
  const stats = [
    { label: "Distance", value: formatKm(totalDistance(trip)) },
    { label: "Stops", value: String(trip.length) },
    single
      ? { label: "Cities", value: String(new Set(trip.map((s) => s.name)).size) }
      : { label: "Countries", value: String(countryCodes.size) },
    { label: "Time", value: formatDuration(tripHours(trip)) },
  ];
  return {
    title: info.copy,
    dateStamp: new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    subtitle,
    stats,
  };
}

function slugFromLink(link: string): string | null {
  const m = link.match(/\/t\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

export function ShareDialog({
  open,
  onOpenChange,
  trip,
  getCanvas,
  publishLink,
}: ShareDialogProps) {
  const [link, setLink] = useState<string>("");
  const [busy, setBusy] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  const info = classify(trip);
  const shareText = `${info.copy} - my journey on Wanderpin`;
  const slug = link ? slugFromLink(link) : null;
  const embedSnippet = slug
    ? `<iframe src="${location.origin}/embed/${slug}" width="100%" height="480" style="border:0;border-radius:12px" loading="lazy" allowfullscreen></iframe>`
    : "";

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setBusy(true);
    setFile(null);
    setCopied(false);
    setEmbedCopied(false);

    void publishLink().then((url) => {
      if (alive) setLink(url);
    });

    const canvas = getCanvas();
    if (canvas) {
      void composePostcardBlob(canvas, postcardMeta(trip)).then((blob) => {
        if (alive && blob) {
          setFile(
            new File([blob], "wanderpin-postcard.png", { type: "image/png" }),
          );
        }
      });
    }

    const t = setTimeout(() => {
      if (alive) setBusy(false);
    }, 50);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (link) setBusy(false);
  }, [link]);

  async function nativeShare() {
    if (file && canNativeShareFiles([file])) {
      const r = await shareFiles({
        files: [file],
        title: "Wanderpin",
        text: shareText,
        url: link,
      });
      if (r === "unsupported") void linkShare();
      return;
    }
    void linkShare();
  }

  async function linkShare() {
    const r = await shareLink({ title: "Wanderpin", text: shareText, url: link });
    if (r === "unsupported") void copyLink();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Copy this link", { description: link });
    }
  }

  async function copyEmbed() {
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setEmbedCopied(true);
      toast.success("Embed code copied");
      setTimeout(() => setEmbedCopied(false), 1600);
    } catch {
      toast("Copy this snippet", { description: embedSnippet });
    }
  }

  function savePostcard() {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function openIntent(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const platforms = [
    { label: "WhatsApp", run: () => openIntent(whatsappUrl(`${shareText} ${link}`)) },
    {
      label: "Instagram",
      run: () => {
        void navigator.clipboard.writeText(link).catch(() => {});
        openIntent("https://www.instagram.com/");
        toast("Link copied - paste it into your Instagram story or DM");
      },
    },
    { label: "X", run: () => openIntent(xUrl({ text: shareText, url: link })) },
  ];

  const nativeAvailable =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share your journey</DialogTitle>
          <DialogDescription>
            Send a link, post the postcard, or embed the globe anywhere.
          </DialogDescription>
        </DialogHeader>

        {busy ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Preparing your link...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {nativeAvailable && (
              <Button type="button" size="lg" onClick={nativeShare}>
                <Share2 className="size-4" />
                {file ? "Share postcard + link" : "Share link"}
              </Button>
            )}

            <div className="grid grid-cols-3 gap-2">
              {platforms.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  variant="outline"
                  onClick={p.run}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={copyLink}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                Copy link
              </Button>
              {file && (
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={savePostcard}
                >
                  <Download className="size-4" />
                  Postcard
                </Button>
              )}
            </div>

            {embedSnippet ? (
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Code2 className="size-3.5" />
                  Embed on a website
                </div>
                <code className="block max-h-16 overflow-y-auto break-all text-[11px] leading-relaxed text-muted-foreground">
                  {embedSnippet}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={copyEmbed}
                >
                  {embedCopied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  Copy embed code
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Publish a public link to unlock a rich preview and the embeddable
                globe.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
