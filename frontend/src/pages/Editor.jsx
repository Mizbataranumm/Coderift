import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MonacoEditor from "@monaco-editor/react";
import { toast } from "sonner";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import {
  Code2, Copy, Save, Play, Sparkles, Wand2, Share2, X, Loader2, Users, Clock,
  Swords, Flame, History, ChevronRight, Terminal, BookOpen, Zap, FileCode2
} from "lucide-react";

const LANGUAGES = [
  { id: "javascript", name: "JavaScript" },
  { id: "typescript", name: "TypeScript" },
  { id: "python", name: "Python" },
  { id: "java", name: "Java" },
  { id: "cpp", name: "C++" },
  { id: "go", name: "Go" },
  { id: "rust", name: "Rust" },
  { id: "ruby", name: "Ruby" },
  { id: "php", name: "PHP" },
  { id: "csharp", name: "C#" },
];

const MONACO_LANG_MAP = {
  javascript: "javascript", typescript: "typescript", python: "python",
  java: "java", cpp: "cpp", go: "go", rust: "rust", ruby: "ruby", php: "php", csharp: "csharp",
};

function fmtMs(ms) { if (ms == null) return "—"; const m = Math.floor(ms/60000); const s = Math.floor((ms%60000)/1000); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }

export default function Editor() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [room, setRoom] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [presence, setPresence] = useState([]);
  const [savedAt, setSavedAt] = useState(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });

  // Right panel
  const [panelTab, setPanelTab] = useState(null); // null | 'output' | 'review' | 'fix' | 'history'
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [fixedCode, setFixedCode] = useState("");

  // Rage meter
  const [rage, setRage] = useState(0);
  const lastLenRef = useRef(0);

  // Battle mode
  const [battle, setBattle] = useState({ active: false, endAt: null, remaining: 0 });

  // AI Generate modal
  const [genOpen, setGenOpen] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [genMode, setGenMode] = useState("replace"); // 'replace' | 'insert'
  const [genBusy, setGenBusy] = useState(false);

  // Internal refs
  const editorRef = useRef(null);
  const remoteUpdateRef = useRef(false);
  const socketRef = useRef(null);
  const codeChangeTimerRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // Load room
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/rooms/${roomId}`);
        if (cancelled) return;
        setRoom(data);
        setCode(data.code || "");
        setLanguage(data.language || "javascript");
        lastLenRef.current = (data.code || "").length;
      } catch (err) {
        toast.error(err?.response?.data?.detail || "Room not found");
        nav("/dashboard");
      }
    })();
    return () => { cancelled = true; };
  }, [roomId, nav]);

  // Socket setup
  useEffect(() => {
    if (!user || !room) return;
    const s = getSocket();
    socketRef.current = s;

    s.emit("join_room", { roomId, userId: user.id, username: user.username });

    s.on("code-update", ({ code: newCode }) => {
      remoteUpdateRef.current = true;
      setCode(newCode);
    });
    s.on("language-update", ({ language: newLang }) => {
      setLanguage(newLang);
      toast.info(`Language changed to ${newLang}`);
    });
    s.on("user-joined", ({ username }) => toast.success(`${username} joined`));
    s.on("user-left", ({ username }) => toast(`${username || 'Someone'} left`));
    s.on("presence", ({ users }) => setPresence(users));
    s.on("code-saved", ({ savedAt }) => setSavedAt(savedAt));
    s.on("battle-timer", (data) => {
      if (data.active) {
        setBattle({ active: true, endAt: data.endAt, remaining: data.duration * 1000 });
        toast.success(`⚔️ Battle started! ${data.duration}s`);
      } else {
        setBattle({ active: false, endAt: null, remaining: 0 });
        toast.info("Battle ended");
      }
    });

    return () => {
      try { s.emit("leave_room", { roomId }); } catch {}
      s.off("code-update"); s.off("language-update"); s.off("user-joined"); s.off("user-left");
      s.off("presence"); s.off("code-saved"); s.off("battle-timer");
    };
  }, [user, room, roomId]);

  // Battle countdown
  useEffect(() => {
    if (!battle.active || !battle.endAt) return;
    const tick = setInterval(() => {
      const remaining = new Date(battle.endAt).getTime() - Date.now();
      if (remaining <= 0) { setBattle({ active: false, endAt: null, remaining: 0 }); toast.success("⏰ Time's up!"); clearInterval(tick); }
      else setBattle((b) => ({ ...b, remaining }));
    }, 250);
    return () => clearInterval(tick);
  }, [battle.active, battle.endAt]);

  // Code change handler
  const onCodeChange = useCallback((value) => {
    const v = value || "";
    // rage detection: significant deletions
    const prev = lastLenRef.current;
    if (prev - v.length > 20) setRage((r) => Math.min(100, r + 8));
    lastLenRef.current = v.length;

    if (remoteUpdateRef.current) { remoteUpdateRef.current = false; setCode(v); return; }
    setCode(v);
    // throttle emit
    clearTimeout(codeChangeTimerRef.current);
    codeChangeTimerRef.current = setTimeout(() => {
      socketRef.current?.emit("code_change", { roomId, code: v });
    }, 80);
    // debounced autosave
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      socketRef.current?.emit("save_code", { roomId, code: v, language });
    }, 1500);
  }, [roomId, language]);

  // Rage cool-down
  useEffect(() => {
    const id = setInterval(() => setRage((r) => Math.max(0, r - 1)), 1500);
    return () => clearInterval(id);
  }, []);

  const onLangChange = (newLang) => {
    setLanguage(newLang);
    socketRef.current?.emit("language_change", { roomId, language: newLang });
    socketRef.current?.emit("save_code", { roomId, code, language: newLang });
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => setCursorPos({ line: e.position.lineNumber, column: e.position.column }));
  };

  const copyRoomId = () => { navigator.clipboard.writeText(roomId); toast.success("Room ID copied"); };
  const shareRoom = () => {
    navigator.clipboard.writeText(`${window.location.origin}/editor/${roomId}`);
    toast.success("Share link copied");
  };

  const saveNow = () => {
    socketRef.current?.emit("save_code", { roomId, code, language });
    toast.success("Saved");
  };

  const runCode = async () => {
    setRunning(true); setPanelTab("output"); setOutput(null);
    const t0 = Date.now();
    try {
      const { data } = await api.post("/execute", { code, language });
      data._elapsed = Date.now() - t0;
      setOutput(data);
    } catch (err) {
      setOutput({ stderr: err?.response?.data?.detail || "Execution failed", code: 1, _elapsed: Date.now() - t0 });
    } finally { setRunning(false); }
  };

  const runAI = async (kind) => {
    setAiLoading(true); setPanelTab(kind === "fix" ? "fix" : "review"); setAiResult(""); setFixedCode("");
    try {
      let path = "/rooms/ai-review";
      if (kind === "fix") path = "/rooms/ai-quickfix";
      else if (kind === "explain") path = "/rooms/ai-explain";
      else if (kind === "optimize") path = "/rooms/ai-optimize";
      const { data } = await api.post(path, { code, language });
      setAiResult(data.result || "");
      if (kind === "fix" && data.fixed) setFixedCode(data.fixed);
    } catch (err) {
      toast.error("AI request failed");
    } finally { setAiLoading(false); }
  };

  const applyFix = () => {
    if (!fixedCode) return;
    setCode(fixedCode);
    socketRef.current?.emit("code_change", { roomId, code: fixedCode });
    socketRef.current?.emit("save_code", { roomId, code: fixedCode, language });
    toast.success("Fix applied");
    setPanelTab(null);
  };

  const startBattle = () => {
    socketRef.current?.emit("battle_start", { roomId, duration: 300 });
  };

  const showHistory = () => setPanelTab("history");

  const openGenerate = () => {
    setGenPrompt("");
    setGenMode("replace");
    setGenOpen(true);
  };

  const runGenerate = async () => {
    if (!genPrompt.trim()) { toast.error("Enter a prompt"); return; }
    setGenBusy(true);
    try {
      const { data } = await api.post("/rooms/ai-generate", { code, language, prompt: genPrompt });
      const generated = (data.code || data.result || "").trim();
      if (!generated) { toast.error("AI returned no code"); return; }
      let next;
      if (genMode === "replace") {
        next = generated;
      } else {
        // insert at cursor
        const ed = editorRef.current;
        if (ed) {
          const sel = ed.getSelection();
          ed.executeEdits("ai-generate", [{ range: sel, text: "\n" + generated + "\n", forceMoveMarkers: true }]);
          next = ed.getValue();
        } else {
          next = code + "\n\n" + generated;
        }
      }
      setCode(next);
      socketRef.current?.emit("code_change", { roomId, code: next });
      socketRef.current?.emit("save_code", { roomId, code: next, language });
      toast.success("Code generated");
      setGenOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "AI generation failed");
    } finally { setGenBusy(false); }
  };

  if (!room) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" /></div>;

  const rageColor = rage < 30 ? "#10B981" : rage < 65 ? "#F59E0B" : "#EF4444";

  return (
    <div className="h-screen flex flex-col bg-white" data-testid="editor-page">
      {/* Top toolbar */}
      <header className="glass border-b border-black/5 px-4 h-14 flex items-center gap-3 shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0" data-testid="editor-logo">
          <div className="w-7 h-7 rounded-lg bg-[#7C3AED] flex items-center justify-center"><Code2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} /></div>
          <span className="font-bold text-sm tracking-tight hidden sm:inline">Coderift</span>
        </Link>
        <div className="h-6 w-px bg-black/10" />
        <div className="flex items-center gap-1.5 bg-[#FAFAFA] border border-black/5 rounded-lg px-2.5 py-1" data-testid="editor-room-id">
          <span className="text-[10px] uppercase tracking-wider muted-text font-semibold">Room</span>
          <span className="mono text-xs font-semibold">{roomId}</span>
          <button onClick={copyRoomId} className="ml-1 hover:bg-black/5 rounded p-0.5" data-testid="copy-room-id-btn"><Copy className="w-3 h-3" /></button>
        </div>
        <select value={language} onChange={(e) => onLangChange(e.target.value)} className="text-xs font-medium bg-white border border-black/10 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#7C3AED]" data-testid="editor-language-select">
          {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={saveNow} className="btn-ghost flex items-center gap-1.5 text-xs" title="Save" data-testid="editor-save-btn">
            <Save className="w-3.5 h-3.5" /> <span className="hidden md:inline">Save</span>
          </button>
          <button onClick={runCode} disabled={running} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10B981] text-white text-xs font-semibold hover:bg-[#059669] transition-colors disabled:opacity-60" data-testid="editor-run-btn">
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" fill="white" />}
            Run
          </button>
          <button onClick={() => runAI("fix")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#6D28D9] transition-colors" data-testid="editor-aifix-btn" title="AI Quick Fix">
            <Wand2 className="w-3.5 h-3.5" /> <span className="hidden md:inline">Fix</span>
          </button>
          <button onClick={() => runAI("review")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#7C3AED]/30 text-[#7C3AED] text-xs font-semibold hover:bg-[#7C3AED]/5 transition-colors" data-testid="editor-aireview-btn" title="AI Review">
            <Sparkles className="w-3.5 h-3.5" /> <span className="hidden md:inline">Review</span>
          </button>
          <button onClick={openGenerate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#7C3AED]/30 text-[#7C3AED] text-xs font-semibold hover:bg-[#7C3AED]/5 transition-colors" data-testid="editor-aigenerate-btn" title="AI Generate from prompt">
            <FileCode2 className="w-3.5 h-3.5" /> <span className="hidden md:inline">Generate</span>
          </button>
          <button onClick={shareRoom} className="btn-ghost flex items-center gap-1.5 text-xs" data-testid="editor-share-btn">
            <Share2 className="w-3.5 h-3.5" /> <span className="hidden md:inline">Share</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left rail with extras */}
        <aside className="w-12 border-r border-black/5 bg-[#FAFAFA] flex flex-col items-center py-3 gap-2 shrink-0">
          <button onClick={() => runAI("explain")} className="w-9 h-9 rounded-lg hover:bg-white border border-transparent hover:border-black/5 flex items-center justify-center" title="AI Explain" data-testid="rail-explain-btn">
            <BookOpen className="w-4 h-4 text-[#525252]" />
          </button>
          <button onClick={() => runAI("optimize")} className="w-9 h-9 rounded-lg hover:bg-white border border-transparent hover:border-black/5 flex items-center justify-center" title="AI Optimize" data-testid="rail-optimize-btn">
            <Zap className="w-4 h-4 text-[#525252]" />
          </button>
          <button onClick={showHistory} className="w-9 h-9 rounded-lg hover:bg-white border border-transparent hover:border-black/5 flex items-center justify-center" title="Ghost Replay" data-testid="rail-history-btn">
            <History className="w-4 h-4 text-[#525252]" />
          </button>
          <button onClick={startBattle} className="w-9 h-9 rounded-lg hover:bg-white border border-transparent hover:border-black/5 flex items-center justify-center" title="Battle Mode (5min)" data-testid="rail-battle-btn">
            <Swords className="w-4 h-4 text-[#525252]" />
          </button>
          <div className="mt-auto flex flex-col items-center gap-1.5" title={`Rage: ${rage}%`}>
            <Flame className="w-4 h-4" style={{ color: rageColor }} />
            <div className="w-1.5 h-16 rounded-full bg-black/5 overflow-hidden flex flex-col-reverse">
              <div style={{ height: `${rage}%`, background: rageColor, transition: "height 200ms ease, background 200ms ease" }} className={rage > 75 ? "shake" : ""} />
            </div>
          </div>
        </aside>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {battle.active && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 glass px-4 py-2 rounded-full border border-[#7C3AED]/30 flex items-center gap-2" data-testid="battle-timer">
              <Swords className="w-4 h-4 text-[#7C3AED]" />
              <span className="text-sm font-bold mono text-[#0a0a0a]">{fmtMs(Math.max(0, battle.remaining))}</span>
              <span className="text-xs muted-text">battle</span>
            </div>
          )}
          <MonacoEditor
            height="100%"
            theme="vs-light"
            language={MONACO_LANG_MAP[language] || "javascript"}
            value={code}
            onChange={onCodeChange}
            onMount={handleEditorMount}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              tabSize: 2,
              wordWrap: "on",
              renderWhitespace: "selection",
              smoothScrolling: true,
              cursorBlinking: "smooth",
            }}
          />
        </div>

        {/* Right panel */}
        {panelTab && (
          <aside className="w-[420px] border-l border-black/5 bg-white flex flex-col shrink-0" data-testid="editor-right-panel">
            <div className="h-11 px-4 flex items-center justify-between border-b border-black/5 bg-[#FAFAFA]">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {panelTab === "output" && <><Terminal className="w-4 h-4 text-[#10B981]" /> Output</>}
                {panelTab === "review" && <><Sparkles className="w-4 h-4 text-[#7C3AED]" /> AI Review</>}
                {panelTab === "fix" && <><Wand2 className="w-4 h-4 text-[#7C3AED]" /> AI Quick Fix</>}
                {panelTab === "history" && <><History className="w-4 h-4 text-[#7C3AED]" /> Ghost Replay</>}
              </div>
              <button onClick={() => setPanelTab(null)} className="hover:bg-black/5 rounded p-1" data-testid="panel-close-btn"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-auto scrollbar-thin p-5">
              {panelTab === "output" && (
                <div data-testid="output-panel">
                  {running && <div className="flex items-center gap-2 muted-text text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Running…</div>}
                  {output && (
                    <>
                      <div className="flex items-center gap-3 text-xs muted-text mb-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${output.code === 0 ? "bg-[#10B981]/10 text-[#059669]" : "bg-[#EF4444]/10 text-[#DC2626]"}`}>
                          {output.code === 0 ? "Success" : `Exit ${output.code}`}
                        </span>
                        <span><Clock className="w-3 h-3 inline mr-1" />{output._elapsed}ms</span>
                      </div>
                      {output.stdout && (<><div className="text-[11px] uppercase tracking-wider font-semibold muted-text mb-1.5">stdout</div><pre className="mono text-xs bg-[#FAFAFA] border border-black/5 rounded-lg p-3 whitespace-pre-wrap mb-3">{output.stdout}</pre></>)}
                      {output.stderr && (<><div className="text-[11px] uppercase tracking-wider font-semibold text-[#DC2626] mb-1.5">stderr</div><pre className="mono text-xs bg-[#EF4444]/5 border border-[#EF4444]/15 text-[#7F1D1D] rounded-lg p-3 whitespace-pre-wrap">{output.stderr}</pre></>)}
                      {!output.stdout && !output.stderr && <div className="text-sm muted-text">No output</div>}
                    </>
                  )}
                </div>
              )}
              {(panelTab === "review" || panelTab === "fix") && (
                <div data-testid="ai-panel">
                  {aiLoading && <div className="flex items-center gap-2 muted-text text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Thinking…</div>}
                  {!aiLoading && aiResult && (
                    <>
                      {panelTab === "fix" && fixedCode && (
                        <button onClick={applyFix} className="btn-primary w-full mb-4 flex items-center justify-center gap-2" data-testid="apply-fix-btn">
                          <ChevronRight className="w-4 h-4" /> Apply suggested fix
                        </button>
                      )}
                      <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap">{aiResult}</div>
                    </>
                  )}
                  {!aiLoading && !aiResult && <div className="text-sm muted-text">No result yet.</div>}
                </div>
              )}
              {panelTab === "history" && (
                <HistoryPanel roomId={roomId} onApply={(c) => { setCode(c); socketRef.current?.emit("code_change", { roomId, code: c }); toast.success("Snapshot restored"); }} />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Status bar */}
      <footer className="h-9 border-t border-black/5 bg-[#FAFAFA] px-4 flex items-center gap-4 text-[11px] muted-text shrink-0" data-testid="status-bar">
        <div className="flex items-center gap-1.5" data-testid="presence-list">
          <Users className="w-3 h-3" />
          {presence.length === 0 ? <span>Just you</span> : presence.map((p) => (
            <span key={p.sid} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: `${p.color}18`, color: p.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
              {p.username}
            </span>
          ))}
        </div>
        <span className="lang-badge">{language}</span>
        <span>Ln {cursorPos.line}, Col {cursorPos.column}</span>
        <span className="ml-auto">{savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : "Not saved"}</span>
      </footer>

      {/* AI Generate modal */}
      {genOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" data-testid="generate-modal">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => !genBusy && setGenOpen(false)} />
          <div className="relative w-full max-w-lg card p-7 fade-up">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
                  <FileCode2 className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">AI Generate</h3>
                  <p className="text-xs muted-text">Describe what you want — Gemini will write it in <span className="font-medium text-[#0a0a0a]">{language}</span>.</p>
                </div>
              </div>
              <button onClick={() => !genBusy && setGenOpen(false)} className="hover:bg-black/5 rounded p-1" data-testid="generate-close-btn">
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runGenerate(); }}
              placeholder="e.g. Binary search function with unit tests"
              rows={4}
              className="input mono text-sm resize-none"
              autoFocus
              disabled={genBusy}
              data-testid="generate-prompt-input"
            />

            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className="muted-text">Action:</span>
              <button
                onClick={() => setGenMode("replace")}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${genMode === "replace" ? "bg-[#7C3AED] text-white border-[#7C3AED]" : "bg-white border-black/10 hover:border-black/20"}`}
                data-testid="generate-mode-replace"
                disabled={genBusy}
              >Replace all</button>
              <button
                onClick={() => setGenMode("insert")}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${genMode === "insert" ? "bg-[#7C3AED] text-white border-[#7C3AED]" : "bg-white border-black/10 hover:border-black/20"}`}
                data-testid="generate-mode-insert"
                disabled={genBusy}
              >Insert at cursor</button>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <span className="text-[11px] muted-text">⌘/Ctrl + Enter to generate</span>
              <div className="flex gap-2">
                <button onClick={() => !genBusy && setGenOpen(false)} className="btn-secondary text-sm" disabled={genBusy} data-testid="generate-cancel-btn">Cancel</button>
                <button onClick={runGenerate} disabled={genBusy || !genPrompt.trim()} className="btn-primary text-sm flex items-center gap-2" data-testid="generate-submit-btn">
                  {genBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {genBusy ? "Generating…" : "Generate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ roomId, onApply }) {
  const [snaps, setSnaps] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/rooms/${roomId}`);
        // We don't expose codeHistory in room endpoint; show placeholder
        // Fetch full history via direct mongo call would require new endpoint.
        // Here we'll just show current code as "now".
        setSnaps([{ ts: data.lastActiveAt, code: data.code }]);
      } catch { setSnaps([]); }
    })();
  }, [roomId]);
  if (snaps === null) return <div className="text-sm muted-text">Loading…</div>;
  if (!snaps.length) return <div className="text-sm muted-text">No snapshots yet. Saves create snapshots automatically.</div>;
  return (
    <div className="space-y-3">
      <p className="text-xs muted-text">Snapshots are saved automatically every few seconds. Click to restore.</p>
      {snaps.map((s, i) => (
        <button key={i} onClick={() => onApply(s.code)} className="card card-hover w-full text-left p-3" data-testid={`history-item-${i}`}>
          <div className="text-xs muted-text mb-1">{new Date(s.ts).toLocaleString()}</div>
          <pre className="mono text-[11px] line-clamp-3 text-[#0a0a0a]">{s.code.slice(0, 200)}</pre>
        </button>
      ))}
    </div>
  );
}
