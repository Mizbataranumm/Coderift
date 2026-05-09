"""Coderift backend: FastAPI + Socket.IO (ASGI)."""
import os
import logging
import asyncio
import secrets
import string
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import bcrypt
import jwt as pyjwt
import httpx
import socketio

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Configuration ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
JWT_ALGO = "HS256"
JWT_EXPIRES_HOURS = 24 * 7
PISTON_URL = "https://emkc.org/api/v2/piston"
SKIP_PISTON = os.environ.get("SKIP_PISTON", "1") == "1"  # Default skip — public API is whitelist-only since Feb 2026

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("coderift")

# ---------- DB ----------
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# ---------- FastAPI ----------
fastapi_app = FastAPI(title="Coderift API")
api = APIRouter(prefix="/api")

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Models ----------
class UserPublic(BaseModel):
    id: str
    username: str
    email: str
    avatar: str
    createdAt: str
    stats: Dict[str, int] = Field(default_factory=lambda: {"totalRooms": 0, "totalSessions": 0, "totalLinesWritten": 0})


class RegisterIn(BaseModel):
    username: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    token: str
    user: UserPublic


class CreateRoomIn(BaseModel):
    name: str
    language: str = "javascript"


class RoomPublic(BaseModel):
    roomId: str
    name: str
    createdBy: str
    createdByUsername: str
    language: str
    code: str
    isActive: bool
    createdAt: str
    lastActiveAt: str
    participantsCount: int = 0


class AICodeIn(BaseModel):
    code: str
    language: str
    selection: Optional[str] = None
    prompt: Optional[str] = None


class ExecuteIn(BaseModel):
    code: str
    language: str
    stdin: Optional[str] = ""


# ---------- Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), h.encode())
    except Exception:
        return False


def make_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRES_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> Optional[str]:
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return payload.get("sub")
    except Exception:
        return None


async def current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    uid = decode_token(token)
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": uid}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def to_public_user(u: Dict[str, Any]) -> UserPublic:
    return UserPublic(
        id=u["id"],
        username=u["username"],
        email=u["email"],
        avatar=u.get("avatar", ""),
        createdAt=u.get("createdAt", ""),
        stats=u.get("stats", {"totalRooms": 0, "totalSessions": 0, "totalLinesWritten": 0}),
    )


def gen_room_id() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(8))


def avatar_for(name: str) -> str:
    return f"https://api.dicebear.com/7.x/initials/svg?seed={name}&backgroundType=gradientLinear"


# ---------- Auth Routes ----------
@api.post("/auth/register", response_model=AuthOut)
async def register(payload: RegisterIn):
    existing = await db.users.find_one({"$or": [{"email": payload.email.lower()}, {"username": payload.username}]})
    if existing:
        raise HTTPException(status_code=400, detail="Email or username already exists")
    import uuid
    uid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "id": uid,
        "username": payload.username,
        "email": payload.email.lower(),
        "password": hash_password(payload.password),
        "avatar": avatar_for(payload.username),
        "createdAt": now,
        "stats": {"totalRooms": 0, "totalSessions": 0, "totalLinesWritten": 0},
    }
    await db.users.insert_one(user_doc)
    return AuthOut(token=make_token(uid), user=to_public_user(user_doc))


@api.post("/auth/login", response_model=AuthOut)
async def login(payload: LoginIn):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return AuthOut(token=make_token(user["id"]), user=to_public_user(user))


@api.get("/auth/me", response_model=UserPublic)
async def me(user: Dict[str, Any] = Depends(current_user)):
    return to_public_user(user)


