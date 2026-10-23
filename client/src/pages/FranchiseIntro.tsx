import { useLocation } from "wouter";

type Franchise = "pokemon" | "onepiece";

const INFO: Record<
  Franchise,
  {
    name: string;
    color: string;
    bgImage: string;
    icon: string;
    desc: string;
    glowColor: string;
    btnColor: string;
  }
> = {
  pokemon: {
    name: "Pokémon",
    color: "text-yellow-400",
    bgImage: "/bg-pokemon.jpg",
    icon: "⚡",
    glowColor: "rgba(250, 204, 21, 0.4)",
    btnColor: "bg-yellow-400 text-black hover:bg-yellow-300",
    desc: "Thế giới đầy màu sắc của Pikachu, Charizard và hàng trăm loại thẻ Pokémon hiếm có. Quản lý kho hàng, theo dõi giá trị và giao dịch an toàn.",
  },
  onepiece: {
    name: "One Piece",
    color: "text-red-400",
    bgImage: "/bg-onepiece.jpg",
    icon: "🏴‍☠️",
    glowColor: "rgba(248, 113, 113, 0.4)",
    btnColor: "bg-red-600 text-white hover:bg-red-500",
    desc: "Hành trình tìm One Piece cùng Luffy và băng Mũ Rơm. Sưu tập thẻ hải tặc, hùng khách và những kho báu truyền thuyết.",
  },
};

export default function FranchiseIntro() {
  const [location, setLocation] = useLocation();
  const franchise = (location.split("/").pop() ?? "pokemon") as Franchise;
  const info = INFO[franchise] ?? INFO.pokemon;

  return (
    <div className="min-h-[100dvh] relative overflow-hidden bg-[#070707] font-sans text-white flex flex-col justify-center items-center p-3 sm:p-6 pt-[env(safe-area-inset-top,12px)] pb-[env(safe-area-inset-bottom,12px)]">
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
          50% { filter: drop-shadow(0 0 20px rgba(0, 223, 216, 0.7)); }
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
      `}</style>

      {/* 1. Hình nền co giãn tối ưu cho cả PC và Điện thoại (tự động căn giữa chủ thể) */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 transform scale-100 md:scale-105"
        style={{ backgroundImage: `url('${info.bgImage}')` }}
      />

      {/* 2. Lớp gradient phủ viền & tối nền để bảo đảm độ tương phản */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/75" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-transparent to-black/65 hidden md:block" />

      {/* 3. Khung nội dung kính mờ (Glassmorphism) chống rối mắt */}
      <div className="relative z-10 w-full max-w-lg my-auto backdrop-blur-md bg-black/60 border border-white/15 p-5 sm:p-8 rounded-3xl shadow-2xl text-center">
        <div
          className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-3 sm:mb-4 text-2xl sm:text-4xl shadow-xl"
          style={{ filter: `drop-shadow(0 0 20px ${info.glowColor})` }}
        >
          {info.icon}
        </div>

        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight mb-2 sm:mb-3 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] rgb-text-animated leading-none">
          {info.name}
        </h2>

        <p className="text-slate-200 text-xs sm:text-sm md:text-base leading-relaxed mb-6 sm:mb-8 max-w-md mx-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {info.desc}
        </p>

        <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
          <button
            onClick={() => {
              try {
                localStorage.setItem("tcg_selected_franchise", franchise);
              } catch {}
              setLocation("/login");
            }}
            className={`w-full py-3.5 sm:py-4 text-base sm:text-lg font-black rounded-2xl ${info.btnColor} active:scale-95 transition-all shadow-[0_0_25px_rgba(255,255,255,0.25)] touch-manipulation`}
          >
            Tiếp tục Đăng nhập
          </button>

          <button
            onClick={() => setLocation("/choose-franchise")}
            className="text-xs sm:text-sm text-slate-300 hover:text-white underline underline-offset-4 py-1.5 sm:py-2 transition-colors touch-manipulation"
          >
            ← Quay lại chọn thế giới khác
          </button>
        </div>
      </div>
    </div>
  );
}
