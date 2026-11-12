# Permaweb App — Documentación para desarrolladores

> **Estado: documento de diseño.** No describe el estado actual del código. La implementación **PermaDrop** se materializó en esta carpeta durante la redacción (79 archivos, Next.js 16.4.3, React 19.3.1, `db/schema.sql`, `app/`, `components/`, `lib/`, `scripts/`); su estado verificado está en [`ESTADO-PROYECTO.md`](../ESTADO-PROYECTO.md). Este documento especifica **cómo debería construirse** el sistema a partir de la estructura de carpetas; donde el código y este texto difieran, prevalece el código. Todo contrato, esquema y comando es una propuesta de referencia, no una descripción de algo que este documento certifique.

---

## 1. Punto de partida verificado

| Comprobación | Resultado |
|---|---|
| Archivos de código | 0 |
| `package.json`, `tsconfig.json`, `next.config.*` | No existen |
| `node_modules/` | 85 paquetes, todos directorios vacíos |
| Esquema o migraciones | No existen |
| Pruebas | No existen |
| Git | No inicializado |

Las carpetas definen la **forma** del producto. Los nombres de dependencias vacías definen el **stack** con distinto grado de confianza:

- **Alta:** Next.js + React + TypeScript (`next`, `react`, `react-dom`, `typescript`, `@types/*`).
- **Alta:** PostgreSQL vía `node-postgres` (`pg`, `pg-pool`, `@types/pg`), no Prisma.
- **Alta:** Arweave (`arweave`, `arconnect`, `@ardrive/*`, `@noble/*`, `@scure/*`).
- **Media:** Postgres embebido para desarrollo (`@electric-sql/pglite` y extensiones).
- **Media:** JWT (`jose`), QR (`qrcode`, `pngjs`), slugs (`nanoid`), imágenes (`sharp`).
- **Baja:** pagos con Solana (`@solana/*`); no hay rutas que lo confirmen.

**Consecuencia:** el diseño respeta `pg` como driver y deja Prisma como alternativa, no como supuesto. Si se adopta Prisma, se añade como dependencia nueva y se documenta la decisión.

---

## 2. Principios de arquitectura

1. **Monolito modular.** Una sola aplicación Next.js; no hay microservicios. El volumen esperado no los justifica y añaden superficie operativa.
2. **Server-first.** Las páginas son Server Components que leen de la base en el servidor. El cliente se usa solo para interacción (formulario de subida, visor, copiar enlace).
3. **Ruta fina, dominio grueso.** El route handler valida, autentica y delega; la lógica vive en `lib/`. Esto permite probar el dominio sin HTTP.
4. **Contratos estables.** JSON con formas explícitas, errores con código, y validación en el borde. Nada de `any` en las fronteras.
5. **Dinero explícito.** Todo movimiento de créditos es una fila del ledger dentro de una transacción; nunca un `UPDATE users SET credits = credits - X` aislado.
6. **Seguridad en el servidor.** El rol y la propiedad se verifican en cada handler; el cliente no es fuente de verdad.
7. **Permanencia advertida.** La interfaz declara la irreversibilidad antes de confirmar; el backend no puede deshacerla.

### 2.1. Capas

```
app/            Presentación y HTTP (páginas, layouts, route handlers)
  └─ llama a
lib/            Dominio y casos de uso (quote, uploads, credits, slugs, auth)
  ├─ llama a
db/             Persistencia (pool, consultas, migraciones)
  └─ habla con PostgreSQL
lib/storage/    Adaptador de almacenamiento (bundler/gateway)
```

Regla: `app/` no importa el pool directamente; `lib/` no conoce `Request`/`Response`; `db/` no conoce reglas de negocio.

---

## 3. Estructura propuesta

