import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clsx } from 'clsx';

type AuthScreen = "login" | "register" | "forgot";

const REMEMBER_LOGIN_KEY = "tcg.remember_login";
const REMEMBER_LOGIN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type RememberedLogin = { email: string; password: string; savedAt: number };

function readRememberedLogin(): RememberedLogin | null {
  try {
    const raw = localStorage.getItem(REMEMBER_LOGIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedLogin> | null;
    if (
      !parsed ||
      typeof parsed.email !== "string" ||
      typeof parsed.password !== "string" ||
      typeof parsed.savedAt !== "number"
    ) {
      localStorage.removeItem(REMEMBER_LOGIN_KEY);
      return null;
    }
    if (Date.now() - parsed.savedAt > REMEMBER_LOGIN_TTL_MS) {
      localStorage.removeItem(REMEMBER_LOGIN_KEY);
      return null;
    }
    return { email: parsed.email, password: parsed.password, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

function writeRememberedLogin(email: string, password: string) {
  try {
    localStorage.setItem(
      REMEMBER_LOGIN_KEY,
      JSON.stringify({ email, password, savedAt: Date.now() } satisfies RememberedLogin),
    );
  } catch {}
}

function clearRememberedLogin() {
  try {
    localStorage.removeItem(REMEMBER_LOGIN_KEY);
  } catch {}
}

export default function Login() {
  const [, setLocation] = useLocation();
  const [screen, setScreen] = useState<AuthScreen>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => readRememberedLogin()?.email ?? "");
  const [password, setPassword] = useState(() => readRememberedLogin()?.password ?? "");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => Boolean(readRememberedLogin()));
  const [error, setError] = useState(() => {
    const reason = new URLSearchParams(window.location.search).get("authError");
    if (reason === "google_not_configured") return "Google chưa được cấu hình trên máy chủ.";
    return reason ? "Đăng nhập Google chưa thành công. Vui lòng thử lại." : "";
  });

  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const post = async (path: string, body: any) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Lỗi ${res.status}`);
    }
    return res.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (screen === "login") {
        await post("/api/auth/login", { email, password, rememberMe });
        if (rememberMe) writeRememberedLogin(email.trim(), password);
        else clearRememberedLogin();
        setLocation("/thong-ke");
        window.location.href = "/thong-ke";
      } else if (screen === "register") {
        await post("/api/auth/register", { name, email, password, rememberMe });
        if (rememberMe) writeRememberedLogin(email.trim(), password);
        else clearRememberedLogin();
        setLocation("/thong-ke");
        window.location.href = "/thong-ke";
      } else if (!otpSent) {
        await post("/api/auth/password/forgot", { email });
        setOtpSent(true);
        setNotice("Đã gửi mã xác nhận 6 số qua Gmail. Mã có hiệu lực 10 phút.");
      } else {
        await post("/api/auth/password/reset", { email, code: otpCode, password });
        setNotice("Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.");
        setOtpCode("");
        setOtpSent(false);
        setPassword("");
        setScreen("login");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 24, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } }
  };

  const isEmailStep = screen === "login" || screen === "register";
  const title = {
    login: "Đăng nhập",
    register: "Tạo tài khoản",
    forgot: "Quên mật khẩu",
  }[screen];

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center px-4 bg-slate-950 overflow-hidden font-sans pt-[env(safe-area-inset-top,12px)] pb-[env(safe-area-inset-bottom,12px)]">
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
        .rgb-border-animated {
          background: linear-gradient(90deg, #ff007f, #7928ca, #0070f3, #00dfd8, #00ff88, #ffdd00, #ff007f);
          background-size: 300% 300%;
          animation: rgb-flow 4s ease infinite;
        }
      `}</style>

      <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: "url('/login-bg.jpg')" }} />
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />

      {/* Luxury Blobs - khối màu chuyển động phía sau */}
      <motion.div
        animate={{ x: [0, 40, -40, 0], y: [0, 30, -30, 0], rotate: [0, 15, -15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-15%] left-[-15%] w-[500px] h-[500px] rounded-full bg-yellow-400/20 blur-[120px] pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, -50, 50, 0], y: [0, -40, 40, 0], rotate: [0, -20, 20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear", delay: 2 }}
        className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, 30, -30, 0], y: [0, -20, 20, 0], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear", delay: 4 }}
        className="absolute bottom-[-15%] left-[10%] w-[600px] h-[600px] rounded-full bg-purple-500/15 blur-[140px] pointer-events-none"
      />

      <motion.div 
        initial={{ scale: 0.85, filter: "blur(20px)", opacity: 0 }}
        animate={{ scale: 1, filter: "blur(0px)", opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm space-y-4 rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-8 shadow-2xl overflow-hidden"
      >
        {/* Dải viền LED RGB ở mép trên card */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] rgb-border-animated" />

        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-2">
          <h1 className="text-center text-2xl font-black tracking-widest uppercase rgb-text-animated select-none">
            TCG MANAGER
          </h1>
          <p className="text-center text-xs text-slate-400">{title}</p>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {isEmailStep && (
              <div className="space-y-4">
                <Button type="button" variant="outline" className="w-full bg-white/5 border-slate-700 text-white hover:bg-white/10" onClick={() => window.location.assign("/api/auth/google")}>
                  <span className="mr-2 font-bold text-blue-400">G</span> Tiếp tục với Google
                </Button>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="h-px flex-1 bg-slate-700" />hoặc dùng email<span className="h-px flex-1 bg-slate-700" />
                </div>
                <div className="grid grid-cols-2 rounded-lg bg-slate-950/50 p-1 border border-slate-800">
                  <button type="button" onClick={() => { setScreen("login"); setError(""); setNotice(""); }} className={clsx("rounded-md px-3 py-2 text-sm transition-all", screen === "login" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200")}>
                    Đăng nhập
                  </button>
                  <button type="button" onClick={() => { setScreen("register"); setError(""); setNotice(""); }} className={clsx("rounded-md px-3 py-2 text-sm transition-all", screen === "register" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200")}>
                    Đăng ký
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {screen === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300 text-xs ml-1">Tên hiển thị</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required className="bg-slate-950/50 border-slate-700 text-white h-12 focus:ring-yellow-400" />
                </div>
              )}
              {isEmailStep && (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300 text-xs ml-1">Email</Label>
                  <Input id="email" name="username" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username email" required className="bg-slate-950/50 border-slate-700 text-white h-12 focus:ring-yellow-400" />
                </div>
              )}
              {screen === "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-slate-300 text-xs ml-1">Email đăng ký</Label>
                  <Input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username email" required className="bg-slate-950/50 border-slate-700 text-white h-12 focus:ring-yellow-400" />
                </div>
              )}
              {otpSent && screen === "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="otp-code" className="text-slate-300 text-xs ml-1">Mã xác nhận (6 số trong Gmail)</Label>
                  <Input id="otp-code" inputMode="numeric" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} required className="bg-slate-950/50 border-slate-700 text-white h-12 focus:ring-yellow-400" />
                </div>
              )}
              {(screen === "login" || screen === "register") && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300 text-xs ml-1">Mật khẩu</Label>
                  <Input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={screen === "login" ? "current-password" : "new-password"} minLength={screen === "register" ? 8 : undefined} maxLength={128} required className="bg-slate-950/50 border-slate-700 text-white h-12 focus:ring-yellow-400" />
                  {screen === "register" && <p className="text-[10px] text-slate-400 ml-1">Mật khẩu cần ít nhất 8 ký tự.</p>}
                </div>
              )}
              {screen === "forgot" && otpSent && (
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-slate-300 text-xs ml-1">Mật khẩu mới</Label>
                  <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required className="bg-slate-950/50 border-slate-700 text-white h-12 focus:ring-yellow-400" />
                  <p className="text-[10px] text-slate-400 ml-1">Mật khẩu cần ít nhất 8 ký tự.</p>
                </div>
              )}
              {isEmailStep && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300 ml-1">
                  <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 accent-yellow-400" />
                  Ghi nhớ đăng nhập trên thiết bị này (30 ngày)
                </label>
              )}
              {notice && <p role="status" className="text-sm text-emerald-400 ml-1">{notice}</p>}
              {error && <p role="alert" className="text-sm text-red-400 ml-1">{error}</p>}
              <motion.div variants={itemVariants} initial="hidden" animate="show" className="w-full">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl transition-all active:scale-95 bg-black/85 hover:bg-black border border-white/20 shadow-lg relative overflow-hidden group cursor-pointer"
                >
                  <div className="absolute inset-0 rgb-border-animated opacity-25 group-hover:opacity-45 transition-opacity pointer-events-none" />
                  <span className="relative z-10 text-base font-black tracking-wider uppercase rgb-text-animated">
                    {loading ? "Đang xử lý..." : screen === "login" ? "Đăng Nhập" : screen === "register" ? "Tạo tài khoản và đăng nhập" : otpSent ? "Đặt lại mật khẩu" : "Gửi mã xác nhận"}
                  </span>
                </Button>
              </motion.div>
            </form>
            {screen === "login" && <button type="button" onClick={() => { setScreen("forgot"); setError(""); setNotice(""); setOtpSent(false); }} className="w-full text-center text-xs text-sky-400 hover:underline transition-colors">Quên mật khẩu?</button>}
            {screen === "forgot" && <button type="button" onClick={() => { setScreen("login"); setError(""); setNotice(""); setOtpSent(false); }} className="w-full text-center text-xs text-slate-400 hover:underline transition-colors">Quay lại đăng nhập</button>}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
