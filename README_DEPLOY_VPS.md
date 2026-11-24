# Auth Flow — migracion Render -> VPS (primera version)

## Alcance
- Backend Express + TypeScript + Prisma 6 / MySQL.
- API bajo `/api/` (mismo dominio que Angular), puerto privado 127.0.0.1:3004.
- Registro, login, envio de codigo y PATCH status.
- Se corrige JWT sin secreto por defecto, se autentica `/status`, validacion Zod,
  se usa OTP de 4 digitos aleatorio criptograficamente y guardado hasheado,
  controles basicos de frecuencia en memoria y errores SMTP propagados.
- El JWT se sigue devolviendo en JSON para preservar el frontend V1; el
  frontend aun guarda JWT en localStorage. Revisar esto en un hardening posterior.
- No hay ninguna tarea automatica que cree, destruya ni migre tablas.

## IMPORTANTE: datos
`prisma/schema.prisma` define MySQL con tablas `User` y `VerificationCode`.
Para usuarios existentes, mantener la `DATABASE_URL` actual mientras se valida
la migracion del servidor; si la base tambien vive en Render, migrarla por
separado con backup, verificaciones de integridad y corte planificado.
NO usar `prisma db push`, `prisma migrate reset`, ni `migrate dev` en datos reales.
El nuevo backend emite codigos hasheados: codigos antiguos sin hashear dejan de
ser validos y deben volver a solicitarse (solo afecta OTP temporales).
Se define is_verified=true en nuevos registros tras codigo valido.
No se exige is_verified en login para preservar cuentas existentes.

## Preparar entorno local en el repo original
Copiar estos archivos completos al repo; conservar package-lock existente si lo hay.
Revisar conflictos con .gitignore y package scripts.
`npm install` (genera/actualiza package-lock si no existia).
`npx prisma generate`
`npm run typecheck`
`npm run build`
Nunca commitear `.env`.

## VPS — preparacion (SIN cambiar MySQL ni Nginx existente)
Comprobar primero `ss -ltnp | grep ':3004'` y espacio libre.
Clonar repo modificado en /opt/authflow-api (o desplegar las fuentes completas).
`npm ci` si hay package-lock; en caso contrario `npm install` y commitear lock.
`npx prisma generate && npm run build`
`cp .env.example .env && chmod 600 .env`
Configurar JWT_SECRET (32+ caracteres), DATABASE_URL, GMAIL_USER, GMAIL_PASS.
Usar credenciales privadas: nunca subirlas al chat ni a Git.
`NODE_ENV=production npm start` para una prueba LOCAL.
`curl -i http://127.0.0.1:3004/api/health-check`
`curl -i http://127.0.0.1:3004/api/health-check/db`
Si DB devuelve 503, revisar host/red/usuario MySQL sin ejecutar migraciones.
Hacer pruebas funcionales de registro/email/login con cuenta de prueba
antes de habilitar rutas publicas.

## Nginx (despues de probar API)
Frontend: root /var/www/auth/current; Angular `try_files $uri $uri/ /index.html`.
API: permitir solo POST /api/get-code, POST /api/register, POST /api/login,
y PATCH /api/status. Proxy a http://127.0.0.1:3004 sin quitar /api.
Mantener cualquier otra /api/ en 403 y no exponer `/api/health-check/db`.
TLS: Certbot sobre auth.alejandrogodino.dev, con prueba `nginx -t`.

## Login y verificaciones
- En produccion Angular usa `apiUrl: '/api'`.
- En desarrollo, Angular usa `http://127.0.0.1:3004/api`; configurar CORS_ORIGIN=http://localhost:4200.
- El frontend espera OTP de 4 digitos y reenvio tras 60 s.
- Las solicitudes de get-code se limitan por IP y por email; un solo proceso
  PM2 con almacenamiento temporal en memoria, no sirve para multiples replicas.
- Al migrar la DB, verificar collations, tablas, indices unique, y zonas horarias.
- Cambiar cualquier JWT_SECRET y contraseña SMTP filtrada en Git o Render.

## Pendiente antes de desactivar Render
1. Confirmar ubicacion de MySQL y backup de usuarios.
2. Verificar ejecucion en VPS y conectividad MySQL.
3. Probar e2e email -> OTP -> registro -> login -> token -> status.
4. DNS y HTTPS; luego cortar referencias Render desde frontend desplegado.
5. Monitoreo/rollback y recien entonces desactivar Render.