```
permaweb-app/
├── app/
│   ├── layout.tsx                     # FALTA — layout raíz
│   ├── page.tsx                       # FALTA — inicio
│   ├── globals.css                    # FALTA
│   ├── login/page.tsx                 # FALTA
│   ├── registro/page.tsx              # FALTA
│   ├── f/[slug]/page.tsx              # FALTA — ficha pública
│   ├── v/[slug]/page.tsx              # FALTA — visor
│   ├── historial/page.tsx             # FALTA
│   ├── admin/
│   │   ├── layout.tsx                 # FALTA — guard de rol
│   │   └── usuarios/
│   │       ├── page.tsx               # FALTA
│   │       └── [id]/page.tsx          # FALTA
│   └── api/
│       ├── health/route.ts            # FALTA
│       ├── quote/route.ts             # FALTA
│       ├── upload/route.ts            # FALTA
│       ├── download/[slug]/route.ts   # FALTA
│       ├── qr/[slug]/route.ts         # FALTA
│       ├── me/route.ts                # FALTA
│       ├── auth/{register,login,logout}/route.ts   # FALTAN
│       └── admin/{users,uploads}/...  # FALTAN
├── components/                        # FALTA contenido (UI reutilizable)
├── lib/
│   ├── auth.ts                        # FALTA — sesión, hash, guardas
│   ├── db.ts                          # FALTA — pool y helper de transacción
│   ├── pricing.ts                     # FALTA — cotización
│   ├── credits.ts                     # FALTA — ledger
│   ├── slugs.ts                       # FALTA — generación y validación
│   ├── storage/                       # FALTA — adaptador de bundler
│   └── validation.ts                  # FALTA — esquemas de entrada
├── db/
│   ├── migrations/                    # FALTA
│   └── seed.ts                        # FALTA
├── scripts/                           # FALTA — operación y utilidades
├── logs/                              # vacío, ignorado por Git
├── docs/                              # documentación y SVG
└── node_modules/                      # 85 paquetes vacíos (pista, no instalación)
```

**Convención de nombres:** rutas en `kebab-case` solo cuando el segmento es literal; tablas y columnas en `snake_case`; tipos y funciones en `camelCase`/`PascalCase`. Los segmentos dinámicos usan `[slug]` o `[id]` y siempre se validan antes de consultar.

---

## 4. Contratos de API previstos

### 4.0. Convenciones comunes

- **Base:** `/api`. Respuestas JSON `application/json; charset=utf-8`.
- **Errores:**

```json
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Saldo insuficiente para esta subida.",
    "details": { "required": 12, "available": 5 }
  }
}
```

- **Códigos previstos:** `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `QUOTE_EXPIRED` (409), `INSUFFICIENT_CREDITS` (402), `RATE_LIMITED` (429), `UPSTREAM_ERROR` (502), `INTERNAL` (500).
- **Nunca** se devuelve un 500 para un error de negocio esperable.
- **Idempotencia:** las mutaciones financieras aceptan `Idempotency-Key`; repetir la clave devuelve la misma respuesta sin duplicar el efecto.
- **Paginación:** `?cursor=<opaque>&limit=<1..100>`; respuesta `{ items, nextCursor }`.
- **Validación:** un esquema por endpoint; se rechaza todo campo desconocido.

### 4.1. Autenticación y perfil

| Método | Ruta | Entrada | Salida |
|---|---|---|---|
| `POST` | `/api/auth/register` | `{email, password}` | `201 {user:{id,email,role}}` + cookie |
| `POST` | `/api/auth/login` | `{email, password}` | `200 {user}` + cookie; `401` genérico |
| `POST` | `/api/auth/logout` | — | `204`; cookie borrada y sesión revocada |
| `GET` | `/api/me` | — | `200 {id,email,role,status,credits}` |

**Reglas:** contraseña mínima por definir (≥12 recomendado), hash Argon2id o bcrypt; respuesta genérica ante credenciales inválidas para no enumerar cuentas; cookie `httpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, con `Max-Age` acotado. El registro no inicia sesión automáticamente si se exige verificación de email (decisión abierta).

### 4.2. Cotización

**`POST /api/quote`**

```json
{ "fileName": "contrato.pdf", "sizeBytes": 2457600, "contentType": "application/pdf" }
```

```json
{
  "quoteId": "uuid",
  "priceCredits": 18,
  "expiresAt": "2026-01-01T12:15:00Z",
  "pricingVersion": "2026-01-a"
}
```

