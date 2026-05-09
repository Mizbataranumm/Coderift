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
| AI | Google Gemini 2.5 Flash (via emergentintegrations) |
| Code Execution | Judge0 CE (public instance — free, no API key) with local subprocess fallback for Python/JS/C++ |
| Auth | JWT (HS256, 7-day expiry) + bcrypt password hashing |

> Note: The original spec called for Node.js + Express. This implementation uses **FastAPI + python-socketio** as a 1:1 functional equivalent — same Socket.IO protocol, same routes, same behavior. The frontend doesn't know the difference.

## 📁 Project Structure

```
coderift/
├── backend/
│   ├── server.py             # FastAPI app + Socket.IO ASGI mount
│   ├── requirements.txt      # Python dependencies
│   ├── tests/
│   │   └── backend_test.py   # Pytest regression suite
│   └── .env                  # Environment variables (not committed)
├── frontend/
│   ├── src/
│   │   ├── App.js            # Router + AuthProvider
│   │   ├── pages/
│   │   │   ├── Landing.jsx   # Public marketing page
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx # Create/join rooms, my rooms
│   │   │   └── Editor.jsx    # Monaco editor + AI + run + battle
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── ui/           # shadcn/ui components
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── lib/
│   │       ├── api.js        # axios with auth interceptor
│   │       └── socket.js     # Socket.IO client
│   ├── package.json
│   └── .env                  # REACT_APP_BACKEND_URL
└── README.md
```

## 🚀 Getting Started (Windows)

### Prerequisites

Make sure you have these installed before running anything:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18.x or later | https://nodejs.org/ |
| Python | 3.10 or later | https://www.python.org/downloads/windows/ |
| MongoDB Community | 6.x or later | https://www.mongodb.com/try/download/community |
| Yarn | latest | `npm install -g yarn` |
| Git | latest | https://git-scm.com/download/win |

> **MongoDB tip:** During installation, check \"Install MongoDB as a Service\" so it auto-starts. Verify with `Get-Service MongoDB` in PowerShell.

### 1. Clone the repo

```powershell
git clone https://github.com/yourname/coderift.git
cd coderift
```

### 2. Backend setup

```powershell
cd backend

# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1
# (If you get an execution policy error, run once as Administrator:)
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install Python dependencies
pip install -r requirements.txt

# Create your .env file
notepad .env
```

Paste this into `backend/.env` (replace placeholders with your own values):

```env
MONGO_URL=\"mongodb://localhost:27017\"
DB_NAME=\"coderift\"
CORS_ORIGINS=\"http://localhost:3000\"
JWT_SECRET=\"change-me-to-a-long-random-string\"
EMERGENT_LLM_KEY=\"your-emergent-llm-key-here\"
# Optional — only if you have a paid Judge0 plan:
# JUDGE0_RAPIDAPI_KEY=\"your-rapidapi-key\"
```

