# API

Base URL: `http://localhost:5000`

## Health

`GET /api/health`

Sunucu durumunu ve aktif veri modunu dondurur.

## Auth

`POST /api/auth/request-code`

E-posta icin 6 haneli dogrulama kodu uretir. Rate limit uygulanir.

```json
{
  "email": "ahmet@example.com"
}
```

`POST /api/auth/register`

```json
{
  "firstName": "Ahmet",
  "lastName": "Yilmaz",
  "avatarName": "ahmetgezgin",
  "email": "ahmet@example.com",
  "password": "GucluSifre123",
  "code": "123456"
}
```

`POST /api/auth/login`

```json
{
  "email": "ahmet@example.com",
  "password": "GucluSifre123"
}
```

Auth endpoint'leri httpOnly `nh_session` cookie set eder ve public `user` objesi dondurur. `AUTH_TOKEN_RESPONSE=true` yapilmadikca JWT response body icinde donmez.

`GET /api/auth/me`

Profil, istatistik, rozet, paylasim, begeni ve yorum gecmisini dondurur.

`PUT /api/auth/me`

Profil fotografi, ad, soyad ve avatar adini gunceller.

`POST /api/auth/me/distance`

Rota bitince kullanicinin toplam mesafesine metre ekler.
`routeProof` zorunludur; bu deger `/api/places/route` tarafindan uretilir.

## Posts

`GET /api/posts`

Giris yapmis kullanici icin paylasimlari en yeni once olacak sekilde dondurur.

`POST /api/posts`

```json
{
  "description": "Guzel bir nokta",
  "placeName": "Kadikoy",
  "category": "kafe",
  "lat": 40.9909,
  "lng": 29.028,
  "image": "data:image/jpeg;base64,..."
}
```

`POST /api/posts/:id/like`

Secili paylasimin begeni sayisini artirir.

`POST /api/posts/:id/comments`

Secili paylasima yorum ekler.

## Places

`GET /api/places/search?q=burger%20king`

Nominatim uzerinden mekan arar.

`GET /api/places/route?fromLat=41&fromLng=29&toLat=41.1&toLng=29.1`

OSRM uzerinden rota, polyline koordinatlari ve adimlari dondurur.