- Valida tamaño > 0, ≤ máximo y tipo permitido.
- Calcula con la tarifa vigente y **congela** el resultado en `quotes`.
- No debita nada todavía.
- `GET /api/quote` devuelve `{ratePerMb, margin, fixedFee, maxUploadBytes, allowedTypes, pricingVersion}` para mostrar precios sin autenticación.

### 4.3. Subida

**`POST /api/upload`** — inicia la subida.

```json
{ "quoteId": "uuid", "fileName": "contrato.pdf", "contentType": "application/pdf",
  "sizeBytes": 2457600, "sha256": "hex" }
```

```json
{
  "uploadId": "uuid",
  "slug": "k7m2x9q4",
  "status": "uploading",
  "upload": { "mode": "presigned", "url": "https://...", "expiresAt": "..." }
}
```

**`GET /api/upload?id=<uuid>`** — estado.

```json
{ "id": "uuid", "status": "processing", "txid": null,
  "slug": "k7m2x9q4", "errorCode": null, "createdAt": "..." }
```

**Reglas transaccionales:**

1. Bloquear la cotización (`SELECT ... FOR UPDATE`), verificar que no esté consumida ni vencida.
2. Verificar saldo contra el ledger.
3. Insertar `uploads` en `uploading`.
4. Insertar movimiento `debit` en `credit_ledger` con clave de idempotencia.
5. Actualizar la proyección `users.credits`.
6. Marcar la cotización como consumida.
7. `COMMIT` y recién entonces responder.

Si cualquier paso falla, no se devuelve `uploadId` y no se debita nada. La transferencia de bytes ocurre **después**; si falla, se aplica `failed` y el reembolso correspondiente.

> **Alternativa multipart:** para el MVP se puede recibir el archivo en el mismo request (`multipart/form-data`) con un límite estricto de tamaño. Es más simple, pero ata el tiempo de request al tamaño y complica los reintentos. La variante presigned es la recomendada para archivos grandes.

### 4.4. Descarga

**`GET /api/download/[slug]`**

- Valida `^[a-z0-9]{8,32}$`.
- Busca la subida `confirmed` y visible.
- Responde `302` a `${ARWEAVE_GATEWAY}/${txid}` (por defecto) o transmite con `Content-Disposition: attachment; filename*=UTF-8''...` si `?disposition=attachment`.
- `404` uniforme si no existe o está oculta (no distinguir para no filtrar existencia).
- El contador de descargas se incrementa de forma agregada y no bloqueante; un fallo del contador **no** falla la descarga.

### 4.5. QR

**`GET /api/qr/[slug]?format=png|svg&size=<px>`**

- Genera el QR de `${APP_URL}/f/${slug}`.
- `Content-Type` correcto, `Cache-Control: public, max-age=86400, immutable`.
- Tamaño acotado (p. ej. 128–1024) y corrección de errores `M`.
- No requiere autenticación; no revela más que la URL pública.

### 4.6. Administración

| Método | Ruta | Entrada | Efecto |
|---|---|---|---|
| `GET` | `/api/admin/users?q=&status=` | — | Lista paginada |
| `GET` | `/api/admin/users/[id]` | — | Detalle + últimas subidas + movimientos |
| `POST` | `/api/admin/users/[id]/credits` | `{amount, reason}` | Movimiento `grant`/`adjust` + auditoría |
| `POST` | `/api/admin/users/[id]/status` | `{status, reason}` | Activa/suspende + auditoría |
| `GET` | `/api/admin/uploads?status=&userId=` | — | Lista global |
| `GET` | `/api/admin/uploads/[id]` | — | Detalle |
| `POST` | `/api/admin/uploads/[id]/refund` | `{reason}` | Reembolso único + auditoría |

**Guardas:** rol `admin` verificado en el servidor; `reason` obligatorio y no vacío; límite de tasa propio; toda mutación escribe `audit_log` con actor, objetivo, IP y metadatos sin PII.

---

## 5. Modelo de datos propuesto

