import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Play, ArrowRight, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();

  // Đã đăng nhập mà mở trang gốc thì vào thẳng app, không dừng ở màn
  // hình Welcome — trước đây màn hình này hiện bất kể trạng thái đăng
  // nhập nên rất dễ gây hiểu nhầm là bị đăng xuất.
  useEffect(() => {
    if (!loading && user) setLocation("/thong-ke");
  }, [loading, user, setLocation]);

  // Đang kiểm tra phiên (hoặc sắp chuyển hướng): chỉ hiện nền trống
  // để tránh chớp màn hình Welcome trước khi vào app.
  if (loading || user) {
    return <div className="min-h-[100dvh] bg-[#070707]" />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const },
    },
  };

  const handleStart = () => {
    setLocation("/choose-franchise");
  };

  return (
    <div className="min-h-[100dvh] relative overflow-hidden bg-[#070707] font-sans text-white flex flex-col justify-center items-center p-3 sm:p-6 selection:bg-yellow-400 selection:text-slate-950 pt-[env(safe-area-inset-top,12px)] pb-[env(safe-area-inset-bottom,12px)]">
      {/* Nhúng Font Gaming Orbitron & CSS Keyframes cho hiệu ứng RGB Animation đa sắc màu */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&display=swap');

        .gaming-title {
          font-family: 'Orbitron', system-ui, -apple-system, sans-serif;
          letter-spacing: 0.05em;
        }

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
        .rgb-border-animated {
          background: linear-gradient(90deg, #ff007f, #7928ca, #0070f3, #00dfd8, #00ff88, #ffdd00, #ff007f);
          background-size: 300% 300%;
          animation: rgb-flow 4s ease infinite;
        }
      `}</style>

      {/* 1. Hình nền giao diện chính (Sân đấu Pokémon Arena rực rỡ, tối ưu cho PC & Mobile) */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 transform scale-100 md:scale-105"
        style={{ backgroundImage: "url('/welcome-bg.jpg')" }}
      />

      {/* 2. Lớp phủ Gradient làm dịu nền & tăng tương phản cho chữ */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/75" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/70 hidden md:block" />

      {/* 3. Khung nội dung kính mờ hiện đại (Glassmorphism) */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg backdrop-blur-md bg-black/60 border border-white/15 p-5 sm:p-8 md:p-10 rounded-3xl shadow-2xl text-center overflow-hidden my-auto"
      >
        {/* Dải viền LED RGB trên đỉnh Card */}
        <div className="absolute top-0 left-0 right-0 h-[3px] rgb-border-animated" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4 sm:space-y-6"
        >
          {/* Badge & Icon mở đầu */}
          <motion.div variants={itemVariants} className="flex flex-col items-center gap-2 sm:gap-3">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full rgb-border-animated opacity-70 blur-sm" />
              <div className="relative flex items-center justify-center w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full bg-black/80 border border-white/20 backdrop-blur-md shadow-lg">
                <Sparkles className="w-7 h-7 sm:w-9 sm:h-9 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-slate-300 font-bold px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm">
                Next-Gen Trading Card
              </span>
              <span className="text-[10px] sm:text-xs font-black tracking-wider text-yellow-400 px-2.5 py-0.5 rounded-full bg-yellow-400/15 border border-yellow-400/35 backdrop-blur-sm">
                v1.2
              </span>
            </div>
          </motion.div>

          {/* Tiêu đề TCG MANAGER Font Gaming thể thao điện tử, kích thước vừa vặn 100% khung hình */}
          <motion.div variants={itemVariants} className="space-y-1.5 sm:space-y-2">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black uppercase rgb-text-animated gaming-title select-none leading-tight px-1">
              TCG MANAGER
            </h1>
            <p className="text-[11px] sm:text-xs md:text-sm text-slate-300 tracking-wider uppercase font-semibold">
              Quản lý thẻ sưu tập Pokémon & One Piece
            </p>
          </motion.div>

          {/* Mô tả */}
          <motion.div variants={itemVariants}>
            <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed max-w-sm mx-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2 sm:line-clamp-none">
              Bắt đầu hành trình sưu tập thẻ của bạn. Khám phá kho hàng, theo dõi giá trị thị trường và quản lý giao dịch chuyên nghiệp.
            </p>
          </motion.div>

          {/* Nút bấm Khám phá */}
          <motion.div variants={itemVariants} className="pt-1 sm:pt-2">
            <Button
              onClick={handleStart}
              size="lg"
              className="w-full py-3.5 sm:py-4.5 md:py-5 text-base sm:text-lg md:text-xl font-black bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-slate-950 hover:from-yellow-300 hover:to-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.45)] hover:shadow-[0_0_45px_rgba(250,204,21,0.7)] transition-all active:scale-[0.98] rounded-2xl flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current transition-transform group-hover:scale-110" />
              <span>BẮT ĐẦU NGAY</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