# ---------- Room Routes ----------
DEFAULT_TEMPLATES = {
    "javascript": "// Welcome to Coderift!\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet('Coder'));\n",
    "python": "# Welcome to Coderift!\ndef greet(name):\n    return f'Hello, {name}!'\n\nprint(greet('Coder'))\n",
    "java": "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello, Coder!\");\n  }\n}\n",
    "cpp": "#include <iostream>\nusing namespace std;\nint main(){\n  cout << \"Hello, Coder!\" << endl;\n  return 0;\n}\n",
    "typescript": "const greet = (name: string): string => `Hello, ${name}!`;\nconsole.log(greet('Coder'));\n",
    "go": "package main\nimport \"fmt\"\nfunc main(){ fmt.Println(\"Hello, Coder!\") }\n",
    "rust": "fn main(){ println!(\"Hello, Coder!\"); }\n",
    "ruby": "puts 'Hello, Coder!'\n",
    "php": "<?php echo 'Hello, Coder!';\n",
    "csharp": "using System;\nclass Program { static void Main(){ Console.WriteLine(\"Hello, Coder!\"); } }\n",
}


@api.post("/rooms/create", response_model=RoomPublic)
async def create_room(payload: CreateRoomIn, user: Dict[str, Any] = Depends(current_user)):
    rid = gen_room_id()
    while await db.rooms.find_one({"roomId": rid}):
        rid = gen_room_id()
    now = datetime.now(timezone.utc).isoformat()
    code = DEFAULT_TEMPLATES.get(payload.language, "// Start coding...\n")
    doc = {
        "roomId": rid,
        "name": payload.name,
        "createdBy": user["id"],
        "createdByUsername": user["username"],
        "participants": [user["id"]],
        "language": payload.language,
        "code": code,
        "isActive": True,
        "codeHistory": [],
        "createdAt": now,
        "lastActiveAt": now,
    }
    await db.rooms.insert_one(doc)
    await db.users.update_one({"id": user["id"]}, {"$inc": {"stats.totalRooms": 1}})
    return RoomPublic(
        roomId=doc["roomId"], name=doc["name"], createdBy=doc["createdBy"],
        createdByUsername=doc["createdByUsername"], language=doc["language"], code=doc["code"],
        isActive=doc["isActive"], createdAt=doc["createdAt"], lastActiveAt=doc["lastActiveAt"],
        participantsCount=len(doc["participants"]),
    )


@api.get("/rooms/user/myrooms", response_model=List[RoomPublic])
async def my_rooms(user: Dict[str, Any] = Depends(current_user)):
    cursor = db.rooms.find({"$or": [{"createdBy": user["id"]}, {"participants": user["id"]}]}, {"_id": 0, "codeHistory": 0}).sort("lastActiveAt", -1).limit(50)
    out = []
    async for r in cursor:
        out.append(RoomPublic(
            roomId=r["roomId"], name=r.get("name", "Untitled"), createdBy=r["createdBy"],
            createdByUsername=r.get("createdByUsername", ""), language=r.get("language", "javascript"),
            code=r.get("code", ""), isActive=r.get("isActive", True),
            createdAt=r.get("createdAt", ""), lastActiveAt=r.get("lastActiveAt", ""),
            participantsCount=len(r.get("participants", [])),
        ))
    return out


