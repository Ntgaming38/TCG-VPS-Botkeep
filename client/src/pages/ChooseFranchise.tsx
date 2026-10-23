import { useState } from "react";
import { useLocation } from "wouter";

type Side = "pokemon" | "onepiece";

export default function ChooseFranchise() {
  const [, setLocation] = useLocation();
  const [hoveredSide, setHoveredSide] = useState<Side | null>(null);

  const goIntro = (id: Side) => {
    try {
      localStorage.setItem("tcg_selected_franchise", id);
    } catch {}
    setLocation(`/intro/${id}`);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden relative bg-[#050505] font-sans text-white select-none flex flex-col pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      {/* CSS Keyframes cho hiệu ứng RGB Animation sống động */}
      <style>{`
        @keyframes rgb-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes rgb-glow {
          0% { filter: drop-shadow(0 0 15px rgba(255, 0, 128, 0.7)); }
          25% { filter: drop-shadow(0 0 15px rgba(0, 112, 243, 0.7)); }
          50% { filter: drop-shadow(0 0 15px rgba(0, 223, 216, 0.7)); }
          75% { filter: drop-shadow(0 0 15px rgba(0, 255, 136, 0.7)); }
          100% { filter: drop-shadow(0 0 15px rgba(255, 0, 128, 0.7)); }
        }
        .rgb-text-animated {
          background: linear-gradient(90deg, #ff007f, #7928ca, #0070f3, #00dfd8, #00ff88, #ffdd00, #ff007f);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: rgb-flow 4s ease infinite, rgb-glow 4s ease infinite;
        }
        .rgb-border-animated {
          background: linear-gradient(90deg, #ff007f, #7928ca, #0070f3, #00dfd8, #00ff88, #ffdd00, #ff007f);
          background-size: 300% 300%;
          animation: rgb-flow 4s ease infinite;
        }
      `}</style>

      {/* TOP HEADER: Thanh chọn chủ đề lơ lửng (tối ưu responsive mobile) */}
      <div className="absolute top-2.5 sm:top-5 left-0 right-0 z-30 flex justify-center pointer-events-none px-3">
        <div className="backdrop-blur-xl bg-black/75 border border-white/20 px-3.5 sm:px-6 py-1 sm:py-2 rounded-full shadow-2xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full rgb-border-animated animate-ping" />
          <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] text-white">
            Chọn thế giới của bạn
          </h2>
        </div>
      </div>

      {/* MAIN CONTAINER: Chia đôi màn hình (Split Screen) */}
      <div className="flex-1 w-full flex flex-col md:flex-row relative overflow-hidden">
        {/* ==================== 1. NỬA POKÉMON (Trái trên PC / Nửa trên trên Mobile) ==================== */}
        <div
          onClick={() => goIntro("pokemon")}
          onMouseEnter={() => setHoveredSide("pokemon")}
          onMouseLeave={() => setHoveredSide(null)}
          className={`relative h-1/2 md:h-full cursor-pointer transition-all duration-500 ease-out overflow-hidden flex flex-col justify-center items-center p-3 sm:p-6 text-center group active:scale-[0.99] touch-manipulation ${
            hoveredSide === "pokemon"
              ? "md:w-[58%] z-10"
              : hoveredSide === "onepiece"
              ? "md:w-[42%] opacity-85"
              : "md:w-1/2"
          }`}
        >
          {/* Ảnh nền Pokémon */}
          <div
            className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
              hoveredSide === "pokemon"
                ? "scale-105 filter brightness-105"
                : "scale-100 filter brightness-90"
            }`}
            style={{ backgroundImage: "url('/bg-pokemon.jpg')" }}
          />

          {/* Lớp phủ Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/65 pointer-events-none" />
          <div
            className={`absolute inset-0 bg-yellow-500/15 mix-blend-overlay transition-opacity duration-500 pointer-events-none ${
              hoveredSide === "pokemon" ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Nội dung bên trong Pokémon (tối ưu kích thước cho màn hình dọc điện thoại) */}
          <div className="relative z-20 flex flex-col items-center max-w-xs sm:max-w-sm mt-3 sm:mt-0">
            {/* Icon tròn */}
            <div className="w-11 h-11 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-black/70 border border-yellow-400/50 backdrop-blur-md flex items-center justify-center mb-1.5 sm:mb-3 text-xl sm:text-3xl md:text-4xl shadow-[0_0_20px_rgba(250,204,21,0.4)] group-hover:scale-110 group-hover:border-yellow-400 transition-all duration-300">
              ⚡
            </div>

            {/* Tiêu đề Pokémon chạy hiệu ứng RGB */}
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-black uppercase tracking-wider mb-1 select-none rgb-text-animated leading-none">
              Pokémon
            </h1>

            <p className="text-slate-200 text-[11px] sm:text-xs md:text-sm font-medium mb-2.5 sm:mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-1 sm:line-clamp-none">
              Pikachu, Charizard & Thế giới sưu tập huyền thoại
            </p>

            {/* Nút hành động */}
            <div className="px-4 py-1.5 sm:px-6 sm:py-2.5 rounded-xl sm:rounded-2xl bg-yellow-400 text-black font-black text-[11px] sm:text-xs md:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(250,204,21,0.5)] group-hover:bg-yellow-300 group-hover:scale-105 active:scale-95 transition-all">
              Khám phá thế giới →
            </div>
          </div>
        </div>

        {/* ==================== 2. NỬA ONE PIECE (Phải trên PC / Nửa dưới trên Mobile) ==================== */}
        <div
          onClick={() => goIntro("onepiece")}
          onMouseEnter={() => setHoveredSide("onepiece")}
          onMouseLeave={() => setHoveredSide(null)}
          className={`relative h-1/2 md:h-full cursor-pointer transition-all duration-500 ease-out overflow-hidden flex flex-col justify-center items-center p-3 sm:p-6 text-center group active:scale-[0.99] touch-manipulation ${
            hoveredSide === "onepiece"
              ? "md:w-[58%] z-10"
              : hoveredSide === "pokemon"
              ? "md:w-[42%] opacity-85"
              : "md:w-1/2"
          }`}
        >
          {/* Ảnh nền One Piece */}
          <div
            className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
              hoveredSide === "onepiece"
                ? "scale-105 filter brightness-105"
                : "scale-100 filter brightness-90"
            }`}
            style={{ backgroundImage: "url('/bg-onepiece.jpg')" }}
          />

          {/* Lớp phủ Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/65 pointer-events-none" />
          <div
            className={`absolute inset-0 bg-red-600/15 mix-blend-overlay transition-opacity duration-500 pointer-events-none ${
              hoveredSide === "onepiece" ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Nội dung bên trong One Piece (tối ưu kích thước cho màn hình dọc điện thoại) */}
          <div className="relative z-20 flex flex-col items-center max-w-xs sm:max-w-sm mb-4 sm:mb-0">
            {/* Icon tròn */}
            <div className="w-11 h-11 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-black/70 border border-red-500/50 backdrop-blur-md flex items-center justify-center mb-1.5 sm:mb-3 text-xl sm:text-3xl md:text-4xl shadow-[0_0_20px_rgba(239,68,68,0.4)] group-hover:scale-110 group-hover:border-red-400 transition-all duration-300">
              🏴‍☠️
            </div>

            {/* Tiêu đề One Piece chạy hiệu ứng RGB */}
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-black uppercase tracking-wider mb-1 select-none rgb-text-animated leading-none">
              One Piece
            </h1>

            <p className="text-slate-200 text-[11px] sm:text-xs md:text-sm font-medium mb-2.5 sm:mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-1 sm:line-clamp-none">
              Luffy, Băng Mũ Rơm & Hành trình tìm kho báu TCG
            </p>

            {/* Nút hành động */}
            <div className="px-4 py-1.5 sm:px-6 sm:py-2.5 rounded-xl sm:rounded-2xl bg-red-600 text-white font-black text-[11px] sm:text-xs md:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(239,68,68,0.5)] group-hover:bg-red-500 group-hover:scale-105 active:scale-95 transition-all">
              Khám phá thế giới →
            </div>
          </div>
        </div>

        {/* ==================== 3. ĐƯỜNG PHÂN CÁCH & HUY HIỆU VS Ở CHÍNH GIỮA ==================== */}
        {/* Đường viền LED RGB phân cách giữa 2 nửa */}
        <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] rgb-border-animated pointer-events-none z-20 shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
        <div className="md:hidden absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] rgb-border-animated pointer-events-none z-20 shadow-[0_0_15px_rgba(255,255,255,0.4)]" />

        {/* Huy hiệu VS nổi ở trung tâm (kích thước tinh chỉnh gọn gàng trên mobile) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="relative">
            <div className="absolute -inset-1.5 rounded-full rgb-border-animated blur-sm opacity-80 animate-pulse" />
            <div className="relative w-9 h-9 sm:w-14 sm:h-14 rounded-full bg-black/90 border border-white/25 flex flex-col items-center justify-center shadow-2xl backdrop-blur-xl">
              <span className="text-[8px] sm:text-xs font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400">
                TCG
              </span>
              <span className="text-[7px] sm:text-[9px] font-bold text-slate-300 -mt-0.5">
                VS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM FOOTER: Nút bỏ qua đăng nhập */}
      <div className="absolute bottom-2 sm:bottom-4 left-0 right-0 z-30 flex justify-center pointer-events-none px-3">
        <button
          onClick={() => setLocation("/login")}
          className="pointer-events-auto text-[10px] sm:text-xs text-slate-300 hover:text-white underline underline-offset-4 backdrop-blur-md bg-black/70 px-3.5 py-1 rounded-full border border-white/10 transition-all shadow-lg active:scale-95"
        >
          Bỏ qua & Đăng nhập trực tiếp
        </button>
      </div>
    </div>
  );
}
