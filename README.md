# Coderift

> A real-time collaborative code editor with AI superpowers, built for the AI era.

Coderift is a full-stack collaborative coding platform where multiple developers can edit the same code in real time, run it in 10+ languages, and use Gemini-powered AI to review, fix, explain, optimize and generate code — all in one tab.

## ✨ Features

- **Real-time collaboration** — Live multi-user editing via Socket.IO with presence indicators
- **10 language code execution** — Python, JavaScript, TypeScript, Java, C++, Go, Rust, Ruby, PHP, C# (powered by Judge0 CE)
- **AI-powered tools** (Google Gemini)
  - AI Review — bugs, performance, best practices, security
  - AI Quick Fix — one-click apply of detected fixes
  - AI Explain — plain-English explanations of selected code
  - AI Optimize — performance suggestions
  - AI Generate — write code from a natural-language prompt
- **Battle Mode** — race a friend on a 5-minute countdown to solve the same problem
- **Rage Meter** — visual indicator of how much you delete and rewrite
- **Ghost Replay** — automatic code snapshots for time-travel debugging
- **Beautiful UI** — light Linear/Vercel-inspired theme, glassmorphism, Inter font, violet accents
- **JWT auth** — secure, password-hashed accounts
- **8-character shareable room IDs** — instantly invite anyone

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS, Monaco Editor, Socket.IO Client, React Router DOM, Axios, Framer Motion, shadcn/ui, lucide-react |
| Backend | FastAPI, python-socketio (ASGI), Motor (async MongoDB), bcrypt, PyJWT, httpx |
| Database | MongoDB |
| AI | Google Gemini 2.5 Flash |
| Code Execution | Judge0 CE (free, no API key) with local subprocess fallback for Python/JS/C++ |
| Auth | JWT (HS256, 7-day expiry) + bcrypt password hashing |

## 📁 Project Structure
coderift/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   ├── tests/
│   │   └── backend_test.py
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Editor.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── ui/
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── lib/
│   │       ├── api.js
│   │       └── socket.js
│   ├── package.json
│   └── .env
└── README.md

## 🚀 Getting Started (Windows)

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18.x or later | https://nodejs.org/ |
| Python | 3.10 or later | https://www.python.org/downloads/windows/ |
| MongoDB Community | 6.x or later | https://www.mongodb.com/try/download/community |
| Yarn | latest | `npm install -g yarn` |
| Git | latest | https://git-scm.com/download/win |

> **MongoDB tip:** During installation, check "Install MongoDB as a Service". Verify with `Get-Service MongoDB` in PowerShell.

### 1. Clone the repo

```powershell
git clone https://github.com/Mizbataranumm/coderift.git
cd coderift
```

### 2. Backend setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
notepad .env
```

Paste into `backend/.env`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=coderift
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=change-me-to-a-long-random-string
EMERGENT_LLM_KEY=your-emergent-llm-key-here
```

Start the backend:

```powershell
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Frontend setup

```powershell
cd frontend
yarn install
notepad .env
```

Paste into `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=0
```

Start the frontend:

```powershell
yarn start
```

Open `http://localhost:3000` in your browser 🎉

## ✅ Build Status — What's Actually Working

### Backend (FastAPI + python-socketio)
- ✅ 14 of 15 pytest cases passing
- ✅ JWT auth with bcrypt — register, login, `/auth/me`
- ✅ Rooms — create, get, list, 404 on missing
- ✅ Code execution via Judge0 CE — all 10 languages verified
- ✅ AI endpoints — review, quickfix, explain, generate, optimize
- ✅ Socket.IO handshake verified

### Frontend (React + Monaco + Socket.IO)
- ✅ 11 of 11 Playwright flows passing
- ✅ Landing → Register → Dashboard → Editor → Run → AI Review → Logout → Login
- ✅ Protected routes redirect to `/login` when unauthenticated
- ✅ Monaco editor with `vs-light` theme, language switching via Socket.IO
- ✅ Battle Mode timer with Socket.IO events
- ✅ Rage Meter responds to large deletions

### Partial Features
- 🟡 Ghost Replay — snapshots saved server-side, full timeline UI coming soon
- 🟡 Remote cursors — shown in status bar, Monaco flags coming soon

