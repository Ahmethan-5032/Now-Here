# Veritabani Semasi

## User

- `firstName`: string
- `lastName`: string
- `displayName`: string
- `avatarName`: string
- `email`: unique string
- `phone`: unique string
- `password`: hashlenmis string, response icinde donmez
- `profilePhoto`: base64 data URL veya bos string
- `emailVerified`, `phoneVerified`: boolean
- `distanceMeters`: number
- `createdAt`, `updatedAt`

## Post

- `description`: string, en fazla 500 karakter
- `lat`: number, -90 ile 90 arasi
- `lng`: number, -180 ile 180 arasi
- `placeName`: string
- `image`: base64 data URL veya bos string
- `category`: `diger`, `kafe`, `doga`, `etkinlik`, `spor`, `sanat`
- `likes`: number
- `comments`: array
- `authorId`, `authorName`, `authorAvatar`
- `likedBy`: user id listesi
- `createdAt`, `updatedAt`