DDL de referencia para PostgreSQL. **No existe migración en el repositorio**; esto es una propuesta a validar.

```sql
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role   AS ENUM ('user', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended');
CREATE TYPE upload_status AS ENUM
  ('quoted','reserved','uploading','processing','confirmed','failed','expired','refunded');
CREATE TYPE ledger_kind AS ENUM ('grant','debit','refund','adjust');

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext NOT NULL UNIQUE,
  password_hash text   NOT NULL,
  role          user_role   NOT NULL DEFAULT 'user',
  status        user_status NOT NULL DEFAULT 'active',
  credits       integer     NOT NULL DEFAULT 0 CHECK (credits >= 0),
  token_version integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  ip         inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE quotes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  size_bytes      bigint NOT NULL CHECK (size_bytes > 0),
  content_type    text   NOT NULL,
  price_credits   integer NOT NULL CHECK (price_credits >= 0),
  pricing_version text   NOT NULL,
  expires_at      timestamptz NOT NULL,
  consumed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE uploads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id),
  quote_id     uuid NOT NULL REFERENCES quotes(id),
  slug         text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]{8,32}$'),
  file_name    text NOT NULL,
  content_type text NOT NULL,
  size_bytes   bigint NOT NULL,
  sha256       text NOT NULL,
  txid         text,
  status       upload_status NOT NULL DEFAULT 'uploading',
  error_code   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);
CREATE INDEX uploads_user_created_idx ON uploads(user_id, created_at DESC);
CREATE INDEX uploads_status_idx ON uploads(status);

CREATE TABLE credit_ledger (
  id              bigserial PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id),
  upload_id       uuid REFERENCES uploads(id),
  kind            ledger_kind NOT NULL,
  amount          integer NOT NULL CHECK (amount <> 0),
  balance_after   integer NOT NULL CHECK (balance_after >= 0),
  idempotency_key text NOT NULL UNIQUE,
  reason          text,
  actor_id        uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_user_idx ON credit_ledger(user_id, created_at DESC);
CREATE UNIQUE INDEX ledger_one_refund_per_upload
  ON credit_ledger(upload_id) WHERE kind = 'refund';

CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  actor_id    uuid REFERENCES users(id),
  action      text NOT NULL,
  target_type text NOT NULL,
  target_id   text NOT NULL,
  ip          inet,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 5.1. Decisiones del modelo

| Tema | Decisión | Motivo |
|---|---|---|
| Saldo | `credit_ledger` es la verdad; `users.credits` es caché | Auditoría y reconstrucción |
| Reembolso | Índice único parcial `(upload_id) WHERE kind='refund'` | Impide doble devolución a nivel de base |
| Slug | `UNIQUE` con `CHECK` de formato | Evita traversal y colisiones |
| Cotización | Se consume una sola vez (`consumed_at`) | Evita reutilizar precio viejo |
| Sesiones | Tabla con `token_hash` | Permite revocar y listar dispositivos |
| Auditoría | `jsonb` sin PII | Flexibilidad sin filtrar datos |
| Configuración | `settings` versionado | Cambiar tarifas sin redeploy, con historial |

### 5.2. Si se usa Prisma

El esquema equivalente viviría en `db/schema.prisma`; las migraciones se generarían con `prisma migrate`. Limitaciones a tener en cuenta: los índices parciales y los `CHECK` requieren SQL manual en la migración, y las transacciones interactivas deben mantener el mismo orden de bloqueo que la variante `pg`. **Prisma no está instalado hoy**: adoptarlo es una decisión nueva, no un hecho.

---

## 6. Lógica de dominio

### 6.1. Cotización

```
costo = techo(sizeBytes / 1_000_000) * ratePerMb * (1 + margin) + fixedFee
```

- Redondeo **hacia arriba** por MB para no subsidiar fracciones.
- `pricingVersion` identifica la tabla de tarifas usada; se guarda en `quotes` para auditar.
- El precio se calcula en el servidor; el cliente nunca lo envía.
- Si cambian las tarifas entre cotización y subida, vale la cotización firmada hasta su vencimiento.

### 6.2. Slugs

- Alfabeto base62 en minúsculas, longitud 10–16, generado con `nanoid` o `crypto.randomBytes`.
- Se reintenta ante colisión (probabilidad despreciable, pero el `UNIQUE` es la garantía).
- Nunca derivados del nombre del archivo, del email ni del `txid`.
- Validación estricta antes de consultar: `^[a-z0-9]{8,32}$`.

### 6.3. Máquina de estados

```
quoted ──► reserved ──► uploading ──► processing ──► confirmed
   │           │            │             │
   └─► expired └─► failed ◄─┘             └─► failed
                    │
                    └──► refunded
