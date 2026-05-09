import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Code2, Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error("Email and password required"); return; }
    setBusy(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      nav("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-white" data-testid="login-page">
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-[#7C3AED] opacity-[0.06] blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-md fade-up">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8" data-testid="login-logo">
          <div className="w-9 h-9 rounded-lg bg-[#7C3AED] flex items-center justify-center shadow-[0_4px_14px_rgba(124,58,237,0.35)]">
            <Code2 className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight">Coderift</span>
        </Link>
        <div className="card p-8 sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm muted-text mt-1">Sign in to continue to your rooms.</p>
          <form onSubmit={submit} className="mt-7 space-y-4" data-testid="login-form">
            <div>
              <label className="text-xs font-medium text-[#0a0a0a] mb-1.5 block">Email</label>
              <input type="email" autoComplete="email" className="input" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="login-email-input" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#0a0a0a] mb-1.5 block">Password</label>
              <input type="password" autoComplete="current-password" className="input" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="login-password-input" />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full flex items-center justify-center gap-2" data-testid="login-submit-btn">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="text-sm muted-text text-center mt-6">
            Don't have an account? <Link to="/register" className="text-[#7C3AED] font-medium hover:underline" data-testid="login-to-register-link">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
