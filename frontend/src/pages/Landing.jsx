import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { ArrowRight, Zap, Users, Sparkles, Play, Cpu, Shield, GitBranch } from "lucide-react";

const SAMPLE_LINES = [
  { code: 'function fibonacci(n) {', color: '#7C3AED' },
  { code: '  if (n <= 1) return n;', color: '#0a0a0a' },
  { code: '  return fib(n-1) + fib(n-2);', color: '#0a0a0a' },
  { code: '}', color: '#7C3AED' },
  { code: '', color: '#0a0a0a' },
  { code: '// AI suggests: use memoization', color: '#10B981' },
  { code: 'const memo = new Map();', color: '#0a0a0a' },
  { code: 'console.log(fibonacci(40));', color: '#0a0a0a' },
];

function AnimatedCodePreview() {
  const [lines, setLines] = useState([]);
  useEffect(() => {
    const id = setInterval(() => {
      setLines((prev) => {
        if (prev.length >= SAMPLE_LINES.length) { clearInterval(id); return prev; }
        return [...prev, SAMPLE_LINES[prev.length]];
      });
    }, 220);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="card p-0 overflow-hidden" data-testid="hero-code-preview">
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 bg-[#FAFAFA]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
        </div>
        <div className="text-[11px] mono text-[#525252]">main.js · Coderift</div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-[#7C3AED] border-2 border-white text-[10px] text-white flex items-center justify-center font-semibold">A</div>
          <div className="w-6 h-6 rounded-full bg-[#10B981] border-2 border-white text-[10px] text-white flex items-center justify-center font-semibold -ml-2">B</div>
          <div className="w-6 h-6 rounded-full bg-[#F59E0B] border-2 border-white text-[10px] text-white flex items-center justify-center font-semibold -ml-2">C</div>
        </div>
      </div>
      <div className="bg-white p-5 mono text-[13px] leading-7 min-h-[260px]">
        {lines.map((l, i) => (
          <div key={i} className="fade-up flex">
            <span className="select-none w-7 text-right pr-3 text-[#9CA3AF]">{i + 1}</span>
            <span style={{ color: l.color }}>{l.code || '\u00A0'}</span>
            {i === lines.length - 1 && <span className="cursor-blink ml-0.5 inline-block w-[7px] h-[16px] bg-[#7C3AED] translate-y-1" />}
          </div>
        ))}
      </div>
    </div>
  );
}

const features = [
  { icon: Users, title: "Real-time collaboration", desc: "See cursors, edits, and presence of every collaborator instantly. Built on Socket.IO." },
  { icon: Sparkles, title: "AI-powered review", desc: "Gemini-backed code review, quick fix, explain, and generate — one click away." },
  { icon: Play, title: "Run any language", desc: "Execute JS, Python, Java, C++, Go, Rust, Ruby, PHP, C# in-browser via Piston." },
  { icon: Zap, title: "Ghost Replay", desc: "Replay how your code evolved. Every snapshot stored for time-travel debugging." },
  { icon: Cpu, title: "Battle Mode", desc: "Race against another coder. Live timer, shared problem, may the best solution win." },
  { icon: Shield, title: "Rage Meter", desc: "Visual indicator of how much you delete and rewrite. Self-aware coding." },
];

const testimonials = [
  { name: "Mira K.", role: "Senior Engineer, Stripe", text: "Coderift turned our pairing sessions from screensharing chores into actual collaboration. The AI review is uncanny." },
  { name: "Diego R.", role: "CS Student, MIT", text: "Battle Mode is addictive. My friends and I race every weekend. The Rage Meter is humbling." },
  { name: "Aisha B.", role: "Tech Lead, Nubank", text: "Ghost Replay alone is worth it. Reviewing how a junior solved a tricky bug in real-time? Game changer." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden" data-testid="landing-page">
      {/* Decorative bg */}
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-[#7C3AED] opacity-[0.06] blur-3xl pointer-events-none" />
      <div className="absolute top-96 -left-40 w-[420px] h-[420px] rounded-full bg-[#10B981] opacity-[0.05] blur-3xl pointer-events-none" />

      <Navbar variant="marketing" />

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C3AED]/8 border border-[#7C3AED]/15 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse" />
              <span className="text-xs font-semibold text-[#6D28D9] tracking-wide">v1.0 · Now with Battle Mode</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.05] text-[#0a0a0a]">
              Code together.<br />
              <span className="text-gradient">Ship faster.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg muted-text leading-relaxed max-w-xl">
              The collaborative code editor built for the AI era. Real-time pairing, Gemini-powered reviews, and <span className="font-medium text-[#0a0a0a]">eight unique modes</span> you won't find anywhere else.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary inline-flex items-center gap-1.5" data-testid="hero-cta-start">
                Start Coding Together <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="btn-secondary" data-testid="hero-cta-login">I have an account</Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs muted-text">
              <span className="flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5" /> 10+ languages</span>
              <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Gemini AI</span>
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Live cursors</span>
            </div>
          </div>

          <div className="fade-up-d2">
            <AnimatedCodePreview />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-20" data-testid="features-section">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C3AED] mb-3">Why Coderift</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">Built for how teams actually code</h2>
          <p className="mt-4 muted-text max-w-2xl mx-auto">Most editors stop at "shared cursor". We go further — with AI, gamification, and tools that make pairing genuinely fun.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="card card-hover p-7" data-testid={`feature-card-${i}`}>
              <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-[#7C3AED]" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-semibold tracking-tight mb-1.5">{f.title}</h3>
              <p className="text-sm muted-text leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-20" data-testid="testimonials-section">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C3AED] mb-3">Loved by developers</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">From students to staff engineers</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div key={i} className="card p-7" data-testid={`testimonial-${i}`}>
              <p className="text-base text-[#0a0a0a] leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#10B981] text-white flex items-center justify-center text-sm font-semibold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs muted-text">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-20">
        <div className="card p-10 sm:p-16 text-center overflow-hidden relative" style={{background: "linear-gradient(135deg, #FAFAFA 0%, #F5F3FF 100%)"}}>
          <div className="absolute inset-0 dotted-bg opacity-50 pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-2xl mx-auto">Stop screensharing. Start co-creating.</h2>
            <p className="mt-4 muted-text max-w-xl mx-auto">Free during beta. No credit card. Spin up your first room in 10 seconds.</p>
            <div className="mt-7 flex justify-center">
              <Link to="/register" className="btn-primary inline-flex items-center gap-1.5" data-testid="cta-bottom-start">
                Create your first room <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 flex items-center justify-between text-xs muted-text">
          <span>© 2026 Coderift</span>
          <span className="mono">{`{ collaborate: true, ai: true, fun: true }`}</span>
        </div>
      </footer>
    </div>
  );
}
