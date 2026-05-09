# Coderift — PRD

## Problem Statement
Build a full-stack real-time collaborative code editor "Coderift" with real-time multi-user editing, code execution, AI features (review/fix/explain/optimize/generate), and unique modes (Ghost Replay, Battle Mode, Rage Meter, etc.).

## Architecture
- Backend: FastAPI + python-socketio (ASGI) at port 8001
- Frontend: React 19 + Monaco Editor + Tailwind + socket.io-client at port 3000
- DB: MongoDB (motor)
- AI: Gemini 2.5-flash via `emergentintegrations` (EMERGENT_LLM_KEY)
- Code execution: **Judge0 CE public** (`https://ce.judge0.com`, free, no auth) for all 10 languages — Python, JS, TS, Java, C++, Go, Rust, Ruby, PHP, C#. Local subprocess fallback (Python/JS/C++) if Judge0 unreachable. Optional `JUDGE0_RAPIDAPI_KEY` env var switches to RapidAPI endpoint.
- Auth: JWT (HS256, 7-day expiry), bcrypt password hashing

## Implemented (May 2026)
- ✅ Auth: register, login, /me with JWT
- ✅ Rooms: create, get, list-mine; 8-char unique room IDs; auto-add joiners as participants
- ✅ Real-time Socket.IO: code-change, language-change, cursor-move, presence, save, battle-timer
- ✅ Code execution: All 10 languages (Python, JS, TS, Java, C++, Go, Rust, Ruby, PHP, C#) via public Judge0 CE; local subprocess fallback for python/js/cpp
- ✅ AI endpoints: review, quickfix, explain, generate, optimize (Gemini)
- ✅ Frontend pages: Landing, Login, Register, Dashboard, Editor
- ✅ Editor: Monaco vs-light, language switcher, run, AI fix/review buttons, output/AI/history right panel, status bar with presence + cursor pos
- ✅ Extras: Rage Meter (live), Battle Mode (5-min timer), Ghost Replay (last snapshot)

## Backlog (P1)
- Live remote cursor decorations in Monaco (currently presence list only; cursor positions sent over socket but not rendered as decorations in editor)
- Full Ghost Replay timeline (snapshots are saved server-side — needs API endpoint to fetch full history)
- AI Generate UI (currently only available via API; needs prompt input)

## Backlog (P2)
- Voice notes, Code Time Capsule, Heatmap, Code DNA, Smart room name suggestions
- Add more local language runtimes (Go, Rust, Java) via judge0 or self-hosted Piston
- Public room directory / discovery

## Personas
- Senior engineers pairing remotely
- CS students racing on algorithms
- Tech leads reviewing junior PRs interactively