@api.get("/rooms/{room_id}", response_model=RoomPublic)
async def get_room(room_id: str, user: Dict[str, Any] = Depends(current_user)):
    r = await db.rooms.find_one({"roomId": room_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Room not found")
    # add user as participant if not already
    if user["id"] not in r.get("participants", []):
        await db.rooms.update_one({"roomId": room_id}, {"$addToSet": {"participants": user["id"]}})
        r["participants"].append(user["id"])
    return RoomPublic(
        roomId=r["roomId"], name=r.get("name", "Untitled"), createdBy=r["createdBy"],
        createdByUsername=r.get("createdByUsername", ""), language=r.get("language", "javascript"),
        code=r.get("code", ""), isActive=r.get("isActive", True),
        createdAt=r.get("createdAt", ""), lastActiveAt=r.get("lastActiveAt", ""),
        participantsCount=len(r.get("participants", [])),
    )


# ---------- AI Routes ----------
async def _run_gemini(system: str, prompt: str, session_id: str) -> str:
    if not EMERGENT_LLM_KEY:
        return "AI service unavailable: no LLM key configured."
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system).with_model("gemini", "gemini-2.5-flash")
    resp = await chat.send_message(UserMessage(text=prompt))
    return resp if isinstance(resp, str) else str(resp)


@api.post("/rooms/ai-review")
async def ai_review(payload: AICodeIn, user: Dict[str, Any] = Depends(current_user)):
    sys = "You are a senior code reviewer. Provide a concise structured review covering: 1) Bugs, 2) Performance, 3) Best Practices, 4) Security. Use markdown headings and bullet points. Be specific and actionable."
    prompt = f"Review this {payload.language} code:\n```{payload.language}\n{payload.code[:6000]}\n```"
    text = await _run_gemini(sys, prompt, f"review-{user['id']}")
    return {"result": text}


@api.post("/rooms/ai-quickfix")
async def ai_quickfix(payload: AICodeIn, user: Dict[str, Any] = Depends(current_user)):
    sys = "You are a code-fixing assistant. Detect bugs, syntax errors, or issues in the provided code and return ONLY a corrected version of the full code. Do not include explanations. Wrap response in a single fenced code block."
    prompt = f"Fix this {payload.language} code:\n```{payload.language}\n{payload.code[:6000]}\n```"
    text = await _run_gemini(sys, prompt, f"fix-{user['id']}")
    # Extract fenced code if present
    fixed = text
    if "```" in text:
        parts = text.split("```")
        if len(parts) >= 3:
            block = parts[1]
            # remove leading lang token
            if "\n" in block:
                block = block.split("\n", 1)[1]
            fixed = block.rstrip()
    return {"result": text, "fixed": fixed}


@api.post("/rooms/ai-explain")
async def ai_explain(payload: AICodeIn, user: Dict[str, Any] = Depends(current_user)):
    sys = "You explain code in plain English for beginners. Be clear and concise. Use markdown bullet points."
    target = payload.selection or payload.code
    prompt = f"Explain this {payload.language} code:\n```{payload.language}\n{target[:4000]}\n```"
    text = await _run_gemini(sys, prompt, f"explain-{user['id']}")
    return {"result": text}


@api.post("/rooms/ai-generate")
async def ai_generate(payload: AICodeIn, user: Dict[str, Any] = Depends(current_user)):
    sys = "You are an expert programmer. Generate clean, working code based on the user's description. Return ONLY the code in a single fenced code block, no explanations."
    prompt = f"Generate {payload.language} code for: {payload.prompt or 'a hello world example'}"
    text = await _run_gemini(sys, prompt, f"gen-{user['id']}")
    code = text
    if "```" in text:
        parts = text.split("```")
        if len(parts) >= 3:
            block = parts[1]
            if "\n" in block:
                block = block.split("\n", 1)[1]
            code = block.rstrip()
    return {"result": text, "code": code}


@api.post("/rooms/ai-optimize")
async def ai_optimize(payload: AICodeIn, user: Dict[str, Any] = Depends(current_user)):
    sys = "You are a performance optimization expert. Suggest specific optimizations for the code with explanations. Use markdown."
    prompt = f"Suggest performance optimizations for this {payload.language} code:\n```{payload.language}\n{payload.code[:6000]}\n```"
    text = await _run_gemini(sys, prompt, f"opt-{user['id']}")
    return {"result": text}


# ---------- Code Execution ----------
PISTON_LANG_MAP = {
    "javascript": ("javascript", "1.32.3"),
    "typescript": ("typescript", "1.32.3"),
    "python": ("python", "3.10.0"),
    "java": ("java", "15.0.2"),
    "cpp": ("c++", "10.2.0"),
    "go": ("go", "1.16.2"),
    "rust": ("rust", "1.68.2"),
    "ruby": ("ruby", "3.0.1"),
    "php": ("php", "8.2.3"),
    "csharp": ("csharp", "6.12.0"),
}


# Local subprocess fallback (Piston public API is whitelist-only since Feb 2026)
import subprocess
import tempfile
import shutil

LOCAL_RUNNERS = {
    "python": {"cmd": ["python3", "{file}"], "ext": ".py"},
    "javascript": {"cmd": ["node", "{file}"], "ext": ".js"},
}
# C++ requires compile step; handled separately.


def _run_local(language: str, code: str, stdin: str) -> Dict[str, Any]:
    if language == "cpp":
        if not shutil.which("g++"):
            return {"stdout": "", "stderr": "g++ not available locally", "code": 1}
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "main.cpp")
            binp = os.path.join(tmp, "main")
            with open(src, "w") as f:
                f.write(code)
            comp = subprocess.run(["g++", "-O0", "-std=c++17", src, "-o", binp], capture_output=True, text=True, timeout=15)
            if comp.returncode != 0:
                return {"stdout": "", "stderr": comp.stderr, "code": comp.returncode}
            try:
                run = subprocess.run([binp], input=stdin or "", capture_output=True, text=True, timeout=10)
                return {"stdout": run.stdout, "stderr": run.stderr, "code": run.returncode}
            except subprocess.TimeoutExpired:
                return {"stdout": "", "stderr": "Execution timed out (10s)", "code": 124}
    runner = LOCAL_RUNNERS.get(language)
    if not runner:
        return {"stdout": "", "stderr": f"Local execution not supported for '{language}'. Self-hosted Piston or Judge0 required.", "code": 1}
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, f"main{runner['ext']}")
        with open(path, "w") as f:
            f.write(code)
        cmd = [c.replace("{file}", path) for c in runner["cmd"]]
        try:
            run = subprocess.run(cmd, input=stdin or "", capture_output=True, text=True, timeout=10)
            return {"stdout": run.stdout, "stderr": run.stderr, "code": run.returncode}
        except subprocess.TimeoutExpired:
            return {"stdout": "", "stderr": "Execution timed out (10s)", "code": 124}
        except FileNotFoundError as e:
            return {"stdout": "", "stderr": f"Runtime not installed: {e}", "code": 127}


