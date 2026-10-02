import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => {
    const reason = new URLSearchParams(window.location.search).get("authError");
    if (reason === "google_not_configured") return "Google chưa được cấu hình trên máy chủ.";
    return reason ? "Đăng nhập Google chưa thành công. Vui lòng thử lại." : "";
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || (mode === "login" ? "Đăng nhập thất bại" : "Đăng ký thất bại"));
      setLocation("/kho-hang");
      window.location.href = "/kho-hang";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="space-y-2">
          <h1 className="text-center text-2xl font-bold tracking-widest text-yellow-400">TCG MANAGER</h1>
          <p className="text-center text-xs text-slate-400">Đăng nhập hoặc tạo tài khoản</p>
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={() => window.location.assign("/api/auth/google")}>
          <span className="mr-2 font-bold text-blue-400">G</span> Tiếp tục với Google
        </Button>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-700" />
          hoặc dùng email
          <span className="h-px flex-1 bg-slate-700" />
        </div>
        <div className="grid grid-cols-2 rounded-md border border-slate-700 p-1">
          <button type="button" onClick={() => { setMode("login"); setError(""); }} className={`rounded px-3 py-2 text-sm ${mode === "login" ? "bg-slate-700 text-white" : "text-slate-400"}`}>
            Đăng nhập
          </button>
          <button type="button" onClick={() => { setMode("register"); setError(""); }} className={`rounded px-3 py-2 text-sm ${mode === "register" ? "bg-slate-700 text-white" : "text-slate-400"}`}>
            Đăng ký
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && <div className="space-y-2">
            <Label htmlFor="name">Tên hiển thị</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          </div>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 12 : undefined} maxLength={128} required />
            {mode === "register" && <p className="text-xs text-slate-400">Mật khẩu cần ít nhất 12 ký tự.</p>}
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập vào Kho" : "Tạo tài khoản"}
          </Button>
        </form>
      </div>
    </div>
  );
}
