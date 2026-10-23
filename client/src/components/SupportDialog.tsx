import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, QrCode, MessageCircle, Send, Video, Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`Đã sao chép ${label}!`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-950/95 border border-white/15 text-white backdrop-blur-2xl shadow-2xl p-6 rounded-3xl overflow-y-auto max-h-[88dvh]">
        {/* Dải LED RGB trên đỉnh Card */}
        <div
          className="absolute top-0 left-0 right-0 h-[2.5px]"
          style={{
            background: "linear-gradient(90deg, #ff007f, #7928ca, #0070f3, #00dfd8, #00ff88, #ffdd00, #ff007f)",
            backgroundSize: "300% 300%",
            animation: "rgb-flow 4s ease infinite",
          }}
        />

        <DialogHeader className="text-center pt-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(0,212,255,0.4)]">
            <MessageCircle className="w-6 h-6 text-cyan-400" />
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400">
            Trung Tâm Hỗ Trợ TCG
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-300">
            Liên hệ trực tiếp với Admin để được hỗ trợ kỹ thuật, tài khoản hoặc giao dịch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 my-3">
          {/* 1. KÊNH TELEGRAM */}
          <div className="rounded-2xl border border-sky-500/30 bg-sky-950/30 p-3.5 transition-all hover:border-sky-400/60 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-sky-200">Telegram</h4>
                  <p className="text-xs text-sky-400/80 font-mono">@Gen_G_VN</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowQr(!showQr)}
                  className="h-8 px-2.5 text-xs bg-sky-500/10 border-sky-500/30 text-sky-300 hover:bg-sky-500/20"
                >
                  <QrCode className="w-3.5 h-3.5 mr-1" />
                  {showQr ? "Đóng QR" : "Mã QR"}
                </Button>
                <a
                  href="https://t.me/Gen_G_VN"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center h-8 px-3 text-xs font-bold rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
                >
                  Chat <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>

            {/* Hiển thị Mã QR Telegram */}
            {showQr && (
              <div className="mt-3.5 pt-3 border-t border-sky-500/20 flex flex-col items-center">
                <div className="relative p-2 bg-black rounded-2xl border border-sky-400/40 shadow-xl overflow-hidden max-w-[240px]">
                  <img
                    src="/telegram-qr.png"
                    alt="Telegram QR Code Gen/G_VN"
                    className="w-full rounded-xl object-contain max-h-[200px]"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2 text-center">
                  Mở camera điện thoại hoặc ứng dụng Telegram để quét mã
                </p>
              </div>
            )}
          </div>

          {/* 2. KÊNH FACEBOOK */}
          <div className="rounded-2xl border border-blue-500/30 bg-blue-950/30 p-3.5 transition-all hover:border-blue-400/60 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0 font-black text-lg">
                  f
                </div>
                <div>
                  <h4 className="font-bold text-sm text-blue-200">Facebook</h4>
                  <p className="text-xs text-blue-400/80">Nguyễn Trọng Thủy (Admin)</p>
                </div>
              </div>

              <a
                href="https://www.facebook.com/profile.php?id=100009901756563"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-8 px-3 text-xs font-bold rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Nhắn tin <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>

          {/* 3. KÊNH TIKTOK */}
          <div className="rounded-2xl border border-pink-500/30 bg-pink-950/20 p-3.5 transition-all hover:border-pink-400/60 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-pink-400 shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-pink-200">TikTok</h4>
                  <p className="text-xs text-pink-400/80">@gen.g_38</p>
                </div>
              </div>

              <a
                href="https://www.tiktok.com/@gen.g_38"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-8 px-3 text-xs font-bold rounded-md bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white transition-colors"
              >
                Xem kênh <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>
        </div>

        <div className="text-center pt-1 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>Hệ thống TCG Manager v1.2</span>
          <button
            onClick={() => copyToClipboard("https://t.me/Gen_G_VN", "link Telegram")}
            className="hover:text-white inline-flex items-center gap-1 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            <span>Sao chép link Telegram</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