### Not Yet Built
- ❌ Voice Notes, Code Time Capsule, Live Syntax Heatmap, Code DNA

## 📊 Test Results
Backend (pytest)               14 passed, 1 known test bug    ~30s
Frontend (Playwright)          11 passed, 0 failed            ~120s
Languages verified via Judge0 CE:
✓ Python        ~150ms
✓ JavaScript    ~200ms
✓ TypeScript    ~400ms
✓ Java          ~1300ms
✓ C++           ~600ms
✓ Go            ~250ms
✓ Rust          ~700ms
✓ Ruby          ~200ms
✓ PHP           ~150ms
✓ C#            ~800ms

## 🧠 Architecture Decisions

| Decision | Why |
|---|---|
| FastAPI instead of Node.js | Dev environment pre-configured; wire-compatible Socket.IO |
| Judge0 CE instead of Piston | Piston went whitelist-only Feb 2026 |
| Local subprocess fallback | Python/JS/C++ run locally if Judge0 is rate-limited |
| Gemini 2.5 Flash | Gemini 2.0 deprecated May 2026 |
| JWT in localStorage | Simpler for v1; httpOnly cookies on roadmap |
| Snapshots capped at 100 | Prevents unbounded MongoDB document growth |
| 8-char uppercase room IDs | ~2.8 trillion combos, easy to share |

## 🧭 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Authenticate |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/rooms/create` | Create room |
| GET | `/api/rooms/{roomId}` | Get room |
| GET | `/api/rooms/user/myrooms` | List my rooms |
| POST | `/api/execute` | Run code |
| POST | `/api/rooms/ai-review` | AI code review |
| POST | `/api/rooms/ai-quickfix` | AI quick fix |
| POST | `/api/rooms/ai-explain` | AI explanation |
| POST | `/api/rooms/ai-optimize` | AI optimization |
| POST | `/api/rooms/ai-generate` | AI code generation |

## Socket.IO Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `join_room` | client → server | `{roomId, userId, username}` |
| `code_change` | client → server | `{roomId, code}` |
| `code-update` | server → client | `{code, sid}` |
| `save_code` | client → server | `{roomId, code, language}` |
| `language_change` | client → server | `{roomId, language}` |
| `cursor_move` | client → server | `{roomId, position, username}` |
| `battle_start` | client → server | `{roomId, duration}` |
| `battle-timer` | server → client | `{active, endAt, duration}` |

## 🚀 Deployment

### Backend on Render
1. Push repo to GitHub
2. New Web Service → root dir = `backend`
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add all `.env` variables in Render dashboard

### Frontend on Vercel
1. Import repo → root dir = `frontend`
2. Build: `yarn build` → Output: `build`
3. Set `REACT_APP_BACKEND_URL` to your Render URL
4. Add Vercel URL to backend `CORS_ORIGINS`

## 🧯 Troubleshooting

**Backend won't start**
Activate virtualenv first: `.\venv\Scripts\Activate.ps1`

**Frontend shows Network Error**
Check `REACT_APP_BACKEND_URL` matches backend and CORS is configured.

**MongoDB connection refused**
Run `Start-Service MongoDB` in PowerShell.

**Code execution slow/failing**
Judge0 public instance may be rate-limited. Wait 30s or add `JUDGE0_RAPIDAPI_KEY`.

**Yarn errors**
Delete `node_modules` and `yarn.lock`, run `yarn install` again. Never mix npm and yarn.

## 🗺 Roadmap

- [ ] Live cursor flags inside Monaco editor
- [ ] Full Ghost Replay timeline UI
- [ ] Voice Notes on code lines
- [ ] Code Time Capsule
- [ ] Live Syntax Heatmap
- [ ] Code DNA fingerprint
- [ ] Self-hosted Judge0

## 🔒 Security Notes

- API keys are server-side only
- Passwords bcrypt-hashed
- CORS configured per environment
- All AI requests go through backend

## 📜 License

MIT

## 💜 Credits

- [Socket.IO](https://socket.io/) — Real-time engine
- [Judge0 CE](https://judge0.com/) — Code execution
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — VS Code's editor
- [Google Gemini](https://ai.google.dev/) — AI features
- [shadcn/ui](https://ui.shadcn.com/) — UI components

---

Built with caffeine, ⌨️ and 💜. Happy coding!
