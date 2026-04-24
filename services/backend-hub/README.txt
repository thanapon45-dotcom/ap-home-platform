Backend Hub - copy-paste package

Files:
- server.cjs
- package.json
- .env.example

Install:
npm install

Run:
npm run dev

Core routes:
GET  /health
GET  /api/state
POST /action/blog/run
POST /webhook/n8n
POST /webhook/fb

Priority:
Stabilize Dashboard -> Hub -> n8n -> WordPress -> Hub -> Dashboard first.
Do not add FB or Telegram until the blog path is verified end-to-end.
