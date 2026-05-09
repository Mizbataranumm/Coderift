import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Plus, LogIn, Layers, Activity, Loader2, Code2, Clock, Users } from "lucide-react";

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

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", language: "javascript" });
  const [joinId, setJoinId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/rooms/user/myrooms");
      setRooms(data);
    } catch { toast.error("Failed to load rooms"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name) { toast.error("Room name required"); return; }
    setCreating(true);
    try {
      const { data } = await api.post("/rooms/create", createForm);
      toast.success("Room created!");
      nav(`/editor/${data.roomId}`);
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed to create"); }
    finally { setCreating(false); }
  };

  const onJoin = (e) => {
    e.preventDefault();
    const id = joinId.trim().toUpperCase();
    if (id.length !== 8) { toast.error("Room ID must be 8 characters"); return; }
    nav(`/editor/${id}`);
  };

  const totalSessions = user?.stats?.totalSessions ?? 0;
  const totalRooms = user?.stats?.totalRooms ?? rooms.length;

  return (
    <div className="min-h-screen bg-white" data-testid="dashboard-page">
      <Navbar />
      <main className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-10">
        {/* Greeting */}
        <div className="fade-up flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Welcome back, {user?.username} 👋</h1>
            <p className="muted-text mt-1.5">Here are your rooms and recent activity.</p>
          </div>
          <div className="flex gap-3">
            <div className="card px-5 py-3 flex items-center gap-3" data-testid="stat-rooms">
              <div className="w-9 h-9 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center"><Layers className="w-4 h-4 text-[#7C3AED]" /></div>
              <div><div className="text-[11px] uppercase tracking-wider muted-text font-medium">Rooms</div><div className="text-xl font-bold">{totalRooms}</div></div>
            </div>
            <div className="card px-5 py-3 flex items-center gap-3" data-testid="stat-sessions">
              <div className="w-9 h-9 rounded-lg bg-[#10B981]/10 flex items-center justify-center"><Activity className="w-4 h-4 text-[#10B981]" /></div>
              <div><div className="text-[11px] uppercase tracking-wider muted-text font-medium">Sessions</div><div className="text-xl font-bold">{totalSessions}</div></div>
            </div>
          </div>
        </div>

        {/* Create / Join */}
        <div className="grid md:grid-cols-2 gap-5 mb-12">
          <form onSubmit={onCreate} className="card p-7 fade-up-d1" data-testid="create-room-form">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center"><Plus className="w-4 h-4 text-white" strokeWidth={2.5} /></div>
              <h2 className="text-lg font-semibold tracking-tight">Create a room</h2>
            </div>
            <div className="space-y-3">
              <input className="input" placeholder="Room name (e.g. Algo Sprint)" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} data-testid="create-room-name-input" />
              <select className="input" value={createForm.language} onChange={(e) => setCreateForm({ ...createForm, language: e.target.value })} data-testid="create-room-language-select">
                {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <button type="submit" disabled={creating} className="btn-primary w-full flex items-center justify-center gap-2" data-testid="create-room-submit-btn">
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                {creating ? "Creating…" : "Create room"}
              </button>
            </div>
          </form>

          <form onSubmit={onJoin} className="card p-7 fade-up-d2" data-testid="join-room-form">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#0a0a0a] flex items-center justify-center"><LogIn className="w-4 h-4 text-white" strokeWidth={2.5} /></div>
              <h2 className="text-lg font-semibold tracking-tight">Join a room</h2>
            </div>
            <div className="space-y-3">
              <input className="input mono uppercase tracking-[0.3em] text-center" maxLength={8} placeholder="ABCD1234" value={joinId} onChange={(e) => setJoinId(e.target.value.toUpperCase())} data-testid="join-room-id-input" />
              <p className="text-xs muted-text">Enter the 8-character room ID shared with you.</p>
              <button type="submit" className="btn-secondary w-full" data-testid="join-room-submit-btn">Join room</button>
            </div>
          </form>
        </div>

        {/* My rooms */}
        <section data-testid="my-rooms-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight">My rooms</h2>
            <span className="text-xs muted-text">{rooms.length} total</span>
          </div>
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" /></div>
          ) : rooms.length === 0 ? (
            <div className="card p-12 text-center" data-testid="no-rooms-empty">
              <div className="w-12 h-12 rounded-xl bg-[#7C3AED]/10 mx-auto mb-3 flex items-center justify-center">
                <Code2 className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <p className="text-sm font-medium">No rooms yet</p>
              <p className="text-xs muted-text mt-1">Create your first room above to start coding collaboratively.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((r, i) => (
                <button key={r.roomId} onClick={() => nav(`/editor/${r.roomId}`)} className="card card-hover p-6 text-left" data-testid={`room-card-${r.roomId}`} style={{animationDelay: `${i*40}ms`}}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold tracking-tight truncate">{r.name}</h3>
                      <span className="mono text-[11px] muted-text">{r.roomId}</span>
                    </div>
                    <span className="lang-badge">{r.language}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs muted-text">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(r.lastActiveAt)}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.participantsCount}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
