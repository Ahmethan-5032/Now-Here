# NOW Here

NOW Here; konum bazli post, harita akisi, rota, profil seviyesi, rozetler, kamera ile fotograf ve sosyal etkilesim ozellikleri iceren full-stack web uygulamasidir.

## Mimari

```txt
client/  -> React + Vite frontend, Vercel icin
server/  -> Express API, Render icin
MongoDB  -> kullanici, post, yorum, profil verileri
```

## Yeni eklenen ana iyilestirmeler

- Ana sayfada tek document scroll mantigi ve daha akici hareketli arka plan.
- Mobil kamera ekraninda on kamera / arka kamera cevirme butonu.
- Post sisteminde kategoriye ek olarak atmosfer, puan ve etiketler.
- Profil sisteminde bio, sehir, website, durum, ilgi alanlari, tema, seviye, skor, profil dolulugu ve son aktivite.
- Harita akisi icinde kategori ve metin/etiket filtresi.
- Backend CORS yapisinda `CLIENT_ORIGINS` ile coklu frontend origin destegi.
- Deploy dosyalari temizlendi: `.env`, `.git`, `node_modules` ve build ciktisi repoya alinmamali.

## Local calistirma

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Backend varsayilan adresi:

```txt
http://localhost:5000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Frontend varsayilan adresi:

```txt
http://localhost:5173
```

Client icin `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Server icin `.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/now-here
JWT_SECRET=change-this-long-random-secret
CLIENT_ORIGINS=http://localhost:5173
```

## Deploy

### Render backend

```txt
Root Directory: server
Build Command: npm install
Start Command: npm start
```

Render env:

```env
MONGO_URI=...
JWT_SECRET=...
CLIENT_ORIGINS=https://your-vercel-app.vercel.app
```

### Vercel frontend

```txt
Root Directory: client
Build Command: npm run build
Output Directory: dist
```

Vercel env:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

## Push komutlari

```bash
git add .
git commit -m "Expand NOW Here UI UX and profile system"
git push origin main --force
```