@api.post("/execute")
async def execute_code(payload: ExecuteIn, user: Dict[str, Any] = Depends(current_user)):
    lang_info = PISTON_LANG_MAP.get(payload.language)
    if not lang_info:
        raise HTTPException(status_code=400, detail="Unsupported language")
    lang, version = lang_info
    body = {
        "language": lang,
        "version": version,
        "files": [{"content": payload.code}],
        "stdin": payload.stdin or "",
    }
    # Try public Piston first (may be 401 since Feb 2026 whitelist-only)
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(f"{PISTON_URL}/execute", json=body)
            if r.status_code == 200:
                data = r.json()
                run = data.get("run", {})
                return {
                    "stdout": run.get("stdout", ""),
                    "stderr": run.get("stderr", ""),
                    "output": run.get("output", ""),
                    "code": run.get("code", 0),
                    "signal": run.get("signal"),
                    "language": lang,
                    "version": version,
                    "engine": "piston",
                }
            logger.warning(f"Piston returned {r.status_code}; using local runner")
    except Exception as e:
        logger.warning(f"Piston unreachable: {e}; using local runner")

    # Local subprocess fallback
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _run_local, payload.language, payload.code, payload.stdin or "")
    return {
        "stdout": result.get("stdout", ""),
        "stderr": result.get("stderr", ""),
        "output": (result.get("stdout", "") + result.get("stderr", "")),
        "code": result.get("code", 0),
        "signal": None,
        "language": payload.language,
        "version": "local",
        "engine": "local",
    }


@api.get("/")
async def root():
    return {"message": "Coderift API", "version": "1.0.0"}


fastapi_app.include_router(api)

# ---------- Socket.IO ----------
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*", logger=False, engineio_logger=False)

# In-memory presence: { room_id: { sid: {userId, username, color, cursor} } }
ROOM_PRESENCE: Dict[str, Dict[str, Dict[str, Any]]] = {}
USER_COLORS = ["#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899", "#14B8A6", "#F97316"]


def _color_for(name: str) -> str:
    return USER_COLORS[abs(hash(name)) % len(USER_COLORS)]


@sio.event
async def connect(sid, environ, auth):
    logger.info(f"socket connected: {sid}")


