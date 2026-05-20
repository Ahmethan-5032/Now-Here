# Mimari

NOW Here iki ana parcadan olusur:

- `client`: React, Vite, React Router ve React Leaflet ile harita arayuzu.
- `server`: Express API, Mongoose modelleri ve MongoDB baglantisi.

Istemci gelistirme ortaminda `/api` isteklerini `client/vite.config.js` proxy ayariyla `localhost:5000` uzerindeki API'ye yollar.

Sunucu baslarken MongoDB baglantisini dener. Baglanti basarisiz olursa API bellek ici yedek modda calisir; bu mod proje demosunun veritabani olmadan da acilmasini saglar.

Auth token'i `Authorization: Bearer <token>` header'i ile tasinir. Harita, post olusturma, begeni, yorum ve profil endpoint'leri oturum ister.

Harita aramasi ve rota hesaplama istemciden direkt dis servislere gitmez; `server/src/routes/placeRoutes.js` proxy katmani kullanilir.
