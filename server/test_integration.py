
from fastapi.testclient import TestClient
from main import app
from app.database import Base, engine

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
client = TestClient(app)

r = client.get('/')
assert r.status_code == 200
print('OK: GET /')

r = client.post('/api/auth/register', json={'username': 'testuser', 'password': 'test123'})
assert r.status_code == 201
print('OK: POST /api/auth/register')

r = client.post('/api/auth/login', json={'username': 'testuser', 'password': 'test123'})
assert r.status_code == 200
token = r.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}
print('OK: POST /api/auth/login')

r = client.post('/api/tags/', json={'name': 'math', 'color': '#3b82f6'}, headers=headers)
assert r.status_code == 201
print('OK: POST /api/tags/')

r = client.get('/api/tags/', headers=headers)
assert r.status_code == 200
print('OK: GET /api/tags/')

r = client.post('/api/posts/', json={'title': 'test', 'content': 'hello', 'tag_ids': [1]}, headers=headers)
assert r.status_code == 201
pid = r.json()['id']
print('OK: POST /api/posts/')

r = client.get(f'/api/posts/{pid}', headers=headers)
assert r.status_code == 200
print('OK: GET /api/posts/{pid}')

r = client.post(f'/api/posts/{pid}/vote?value=1', headers=headers)
assert r.status_code == 200
print('OK: POST /api/posts/{pid}/vote')

r = client.post(f'/api/comments/', json={'post_id': pid, 'content': 'nice'}, headers=headers)
assert r.status_code == 201
print('OK: POST /api/comments/')

r = client.get(f'/api/comments/?post_id={pid}', headers=headers)
assert r.status_code == 200
print('OK: GET /api/comments/')

r = client.post('/api/notebooks/', json={'name': 'notes', 'is_public': True}, headers=headers)
assert r.status_code == 201
nid = r.json()['id']
print('OK: POST /api/notebooks/')

r = client.post(f'/api/notebooks/{nid}/docs', json={'title': 'my doc', 'content': '# hello', 'tag_ids': [1]}, headers=headers)
assert r.status_code == 201
did = r.json()['id']
print('OK: POST /api/notebooks/{nid}/docs')

r = client.get(f'/api/notebooks/docs/{did}', headers=headers)
assert r.status_code == 200
print('OK: GET /api/notebooks/docs/{did}')

r = client.post(f'/api/notebooks/docs/{did}/ai-summarize', headers=headers)
assert r.status_code == 200
print('OK: POST /api/notebooks/docs/{did}/ai-summarize')

r = client.get('/api/notebooks/explore/docs', headers=headers)
assert r.status_code == 200
print('OK: GET /api/notebooks/explore/docs')

r = client.get('/api/posts/', headers=headers)
assert r.status_code == 200
print('OK: GET /api/posts/')

print()
print('ALL PASSED!')
