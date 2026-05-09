import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Code2, Loader2 } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || form.username.length < 3) { toast.error("Username must be at least 3 chars"); return; }
    if (!form.email) { toast.error("Email required"); return; }
    if (!form.password || form.password.length < 6) { toast.error("Password must be at least 6 chars"); return; }
    setBusy(true);
    try {
      await register(form.username, form.email, form.password);
      toast.success("Account created!");
      nav("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-white" data-testid="register-page">
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-[#10B981] opacity-[0.05] blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-md fade-up">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8" data-testid="register-logo">
          <div className="w-9 h-9 rounded-lg bg-[#7C3AED] flex items-center justify-center shadow-[0_4px_14px_rgba(124,58,237,0.35)]">
            <Code2 className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight">Coderift</span>
        </Link>
        <div className="card p-8 sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="text-sm muted-text mt-1">Start coding with your team in minutes.</p>
          <form onSubmit={submit} className="mt-7 space-y-4" data-testid="register-form">
            <div>
              <label className="text-xs font-medium block mb-1.5">Username</label>
              <input className="input" placeholder="codewizard" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} data-testid="register-username-input" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Email</label>
              <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="register-email-input" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Password</label>
              <input type="password" className="input" placeholder="At least 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="register-password-input" />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full flex items-center justify-center gap-2" data-testid="register-submit-btn">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
          <p className="text-sm muted-text text-center mt-6">
            Already have an account? <Link to="/login" className="text-[#7C3AED] font-medium hover:underline" data-testid="register-to-login-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
