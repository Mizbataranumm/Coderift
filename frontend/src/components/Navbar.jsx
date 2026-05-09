import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Code2 } from "lucide-react";

export default function Navbar({ variant = "app" }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-40 glass" data-testid="app-navbar">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group" data-testid="navbar-logo">
          <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center shadow-[0_4px_14px_rgba(124,58,237,0.35)]">
            <Code2 className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-[15px] tracking-tight">Coderift</span>
        </Link>

        <div className="flex items-center gap-2">
          {!user && variant === "marketing" && (
            <>
              <Link to="/login" className="btn-ghost" data-testid="navbar-login-btn">Log in</Link>
              <Link to="/register" className="btn-primary" data-testid="navbar-register-btn">Get started</Link>
            </>
          )}
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAFAFA] border border-black/5">
                <img src={user.avatar} alt={user.username} className="w-6 h-6 rounded-full" />
                <span className="text-sm font-medium" data-testid="navbar-username">{user.username}</span>
              </div>
              <button onClick={() => { logout(); window.location.href = "/"; }} className="btn-ghost flex items-center gap-1.5" data-testid="navbar-logout-btn">
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
