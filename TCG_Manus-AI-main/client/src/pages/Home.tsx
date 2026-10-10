import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      setLocation("/thong-ke");
    }
  }, [user, loading, setLocation]);

  const handleStart = useCallback(() => {
    // Trigger transition animation before login
    setTransitioning(true);
    // Wait for animation to complete, then start login
    setTimeout(() => {
      startLogin();
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-green-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Full background image - the Pokemon artwork */}
      <div className="absolute inset-0">
        <img
          src="/manus-storage/pokemon-login-bg_e32eb1ad.png"
          alt="Pokemon Trading Manager"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Transition overlay - fades to black when starting */}
      {transitioning && (
        <div className="absolute inset-0 z-50 bg-black page-transition-overlay flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-green-400" />
            <p className="text-green-400 font-bold text-lg tracking-wider animate-pulse">
              Đang kết nối...
            </p>
          </div>
        </div>
      )}

      {/* Overlay content - positioned over the image */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-between py-8">
        {/* Top area - POKÉMON logo - larger and perfectly centered */}
        <div className="flex flex-col items-center justify-center mt-2 w-full animate-slide-down">
          <h1 className="pokemon-logo-text text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-wider select-none text-center leading-none">
            TCG Manager
          </h1>
        </div>

        {/* Bottom area - Login section */}
        <div className="w-full max-w-md px-6 flex flex-col items-center gap-4 mb-8 animate-slide-up">
          {/* Server info bar */}
          <div className="w-full bg-black/60 backdrop-blur-sm border border-yellow-500/30 rounded-lg px-4 py-3 flex items-center justify-between shadow-[0_0_10px_rgba(255,203,5,0.1)]">
            <span className="text-white/80 text-sm">TCG Manager</span>
            <span className="text-yellow-400 text-sm font-semibold">v1.0</span>
          </div>

          {/* Login button with pulse animation */}
          <Button
            onClick={handleStart}
            disabled={transitioning}
            size="lg"
            className="w-full max-w-[220px] red-btn text-xl rounded-lg py-7 border-0 btn-red-pulse disabled:opacity-70"
          >
            {transitioning ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Bắt đầu"
            )}
          </Button>

          {/* Version text */}
          <p className="text-white/40 text-xs">
            Phiên bản: 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
