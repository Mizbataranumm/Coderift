"""Coderift backend regression tests."""
import os, time, uuid, asyncio, pytest, requests

BASE = os.environ.get("REACT_APP_BACKEND_URL_BACKEND") or "https://code-sync-lab-1.preview.emergentagent.com"
BASE = BASE.rstrip("/")
API = f"{BASE}/api"

@pytest.fixture(scope="session")
def existing_token():
    r = requests.post(f"{API}/auth/login", json={"email": "alice@test.com", "password": "password123"}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="session")
def new_user():
    uname = f"TEST_{uuid.uuid4().hex[:8]}"
    email = f"{uname}@test.com"
    r = requests.post(f"{API}/auth/register", json={"username": uname, "email": email, "password": "password123"}, timeout=15)
    assert r.status_code == 200, f"register: {r.status_code} {r.text}"
    d = r.json()
    return {"token": d["token"], "user": d["user"], "email": email, "password": "password123"}

# Auth
def test_register(new_user):
    assert new_user["user"]["email"] == new_user["email"]
    assert "id" in new_user["user"]

def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": "x@x.com", "password": "wrong"}, timeout=15)
    assert r.status_code == 401

def test_me(existing_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {existing_token}"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["email"] == "alice@test.com"

def test_me_no_token():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401

# Rooms
def test_room_create_get_list(existing_token):
    h = {"Authorization": f"Bearer {existing_token}"}
    r = requests.post(f"{API}/rooms/create", json={"name": "TEST_room", "language": "python"}, headers=h, timeout=15)
    assert r.status_code == 200, r.text
    rd = r.json()
    assert len(rd["roomId"]) == 8
    assert rd["language"] == "python"
    assert "Welcome" in rd["code"]
    rid = rd["roomId"]
    g = requests.get(f"{API}/rooms/{rid}", headers=h, timeout=15)
    assert g.status_code == 200
    assert g.json()["roomId"] == rid
    m = requests.get(f"{API}/rooms/user/myrooms", headers=h, timeout=15)
    assert m.status_code == 200
    assert any(x["roomId"] == rid for x in m.json())

def test_room_404(existing_token):
    h = {"Authorization": f"Bearer {existing_token}"}
    r = requests.get(f"{API}/rooms/NOPE0000", headers=h, timeout=15)
    assert r.status_code == 404

# Execute
def test_execute_python(existing_token):
    h = {"Authorization": f"Bearer {existing_token}"}
    r = requests.post(f"{API}/execute", json={"code": "print(2+2)", "language": "python"}, headers=h, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "4" in (d.get("stdout") or d.get("output") or "")

def test_execute_javascript(existing_token):
    h = {"Authorization": f"Bearer {existing_token}"}
    r = requests.post(f"{API}/execute", json={"code": "console.log(3*7)", "language": "javascript"}, headers=h, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert "21" in (d.get("stdout") or d.get("output") or "")

def test_execute_unsupported_returns_message(existing_token):
    h = {"Authorization": f"Bearer {existing_token}"}
    r = requests.post(f"{API}/execute", json={"code": "puts 'hi'", "language": "ruby"}, headers=h, timeout=30)
    assert r.status_code == 200
    # Either piston works OR local says not supported
    d = r.json()
    assert "stdout" in d and "stderr" in d

# AI
@pytest.mark.parametrize("ep,payload", [
    ("ai-review", {"code": "def f(x):return x+1", "language": "python"}),
    ("ai-quickfix", {"code": "def f(x)\n  return x", "language": "python"}),
    ("ai-explain", {"code": "print('hi')", "language": "python"}),
    ("ai-generate", {"code": "", "language": "python", "prompt": "factorial function"}),
    ("ai-optimize", {"code": "for i in range(10):\n  print(i)", "language": "python"}),
])
def test_ai_endpoints(existing_token, ep, payload):
    h = {"Authorization": f"Bearer {existing_token}"}
    r = requests.post(f"{API}/rooms/{ep}", json=payload, headers=h, timeout=60)
    assert r.status_code == 200, f"{ep}: {r.status_code} {r.text[:200]}"
    d = r.json()
    assert d.get("result") and len(d["result"]) > 10, f"{ep} empty"

# Socket.IO
def test_socketio_handshake():
    r = requests.get(f"{BASE}/socket.io/?EIO=4&transport=polling", timeout=15)
    assert r.status_code == 200
    assert "sid" in r.text
