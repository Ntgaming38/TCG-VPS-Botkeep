import React, { useState } from "react";
import { SupportDialog } from "./SupportDialog";

export default function SupportFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Nút bấm tròn nổi ở góc dưới màn hình — tính Safe Area cho iPhone notch/home bar */}
      <div
        className="fixed right-4 sm:right-6 z-40"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label="Liên hệ hỗ trợ"
          className="group relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-950/90 border border-white/20 text-white shadow-[0_0_25px_rgba(0,212,255,0.35)] backdrop-blur-md hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
        >
          {/* Vòng sáng LED RGB xoay xung quanh nút */}
          <div
            className="absolute -inset-1 rounded-full opacity-70 group-hover:opacity-100 blur-[2px] transition-opacity pointer-events-none"
            style={{
              background: "linear-gradient(90deg, #ff007f, #7928ca, #0070f3, #00dfd8, #00ff88, #ffdd00, #ff007f)",
              backgroundSize: "300% 300%",
              animation: "rgb-flow 4s ease infinite",
            }}
          />

          <div className="relative z-10 flex items-center justify-center w-full h-full rounded-full bg-slate-950 text-xl sm:text-2xl leading-none select-none">
            💬
          </div>

          {/* Tooltip hiển thị khi hover trên máy tính */}
          <span className="hidden sm:group-hover:inline-block absolute right-full mr-3 px-3 py-1.5 text-xs font-bold text-white bg-black/90 border border-white/15 rounded-xl whitespace-nowrap shadow-xl backdrop-blur-md pointer-events-none transition-all">
            Hỗ trợ & Liên hệ
          </span>
        </button>
      </div>

      {/* Modal chi tiết liên hệ */}
      <SupportDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