```

- Las transiciones se aplican con `UPDATE ... WHERE status = <esperado>` y se verifica `rowCount`; si es 0, otro proceso ganó y se responde `409`.
- `confirmed` solo se alcanza con `txid` no vacío y verificación de tamaño/hash.
- Un job de barrido marca `expired` las cotizaciones y subidas vencidas y dispara reembolsos pendientes. Su frecuencia es una decisión operativa.

### 6.4. Ledger

Toda mutación sigue el mismo patrón:

1. `BEGIN`
2. Bloquear la fila del usuario (`FOR UPDATE`).
3. Calcular `balance_after`.
4. Insertar el movimiento con `idempotency_key` única.
5. Actualizar la proyección.
6. `COMMIT`

Si la clave ya existe, se devuelve el movimiento previo (no se duplica). Un saldo negativo es un error de programación, no un caso de negocio: el `CHECK` lo impide.

---

## 7. Seguridad

| Control | Implementación prevista |
|---|---|
| Hash de contraseña | Argon2id (preferido) o bcrypt con costo adecuado; **no instalado** |
| Sesión | JWT firmado con `jose` + fila en `sessions`; cookie `httpOnly`/`Secure`/`SameSite` |
| CSRF | `SameSite=Lax` + verificación de `Origin` en mutaciones |
| Autorización | Guardas server-side por rol y por propiedad; nunca en el cliente |
| Validación | Esquemas estrictos; rechazo de campos desconocidos |
| SQL | Consultas parametrizadas; prohibido concatenar |
| XSS | Escape por defecto de React; CSP; `nosniff`; tipos activos siempre como descarga |
| SVG/HTML | No servir inline sin sanitizar; `Content-Disposition: attachment` |
| Path traversal | Validar slug con regex antes de cualquier consulta |
| Fuerza bruta | Rate limit por IP y por cuenta en login; retraso progresivo |
| Enumeración | Respuestas genéricas en login y registro |
| Cargas | Límite de bytes y de píxeles (`sharp.limitInputPixels`), timeout |
| SSRF | No aceptar URLs del usuario; solo archivos |
| Secretos | Wallet y `AUTH_SECRET` en gestor de secretos; nunca en repo ni logs |
| Logs | Sin tokens, contraseñas, emails completos ni cuerpos |
| Dependencias | Lockfile, versiones fijas, auditoría en CI |

### 7.1. Superficie de riesgo específica

- **Irreversibilidad:** un archivo ilegal o con datos personales no se puede eliminar. La mitigación es previa (moderación, términos, advertencia), no posterior.
- **Wallet operativa:** si se compromete, un atacante puede gastar el saldo. Debe tener permisos mínimos, rotación y alertas de saldo.
- **Bundler:** es una dependencia de confianza; su caída impide publicar, pero no borra lo publicado.
- **Gateway:** puede estar caído o censurar; el `txid` permite usar otro gateway.
- **Enlaces:** quien tenga el enlace accede. No hay autenticación de lectura; si se necesita, hay que diseñar claves por enlace (fuera del MVP).

---

## 8. Configuración y entornos

| Variable | Obligatoria | Propósito |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión PostgreSQL |
| `AUTH_SECRET` | Sí | Firma de tokens (≥32 bytes aleatorios) |
| `APP_URL` | Sí | Base para enlaces y QR |
| `STORAGE_PROVIDER` | Sí | `irys` \| `turbo` \| `arweave` |
| `STORAGE_WALLET_JWK` | Sí | Wallet operativa (gestor de secretos) |
| `STORAGE_NETWORK` | Sí | `mainnet` \| `devnet` |
| `ARWEAVE_GATEWAY` | Sí | Gateway de lectura |
| `PRICE_RATE_PER_MB`, `PRICE_MARGIN`, `PRICE_FIXED_FEE` | Sí | Tarifas |
| `MAX_UPLOAD_BYTES`, `QUOTE_TTL_SECONDS` | Sí | Límites |
| `ADMIN_EMAIL` | No | Semilla del primer admin |
| `LOG_LEVEL`, `LOG_DIR` | No | Observabilidad |

**Entornos:** `development` (Postgres local o PGlite, `devnet`, logs verbose), `test` (base efímera, sin red externa, bundler simulado), `production` (TLS, `mainnet`, logs estructurados, alertas). Ningún entorno comparte wallet ni base.

`.env.example` **no existe todavía**; debe crearse con valores vacíos y comentarios, nunca con secretos.

---

## 9. Despliegue

### 9.1. Objetivo

```
Internet → Proxy (TLS, límites) → Next.js (Node) → PostgreSQL
                                     └──────────→ Bundler / Gateway
