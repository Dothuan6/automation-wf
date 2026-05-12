# XBuild - Huong dan tai va khoi chay du an

## 1) Yeu cau moi truong
- Node.js >= 20
- Docker Desktop (de chay Postgres, Redis, MinIO)
- pnpm >= 9 (khuyen nghi)

Neu may ban chua co `pnpm`, co the dung tam `npm` de chay tung app.

## 2) Tai source code
```bash
git clone https://github.com/Dothuan6/automation-wf.git
cd automation-wf
```

## 3) Cai dependencies
### Cach 1 (khuyen nghi): pnpm
```bash
pnpm install
```

### Cach 2 (fallback): npm
```bash
npm install
npm --prefix apps/api install
npm --prefix apps/web install
```

## 4) Tao file env
```bash
cp .env.example .env
```

Tren Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

## 5) Chay ha tang local (DB, Redis, MinIO)
```bash
docker compose up -d
```

Dich vu du kien:
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- MinIO API: `localhost:9000`
- MinIO Console: `localhost:9001`

## 6) Migrate + seed database
### Neu dung pnpm
```bash
pnpm db:migrate
pnpm db:seed
```

### Neu dung npm
```bash
npm --prefix apps/api run prisma:migrate
npm --prefix apps/api run prisma:seed
```

## 7) Khoi chay du an

## Cach 1: Chay dong thoi Web + API (pnpm)
```bash
pnpm dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`

## Cach 2: Chay rieng tung app
### API
```bash
npm --prefix apps/api run dev
```

### Web
```bash
npm --prefix apps/web run dev -- --host 0.0.0.0 --port 5173
```

## 8) Build production
### pnpm
```bash
pnpm build
```

### npm
```bash
npm --prefix apps/api run build
npm --prefix apps/web run build
```

## 9) Mot so lenh huu ich
- Mo Prisma Studio:
```bash
pnpm db:studio
```

- Dung ha tang local:
```bash
docker compose down
```

## 10) Troubleshooting nhanh
- Loi khong tim thay `pnpm`:
  - Dung `npm` commands o tren, hoac cai pnpm/global.
- Web chay duoc nhung API loi:
  - Kiem tra `.env`, Postgres da len chua, da migrate/seed chua.
- Port bi trung:
  - Doi port trong `apps/web/vite.config.ts` hoac stop process dang dung port.