@sio.event
async def disconnect(sid):
    # Remove from any rooms
    for room_id, members in list(ROOM_PRESENCE.items()):
        if sid in members:
            user = members.pop(sid)
            await sio.emit("user-left", {"userId": user.get("userId"), "username": user.get("username"), "sid": sid}, room=room_id)
            await sio.emit("presence", {"users": list(members.values())}, room=room_id)
            await sio.leave_room(sid, room_id)
            if not members:
                ROOM_PRESENCE.pop(room_id, None)


@sio.event
async def join_room(sid, data):
    room_id = data.get("roomId")
    user_id = data.get("userId")
    username = data.get("username", "Anonymous")
    if not room_id:
        return
    color = _color_for(username + (user_id or sid))
    await sio.enter_room(sid, room_id)
    members = ROOM_PRESENCE.setdefault(room_id, {})
    members[sid] = {"sid": sid, "userId": user_id, "username": username, "color": color, "cursor": None}
    await sio.emit("user-joined", {"userId": user_id, "username": username, "color": color, "sid": sid}, room=room_id, skip_sid=sid)
    await sio.emit("presence", {"users": list(members.values())}, room=room_id)


@sio.event
async def leave_room(sid, data):
    room_id = data.get("roomId")
    if room_id and room_id in ROOM_PRESENCE and sid in ROOM_PRESENCE[room_id]:
        u = ROOM_PRESENCE[room_id].pop(sid)
        await sio.leave_room(sid, room_id)
        await sio.emit("user-left", {"userId": u.get("userId"), "username": u.get("username"), "sid": sid}, room=room_id)
        await sio.emit("presence", {"users": list(ROOM_PRESENCE[room_id].values())}, room=room_id)


@sio.event
async def code_change(sid, data):
    room_id = data.get("roomId")
    code = data.get("code", "")
    await sio.emit("code-update", {"code": code, "sid": sid}, room=room_id, skip_sid=sid)


@sio.event
async def save_code(sid, data):
    room_id = data.get("roomId")
    code = data.get("code", "")
    language = data.get("language")
    update = {"code": code, "lastActiveAt": datetime.now(timezone.utc).isoformat()}
    if language:
        update["language"] = language
    await db.rooms.update_one({"roomId": room_id}, {"$set": update})
    # snapshot for ghost replay
    await db.rooms.update_one(
        {"roomId": room_id},
        {"$push": {"codeHistory": {"$each": [{"ts": datetime.now(timezone.utc).isoformat(), "code": code[:5000]}], "$slice": -100}}},
    )
    await sio.emit("code-saved", {"savedAt": datetime.now(timezone.utc).isoformat()}, room=room_id)


@sio.event
async def language_change(sid, data):
    room_id = data.get("roomId")
    language = data.get("language")
    await db.rooms.update_one({"roomId": room_id}, {"$set": {"language": language}})
    await sio.emit("language-update", {"language": language, "sid": sid}, room=room_id, skip_sid=sid)


@sio.event
async def cursor_move(sid, data):
    room_id = data.get("roomId")
    members = ROOM_PRESENCE.get(room_id, {})
    if sid in members:
        members[sid]["cursor"] = data.get("position")
    await sio.emit("cursor-update", {"sid": sid, "position": data.get("position"), "username": data.get("username")}, room=room_id, skip_sid=sid)


@sio.event
async def battle_start(sid, data):
    room_id = data.get("roomId")
    duration = int(data.get("duration", 300))
    end_at = (datetime.now(timezone.utc) + timedelta(seconds=duration)).isoformat()
    await sio.emit("battle-timer", {"endAt": end_at, "duration": duration, "active": True}, room=room_id)


@sio.event
async def battle_end(sid, data):
    room_id = data.get("roomId")
    await sio.emit("battle-timer", {"active": False}, room=room_id)


# Mount: socketio handles /socket.io/, fastapi handles everything else
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="socket.io")


@fastapi_app.on_event("shutdown")
async def shutdown_db_client():
    mongo_client.close()