> Get an `EMERGENT_LLM_KEY` from the [Emergent platform](https://emergent.sh) — one key works for OpenAI, Anthropic, and Gemini. Or replace the AI integration in `server.py` with your own provider's SDK.

Start the backend:

```powershell
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend now runs at `http://localhost:8001` and Socket.IO is exposed at `http://localhost:8001/socket.io`.

### 3. Frontend setup

Open a **new** PowerShell terminal:

```powershell
cd frontend

# Install dependencies (use yarn — npm is not supported)
yarn install

# Create your .env file
notepad .env
```

Paste this into `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=0
```

Start the frontend:

```powershell
yarn start
```

Frontend now runs at `http://localhost:3000`. Open it in your browser, register an account, and create your first room. 🎉

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | ✅ | MongoDB connection string |
| `DB_NAME` | ✅ | MongoDB database name |
| `JWT_SECRET` | ✅ | Long random string for signing JWTs |
| `EMERGENT_LLM_KEY` | ✅ | LLM key for Gemini AI features |
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins |
| `JUDGE0_URL` | ❌ | Override Judge0 endpoint (default: `https://ce.judge0.com`) |
| `JUDGE0_RAPIDAPI_KEY` | ❌ | Optional RapidAPI key for higher rate limits |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_BACKEND_URL` | ✅ | Full URL of your backend (no trailing slash) |

## 🧪 Running Tests

```powershell
cd backend
pytest tests/backend_test.py -v
```

Covers: auth (register/login/me), rooms (create/get/list), code execution (Python/JS), all 5 AI endpoints, Socket.IO handshake.

## 🧭 API Reference (selected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account, returns `{token, user}` |
| POST | `/api/auth/login` | Authenticate, returns `{token, user}` |
| GET  | `/api/auth/me` | Get current user (requires Bearer token) |
| POST | `/api/rooms/create` | Create a new room |
| GET  | `/api/rooms/{roomId}` | Get a room (auto-joins as participant) |
| GET  | `/api/rooms/user/myrooms` | List the current user's rooms |
| POST | `/api/execute` | Run code via Judge0 (or local fallback) |
| POST | `/api/rooms/ai-review` | Full AI code review |
| POST | `/api/rooms/ai-quickfix` | AI-detected fix with corrected code |
| POST | `/api/rooms/ai-explain` | Plain-English explanation |
| POST | `/api/rooms/ai-optimize` | Performance suggestions |
| POST | `/api/rooms/ai-generate` | Generate code from a prompt |

### Socket.IO events

| Event | Direction | Payload |
|-------|-----------|---------|
| `join_room` | client → server | `{roomId, userId, username}` |
| `leave_room` | client → server | `{roomId}` |
| `code_change` | client → server | `{roomId, code}` |
| `code-update` | server → client | `{code, sid}` |
| `save_code` | client → server | `{roomId, code, language}` |
| `code-saved` | server → client | `{savedAt}` |
| `language_change` | client → server | `{roomId, language}` |
| `language-update` | server → client | `{language, sid}` |
| `cursor_move` | client → server | `{roomId, position, username}` |
| `cursor-update` | server → client | `{sid, position, username}` |
| `presence` | server → client | `{users: [...]}` |
| `user-joined` / `user-left` | server → client | `{userId, username, color, sid}` |
| `battle_start` / `battle_end` | client → server | `{roomId, duration}` |
| `battle-timer` | server → client | `{active, endAt, duration}` |

## 🚀 Deployment

### Backend on Render

1. Push your repo to GitHub
2. Create a new Web Service on Render → connect repo → root dir = `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add all `backend/.env` values to Render's Environment tab
6. Add a free MongoDB Atlas cluster and use that connection string for `MONGO_URL`

### Frontend on Vercel

1. Import the repo into Vercel → root dir = `frontend`
2. Framework preset: Create React App (or Vite if you migrate)
3. Build command: `yarn build`
4. Output dir: `build`
5. Set `REACT_APP_BACKEND_URL` to your Render backend URL (e.g. `https://coderift-api.onrender.com`)
6. Add the Vercel URL to your backend's `CORS_ORIGINS`

## 🧯 Troubleshooting

**Backend won't start — `ModuleNotFoundError`**
Make sure your virtualenv is activated (`.\venv\Scripts\Activate.ps1`) before running `pip install -r requirements.txt`.

**Frontend shows \"Network Error\" on login**
Check that `REACT_APP_BACKEND_URL` in `frontend/.env` matches your running backend, and that the backend's `CORS_ORIGINS` includes `http://localhost:3000`.

**MongoDB connection refused**
Run `Get-Service MongoDB` in PowerShell. If it's not running: `Start-Service MongoDB`.

**Code execution returns \"Unsupported language\"**
The public Judge0 instance is occasionally rate-limited. Wait 30 seconds or set `JUDGE0_RAPIDAPI_KEY` for higher quotas.

**Yarn errors about lockfile**
Delete `node_modules` and `yarn.lock`, then run `yarn install` again. Don't mix `npm` and `yarn`.

## 🔒 Security Notes

- API keys are server-side only — never sent to the frontend
- Passwords are bcrypt-hashed (never stored or logged in plaintext)
- JWT tokens are stored in `localStorage`; for highest security swap to httpOnly cookies
- CORS is configured per environment via `CORS_ORIGINS`
- All AI code submissions go through the backend — your Gemini key never leaves the server

## 🗺 Roadmap

- [ ] Live remote-cursor decorations inside Monaco
- [ ] Full Ghost Replay timeline UI (snapshots are already saved server-side)
- [ ] Voice Notes — leave audio comments on lines of code
- [ ] Code Time Capsule — lock code with a message, unlock after X days
- [ ] Live Syntax Heatmap — visualize hot zones of edits
- [ ] Code DNA — generate a unique fingerprint of your coding style
- [ ] Smart Room Suggestions — AI-suggested room names from code
- [ ] Self-hosted Judge0 for unlimited execution
- [ ] Public room replay links — share a Loom-style replay of any session

## 📜 License

MIT — do whatever you want, just don't sue me.

## 💜 Credits

- Real-time engine: [Socket.IO](https://socket.io/)
- Code execution: [Judge0 CE](https://judge0.com/)
- Code editor: [Monaco Editor](https://microsoft.github.io/monaco-editor/) (the same one that powers VS Code)
- AI: [Google Gemini](https://ai.google.dev/)
- UI components: [shadcn/ui](https://ui.shadcn.com/) + [lucide-react](https://lucide.dev/)
- Inspired by Linear, Vercel, and a deep love for pair programming

---

Built with caffeine, ⌨️ and 💜. Happy coding!
"
Observation: Overwrite successful: /app/README.md