```

- Next.js en modo `standalone` dentro de un contenedor.
- PostgreSQL gestionado o contenedor con volumen persistente; **nunca** expuesto a Internet.
- Migraciones como paso previo al arranque (job separado, no en el `entrypoint` de cada réplica).
- Healthcheck en `/api/health` (ruta ausente) que verifique proceso y conexión a base.
- Secretos inyectados por el orquestador; no en la imagen.

### 9.2. `Dockerfile` y `compose` (no incluidos)

El repositorio no tiene `Dockerfile` ni `docker-compose.yml`. Un diseño razonable: build multi-stage (`deps` → `build` → `runner`), usuario no root, `NODE_ENV=production`, y compose con `app`, `db` y un volumen para `db/`. La wallet **no** se monta como archivo en el contenedor de la app si se puede evitar.

### 9.3. Operación

| Tarea | Frecuencia | Nota |
|---|---|---|
| Respaldo de PostgreSQL | Diaria | Los bytes están en Arweave; los metadatos no |
| Verificación de restore | Mensual | Un respaldo no probado no es un respaldo |
| Alerta de saldo de wallet | Continua | Sin saldo no hay publicaciones |
| Barrido de vencidos | Cada pocos minutos | Dispara expiraciones y reembolsos |
| Rotación de logs | Diaria | Sin PII |
| Revisión de dependencias | Semanal | Lockfile y auditoría |
| Prueba de reembolso | Antes de cada release | Es el flujo que mueve dinero |

---

## 10. Observabilidad

- **Logs estructurados** (JSON): `requestId`, ruta, estado, duración, `userId` (ID, no email), código de error. Nunca tokens ni cuerpos.
- **Métricas mínimas:** subidas iniciadas/confirmadas/fallidas, latencia de quote y upload, saldo de wallet, errores por código.
- **Trazas:** una subida debe poder seguirse por `uploadId` desde el request hasta el `txid`.
- **Alertas:** fallo sostenido del bundler, saldo bajo, tasa de reembolsos anómala, 5xx por encima de umbral.

---

## 11. Pruebas

| Nivel | Qué cubrir | Herramienta (no instalada) |
|---|---|---|
| Unitario | Cotización, slugs, transiciones, ledger | Vitest o Jest |
| Integración | Route handlers contra Postgres efímero | Vitest + Testcontainers/PGlite |
| Contrato | Formas de request/response y códigos de error | Esquemas compartidos |
| E2E | Registro → cotización → subida simulada → ficha → descarga | Playwright |
| Seguridad | Autorización cruzada entre usuarios, CSRF, rate limit | Casos negativos explícitos |

**Casos imprescindibles:** doble reembolso (debe fallar el segundo), cotización vencida, saldo insuficiente, slug inválido, acceso a subida ajena, suspensión con sesión activa, y repetición con la misma `Idempotency-Key`.

---

## 12. Roadmap de implementación

| Fase | Entregable | Criterio de salida |
|---|---|---|
| 0 | Diseño (este documento) | Rutas, contratos y modelo acordados |
| 1 | `package.json`, TS, Next, lint, `.env.example`, layout, health | `npm run dev` sirve `/api/health` |
| 2 | Esquema y migraciones, seed, capa `db/` | Migración aplica en limpio y sobre base existente |
| 3 | Auth: registro, login, logout, `/api/me`, guardas | Tests de sesión y acceso denegado |
| 4 | Cotización y ledger | Saldo nunca negativo; doble gasto imposible |
| 5 | Subida con bundler en `devnet` | Archivo confirmado con `txid` verificable |
| 6 | Entrega: ficha, visor, descarga, QR, historial | Flujo completo de punta a punta |
| 7 | Admin: usuarios, créditos, reembolsos, auditoría | Reembolso idempotente probado |
| 8 | Endurecimiento y despliegue | OWASP ASVS revisado; TLS, backups y alertas |

Cada fase se considera "hecha" cuando compila, pasa su prueba principal, documenta sus errores y no introduce secretos.

---

## 13. Guía de extensión

### 13.1. Añadir un endpoint

1. Crear `app/api/<nombre>/route.ts` con `export async function GET/POST`.
2. Validar entrada con el esquema correspondiente.
3. Resolver sesión y autorización **antes** de tocar datos.
4. Delegar en `lib/`; no escribir SQL en el handler.
5. Devolver el contrato documentado y un código de error propio si aplica.
6. Añadir el caso a `docs/developer.md` y una prueba de integración.

### 13.2. Cambiar de bundler

`lib/storage/` debe exponer una interfaz mínima:

```ts
type PublishInput = { bytes: ReadableStream | Buffer; contentType: string; tags?: Record<string,string> };
type PublishResult = { txid: string; size: number };
interface StorageProvider {
  publish(input: PublishInput): Promise<PublishResult>;
  status(txid: string): Promise<'pending'|'confirmed'|'failed'>;
}
```

Implementar Irys y Turbo detrás de la misma interfaz permite comparar comisiones sin tocar el dominio. El `txid` es el único dato que sale del adaptador.

### 13.3. Añadir una capacidad

Toda capacidad nueva sigue el mismo recorrido: ruta → contrato → dominio → tabla/migración → prueba → documentación. Si toca créditos, **debe** pasar por el ledger; si toca contenido, **debe** declarar su irreversibilidad.

---

## 14. Decisiones registradas (resumen)

| ID | Decisión | Estado |
|---|---|---|
| D-01 | Bundler Irys como opción inicial | Recomendada, no validada |
| D-02 | `pg` como driver; Prisma como alternativa | Abierta |
| D-03 | Compra de créditos manual al inicio | Recomendada |
| D-04 | Subida presigned para archivos grandes | Recomendada; multipart en MVP |
| D-05 | Visor con lista blanca MIME | Recomendada |
| D-06 | Sesiones revocables en tabla | Recomendada |
| D-07 | Sin organizaciones ni borrado lógico en MVP | Recomendada |
| D-08 | Precio en créditos abstractos | Recomendada |

---

## 15. Riesgos y deuda conocida

1. **No hay código:** cualquier estimación de esfuerzo es especulativa.
2. **La wallet no está diseñada:** quién la custodia, cómo se rota y cómo se financia es una decisión pendiente.
3. **El precio del token es volátil:** el margen debe revisarse; una tarifa fija puede volverse inviable.
4. **La moderación no está definida:** sin ella, el servicio puede alojar contenido ilegal de forma permanente.
5. **El borrado es imposible:** los términos y la interfaz deben ser explícitos.
6. **La resolución del enlace depende del gateway:** se debe documentar un gateway alternativo.
7. **No hay pruebas ni CI:** el primer entregable debe incluir el pipeline mínimo.

---

*Documento de diseño. No describe un sistema en funcionamiento. Última revisión: 2026.*
