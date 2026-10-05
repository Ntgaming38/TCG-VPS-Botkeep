import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useLocation } from "wouter";

type AuthScreen = "login" | "register" | "verify_registration" | "forgot_password" | "reset_password";

export default function Login() {
  const [, setLocation] = useLocation();
  const [screen, setScreen] = useState<AuthScreen>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState(() => {
    const reason = new URLSearchParams(window.location.search).get("authError");
    if (reason === "google_not_configured") return "Google chưa được cấu hình trên máy chủ.";
    return reason ? "Đăng nhập Google chưa thành công. Vui lòng thử lại." : "";
  });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const post = async (path: string, body: Record<string, string | boolean>) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Yêu cầu chưa hoàn tất");
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (screen === "login") {
        await post("/api/auth/login", { email, password, rememberMe });
        setLocation("/thong-ke");
        window.location.href = "/thong-ke";
      } else if (screen === "register") {
        await post("/api/auth/register", { name, email, password, rememberMe });
        setCode("");
        setScreen("verify_registration");
        setNotice(`Mã xác nhận đã được gửi tới ${email}. Mã có hiệu lực trong 10 phút.`);
      } else if (screen === "verify_registration") {
        await post("/api/auth/register/verify", { email, code });
        setLocation("/thong-ke");
        window.location.href = "/thong-ke";
      } else if (screen === "forgot_password") {
        await post("/api/auth/password/forgot", { email });
        setCode("");
        setScreen("reset_password");
        setNotice("Nếu email có tài khoản, mã đặt lại mật khẩu đã được gửi. Mã có hiệu lực trong 10 phút.");
      } else {
        await post("/api/auth/password/reset", { email, code, password: newPassword });
        setPassword("");
        setNewPassword("");
        setCode("");
        setScreen("login");
        setNotice("Mật khẩu đã được đổi. Hãy đăng nhập bằng mật khẩu mới.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (screen === "verify_registration") {
        await post("/api/auth/register", { name, email, password, rememberMe });
      } else {
        await post("/api/auth/password/forgot", { email });
      }
      setNotice("Nếu có thể gửi mã mới, email sẽ đến trong ít phút. Chỉ có thể gửi lại sau 60 giây.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isEmailStep = screen === "login" || screen === "register";
  const isVerificationStep = screen === "verify_registration" || screen === "reset_password";
  const title = {
    login: "Đăng nhập",
    register: "Tạo tài khoản",
    verify_registration: "Xác nhận email",
    forgot_password: "Quên mật khẩu",
    reset_password: "Đặt lại mật khẩu",
  }[screen];

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-slate-950 bg-cover bg-center" style={{ backgroundImage: "url('/login-bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-slate-950/60" />
      <div className="relative w-full max-w-sm space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="space-y-2">
          <h1 className="text-center text-2xl font-bold tracking-widest text-yellow-400">TCG MANAGER</h1>
          <p className="text-center text-xs text-slate-400">{title}</p>
        </div>
        {isEmailStep && <>
          <Button type="button" variant="outline" className="w-full" onClick={() => window.location.assign("/api/auth/google")}>
            <span className="mr-2 font-bold text-blue-400">G</span> Tiếp tục với Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-700" />hoặc dùng email<span className="h-px flex-1 bg-slate-700" />
          </div>
          <div className="grid grid-cols-2 rounded-md border border-slate-700 p-1">
            <button type="button" onClick={() => { setScreen("login"); setError(""); setNotice(""); }} className={`rounded px-3 py-2 text-sm ${screen === "login" ? "bg-slate-700 text-white" : "text-slate-400"}`}>
              Đăng nhập
            </button>
            <button type="button" onClick={() => { setScreen("register"); setError(""); setNotice(""); }} className={`rounded px-3 py-2 text-sm ${screen === "register" ? "bg-slate-700 text-white" : "text-slate-400"}`}>
              Đăng ký
            </button>
          </div>
        </>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {screen === "register" && <div className="space-y-2">
            <Label htmlFor="name">Tên hiển thị</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          </div>}
          {(isEmailStep || screen === "forgot_password") && <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="username" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username email" required />
          </div>}
          {(screen === "login" || screen === "register") && <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={screen === "login" ? "current-password" : "new-password"} minLength={screen === "register" ? 8 : undefined} maxLength={128} required />
            {screen === "register" && <p className="text-xs text-slate-400">Mật khẩu cần ít nhất 8 ký tự.</p>}
          </div>}
          {isEmailStep && <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 accent-primary" />
            Ghi nhớ đăng nhập trên thiết bị này (30 ngày)
          </label>}
          {isVerificationStep && <>
            <div className="space-y-2">
              <Label htmlFor="code">Mã 6 chữ số gửi tới {email}</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required />
              <p className="text-xs text-slate-400">Mã hết hạn sau 10 phút. Nếu chưa thấy email, hãy kiểm tra Thư rác hoặc Thùng rác. Có thể gửi lại sau 60 giây.</p>
            </div>
            {screen === "reset_password" && <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required />
            </div>}
          </>}
          {screen === "login" && <button type="button" onClick={() => { setScreen("forgot_password"); setError(""); setNotice(""); }} className="w-full text-right text-sm text-sky-400 hover:text-sky-300">Quên mật khẩu?</button>}
          {notice && <p role="status" className="text-sm text-emerald-400">{notice}</p>}
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Đang xử lý..." : screen === "login" ? "Đăng nhập vào Kho" : screen === "register" ? "Gửi mã xác nhận" : screen === "verify_registration" ? "Xác nhận và tạo tài khoản" : screen === "forgot_password" ? "Gửi mã đặt lại mật khẩu" : "Đổi mật khẩu"}
          </Button>
        </form>
        {isVerificationStep && <Button type="button" variant="outline" className="w-full" onClick={resendCode} disabled={loading}>Gửi lại mã</Button>}
        {(screen === "forgot_password" || isVerificationStep) && <Button type="button" variant="ghost" className="w-full" onClick={() => { setScreen("login"); setError(""); setNotice(""); }}>Quay lại đăng nhập</Button>}
        {screen === "forgot_password" && <p className="text-xs text-slate-500">Tài khoản quản trị dùng ADMIN_PASSWORD trong cấu hình máy chủ.</p>}
      </div>
    </div>
  );
}
