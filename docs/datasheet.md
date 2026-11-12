# Permaweb App — Ficha de producto (datasheet)

> **Estado: documento de diseño.** Describe el producto de referencia, no el estado del código. La implementación **PermaDrop** se materializó en esta carpeta durante la redacción (79 archivos, `package.json`, `db/schema.sql`, `app/`, `components/`, `lib/`); su estado verificado está en [`ESTADO-PROYECTO.md`](../ESTADO-PROYECTO.md). Donde el código y este documento difieran, prevalece el código. Todo lo marcado como "previsto" refleja la intención de diseño, no una garantía de implementación.

---

## 1. Ficha técnica

| Campo | Valor |
|---|---|
| **Nombre de trabajo** | Permaweb App (el repositorio no declara nombre comercial) |
| **Tipo** | Aplicación web de publicación y almacenamiento permanente de archivos |
| **Categoría** | Producto SaaS / utilidad web con capa de almacenamiento descentralizado |
| **Stack previsto** | Next.js (App Router) + TypeScript · PostgreSQL · Arweave vía bundler |
| **Plataforma** | Navegador web moderno; servidor Node.js; PostgreSQL |
| **Autenticación prevista** | Cuenta con email y contraseña, sesión en cookie `httpOnly`, roles `user`/`admin` |
| **Monetización prevista** | Créditos prepagos; cotización por archivo; reembolso automático de fallos |
| **Entrega** | Enlace corto `/f/<slug>`, visor `/v/<slug>`, QR descargable, historial |
| **Idioma de la interfaz** | Español (nombres de ruta y de tabla en inglés) |
| **Licencia** | MIT (ver `LICENSE`) |
| **Versión de producto** | No definida — fase de diseño, sin releases |
| **Madurez** | 0 % implementado; 100 % documentado a nivel de intención |

### 1.1. Qué significa "permaweb"

*Permaweb* es el nombre coloquial de la web construida sobre Arweave: una red donde el contenido se paga una vez y queda disponible de forma permanente, direccionado por un identificador de transacción (`txid`). A diferencia del almacenamiento en la nube tradicional —donde el proveedor puede borrar, mover o dejar de servir un archivo si se impaga la suscripción—, el contenido confirmado en Arweave no depende de que la aplicación siga viva.

La aplicación **no** implementa un protocolo nuevo: envuelve uno existente con una experiencia de usuario comprensible (cuenta, saldo, cotización, enlace, QR).

---

## 2. Problema y propuesta de valor

### 2.1. Problema

Publicar en Arweave directamente exige:

1. Crear y resguardar una wallet con una clave que, si se pierde, no se recupera.
2. Entender el costo por byte y la volatilidad del token con el que se paga.
3. Firmar transacciones o usar un bundler con su propia API.
4. Elegir un gateway y construir una URL que un destinatario no técnico pueda abrir.
5. Aceptar que **no hay borrado**: un error de publicación es definitivo.

Esa suma de barreras excluye a buena parte del público que más necesita permanencia verificable: estudios jurídicos pequeños, archivistas, fotógrafos, docentes, organizaciones sin área técnica.

### 2.2. Propuesta

Una capa de producto con cinco ideas:

| Idea | Efecto para el usuario |
|---|---|
| **Créditos** en lugar de criptomoneda | El precio es un número entero comprensible; la volatilidad la absorbe el operador |
| **Cotización previa y firmada** | El usuario sabe cuánto cuesta antes de subir; el precio no cambia a mitad del proceso |
| **Enlace corto + QR** | Se comparte e imprime sin explicar qué es un `txid` |
| **Historial y estados** | Se entiende qué se publicó, cuándo y si falló |
| **Reembolso de fallos** | Un error de red no cuesta créditos |

### 2.3. Lo que el producto no promete

- **No** promete anonimato: la cuenta es nominal y el contenido es público por diseño.
- **No** promete confidencialidad: cualquiera con el enlace —o con el `txid`— puede leer el archivo.
- **No** promete borrado, ni siquiera para el administrador.
- **No** promete disponibilidad de la aplicación: si el dominio cae, el contenido sigue en la red, pero la ficha y el QR dejan de resolverse.
- **No** promete velocidad de confirmación: depende del bundler y de la red.

---

## 3. Usuarios y roles

| Rol | Quién es | Puede | No puede |
|---|---|---|---|
| **Visitante** | Cualquier persona con el enlace o el QR | Ver ficha, visor, descargar y consultar tarifas | Subir, ver historial ajeno, administrar |
| **Usuario** | Cuenta registrada y activa | Cotizar, subir, ver su historial, descargar sus archivos, gestionar su sesión | Ver datos de otros usuarios, otorgarse créditos |
| **Administrador** | Operador del servicio | Ver usuarios y subidas, otorgar o ajustar créditos, suspender cuentas, reembolsar subidas fallidas, consultar auditoría | Borrar contenido de Arweave (imposible), leer contraseñas |
| **Operador de infraestructura** | Quien despliega y mantiene | Acceso a base de datos, logs, wallet y secretos | Saltarse la auditoría de la aplicación |
| **Bundler / red** | Servicio externo | Publicar y servir contenido | Garantizar que la aplicación esté en línea |

**Regla de autorización:** el rol se verifica **en el servidor** en cada route handler y en el layout de `/admin`. El cliente nunca decide permisos. La suspensión de una cuenta invalida el acceso en el request siguiente, sin esperar a que expire el token.

---

## 4. Capacidades previstas

Ninguna está implementada. La columna "Superficie" indica dónde viviría.

| # | Capacidad | Superficie prevista | Estado |
|---|---|---|---|
| C-01 | Registro e inicio de sesión | `app/api/auth/*`, páginas de login y registro (faltantes) | No implementado |
| C-02 | Perfil y saldo | `GET /api/me` | No implementado |
| C-03 | Cotización por archivo | `POST /api/quote` | No implementado |
| C-04 | Consulta de tarifas | `GET /api/quote` | No implementado |
| C-05 | Subida y publicación | `POST /api/upload` + bundler | No implementado |
| C-06 | Estado de subida | `GET /api/upload?id=` | No implementado |
| C-07 | Ficha pública | `/f/[slug]` | No implementado |
| C-08 | Visor en línea | `/v/[slug]` | No implementado |
| C-09 | Descarga | `GET /api/download/[slug]` | No implementado |
| C-10 | Código QR | `GET /api/qr/[slug]` | No implementado |
| C-11 | Historial personal | `/historial` | No implementado |
| C-12 | Administración de usuarios | `/admin/usuarios`, `/api/admin/users/*` | No implementado |
| C-13 | Administración de subidas y reembolsos | `/api/admin/uploads/*` | No implementado |
| C-14 | Auditoría de acciones | `audit_log` + consulta admin | No implementado |
| C-15 | Healthcheck | `GET /api/health` (ruta ausente) | No implementado |

---

## 5. Flujos de usuario

### 5.1. Publicar un archivo (previsto)

```
Entrar → Elegir archivo → Cotizar → Confirmar saldo → Subir → Esperar confirmación → Copiar enlace / descargar QR
```

| Paso | Lo que ve el usuario | Lo que ocurre en el servidor |
|---|---|---|
| 1 | Formulario de acceso | Verificación de credenciales, creación de sesión |
| 2 | Selector de archivo con nombre y tamaño | Nada todavía; validación de cliente |
| 3 | Precio en créditos y vencimiento | Cálculo con tarifa versionada; `quotes` en estado `quoted` |
| 4 | Saldo actual y saldo resultante | Verificación de saldo; error de negocio si falta |
| 5 | Barra de progreso | Débito transaccional, `uploads` en `uploading`, instrucciones de subida |
| 6 | "Publicando…" | Firma y envío al bundler; `processing` |
| 7 | Enlace, QR y botón de copiar | Verificación de `txid`, slug generado, `confirmed` |
| 8 | Fila en el historial | Lectura paginada de `uploads` del usuario |

**Puntos de fricción reconocidos:** la transferencia de bytes (paso 5) es la etapa más frágil; el tiempo de confirmación (paso 6) es variable y no se puede prometer. El diseño debe mostrar progreso real, no una barra falsa, y permitir cancelar antes de firmar.

### 5.2. Recuperar un archivo (previsto)

```
Abrir /f/<slug> o escanear QR → Ver ficha → Descargar o abrir visor → Gateway entrega los bytes
```

El visitante **no necesita cuenta**. La ficha muestra nombre, tipo, tamaño, fecha, hash, `txid` y un botón de descarga. El visor solo se habilita para tipos de una lista blanca (imagen, PDF, texto); el resto se fuerza a descarga con `Content-Disposition: attachment`.

### 5.3. Historial (previsto)

Lista paginada por cursor, filtros por estado y fecha, y acceso al detalle de cada subida. La consulta filtra **siempre** por el `user_id` de la sesión, nunca por un parámetro enviado por el cliente.

### 5.4. Administración (previsto)

| Tarea | Pantalla | Acción registrada |
|---|---|---|
| Buscar usuario | `/admin/usuarios` | — (lectura) |
| Ver detalle y movimientos | `/admin/usuarios/[id]` | — (lectura) |
| Otorgar o ajustar créditos | Detalle de usuario | `credit_ledger` + `audit_log` (motivo obligatorio) |
| Suspender o reactivar | Detalle de usuario | `audit_log` |
| Reembolsar subida fallida | Detalle de subida | `credit_ledger` + `audit_log` |

Toda acción sensible exige motivo, queda asociada a un actor y no se puede ejecutar dos veces por accidente.

---

## 6. Estados

### 6.1. Subida

| Estado | Significado | Entradas | Salidas |
|---|---|---|---|
| `quoted` | Precio calculado, aún sin compromiso | Cotización válida | `reserved`, `expired` |
| `reserved` | Créditos debitados, pendiente de bytes | Débito exitoso | `uploading`, `failed`, `refunded` |
| `uploading` | Recibiendo o esperando el archivo | Inicio aceptado | `processing`, `failed`, `expired` |
| `processing` | Enviado al bundler, esperando `txid` | Firma enviada | `confirmed`, `failed` |
| `confirmed` | `txid` verificado y slug publicado | Verificación OK | — (final) |
| `failed` | Error irrecuperable | Fallo de red, validación o bundler | `refunded` |
| `expired` | Se agotó el tiempo | TTL vencido | `refunded` |
| `refunded` | Créditos devueltos | Reembolso aplicado | — (final) |

**Invariantes:**

- Una subida en `confirmed` **no** vuelve atrás.
- Un reembolso se aplica **una sola vez** por subida (índice único `(upload_id, kind)` con `kind='refund'`).
- Ningún estado puede dejar el saldo negativo.
- `processing` no es un estado de éxito: el archivo puede fallar después de haberse enviado.

### 6.2. Cuenta

| Estado | Acceso | Efecto |
|---|---|---|
| `active` | Completo | Puede cotizar, subir y descargar |
| `suspended` | Bloqueado | Login rechazado y sesiones invalidadas en el siguiente request |

### 6.3. Visibilidad del contenido

| Valor previsto | Efecto en la app | Efecto en la red |
|---|---|---|
| `visible` | Ficha y descarga activas | Sin cambios: siempre accesible por `txid` |
| `hidden` | Ficha devuelve 404; el índice deja de listarlo | **Sin cambios**: el contenido sigue público |

> Ocultar es una decisión editorial y legal, no técnica. No debe presentarse al usuario como "borrar".

---

## 7. Límites y parámetros

**Ningún valor está definido.** La tabla fija qué debe decidirse antes de implementar; los números son responsabilidad del operador.

| Parámetro | Estado | Nota |
|---|---|---|
| Tamaño máximo por archivo | Sin definir | Debe acotarse por memoria del runtime y tiempo de request |
| Tipos permitidos | Sin definir | Lista blanca; validar por *magic bytes*, no por extensión |
| TTL de cotización | Sin definir | Suficiente para subir; corto para limitar exposición |
| Tarifa por MB | Sin definir | Costo del bundler + margen |
| Cargo fijo | Sin definir | Evita subsidiar archivos de pocos bytes |
| Créditos iniciales | Sin definir | ¿Bonus de bienvenida? Decisión de negocio |
| Límite de tasa | Sin definir | Por IP y por usuario, en login y en subida |
| Retención de logs | Sin definir | Requisito legal y costo de disco |
| Retención de metadatos | Sin definir | El contenido es permanente; los metadatos no tienen por qué serlo |

### 7.1. Límites duros del enfoque

- **No hay borrado.** Es una propiedad de Arweave, no una restricción de la app.
- **No hay corrección.** Si se publica un archivo equivocado, se publica otro y se oculta el anterior; el anterior sigue existiendo.
- **No hay control de acceso al contenido.** El enlace es la única protección; quien lo tenga, entra.
- **No hay garantía de resolución del enlace.** Depende del gateway y del dominio de la aplicación.
- **No hay cumplimiento de "derecho al olvido"** sobre el contenido on-chain.

---

## 8. Requisitos

### 8.1. Para el usuario

| Requisito | Detalle |
|---|---|
| Navegador | Versión moderna con soporte de ES2020, `fetch` y `crypto.subtle` |
| JavaScript | Necesario para la subida y el visor (el HTML inicial es server-rendered) |
| Cuenta | Email válido y contraseña |
| Conectividad | HTTPS; el QR requiere un dominio público o una IP accesible en la red local |

### 8.2. Para el operador

| Componente | Versión prevista | Estado |
|---|---|---|
| Node.js | 20 LTS o superior | No declarada en el repo |
| PostgreSQL | 15/16 | Previsto; no hay esquema |
| Bundler | Irys o Turbo | Decisión abierta |
| Wallet | Con saldo en AR | No incluida (correcto) |
| Proxy inverso | Caddy o Nginx con TLS | Previsto |
| Contenedores | Docker / Compose | No incluidos |

### 8.3. Dependencias del proyecto

No existe `requirements.txt` porque este no es un proyecto Python. El manifiesto equivalente —`package.json`— **tampoco existe**: es el primer entregable pendiente. Los nombres de 85 carpetas vacías en `node_modules/` sugieren el stack, pero no constituyen una instalación.

Puesta en marcha **objetivo** (hoy falla en el primer paso):

```bash
npm install                     # requiere package.json (no existe)
cp .env.example .env.local      # .env.example no existe
npx prisma migrate dev          # o psql "$DATABASE_URL" -f db/migrations/0001_init.sql
npm run dev                     # http://localhost:3000
```

---

## 9. Datos y privacidad

| Dato | Dónde | Sensibilidad | Nota |
|---|---|---|---|
| Email | PostgreSQL | Personal | Necesario para login y contacto |
| Hash de contraseña | PostgreSQL | Crítico | Argon2id o bcrypt; nunca reversible |
| Contenido del archivo | Arweave | **Público y permanente** | No apto para datos personales sensibles |
| Nombre del archivo | PostgreSQL y metadatos on-chain | Potencialmente identificatorio | Puede revelar información; advertir al usuario |
| `txid`, `slug` | PostgreSQL | Público | El `slug` es la única barrera de oscuridad |
| IP y user-agent | `sessions`, `audit_log`, logs | Personal | Reducir retención; no volcar a logs de aplicación |
| Movimientos de crédito | `credit_ledger` | Financiero | Append-only; no se edita, se compensa |

**Principios:** minimización (no pedir más de lo necesario), no registrar cuerpos de archivos ni tokens, y separar metadatos de contenido. El contenido publicado es, por definición, divulgación: la interfaz debe avisarlo **antes** de confirmar.

---

## 10. Disponibilidad y soporte

| Aspecto | Compromiso |
|---|---|
| SLA | **Ninguno.** No hay servicio en producción. |
| Soporte | No definido. Se prevé un canal de contacto y una página de estado, ninguno implementado. |
| Ventana de mantenimiento | No aplica todavía |
| Respaldos | PostgreSQL sí (metadatos); Arweave no requiere respaldo propio |
| Recuperación ante desastre | Reconstruir la app y restaurar la base; el contenido on-chain persiste |
| Estado del servicio | Sin `GET /api/health` (ruta ausente) |

---

## 11. Glosario

| Término | Definición |
|---|---|
| **Arweave** | Red de almacenamiento permanente; el contenido se paga una vez y se direcciona por `txid` |
| **Bundler** | Servicio que agrupa y financia transacciones para que el usuario no necesite wallet propia (Irys, Turbo) |
| **Txid** | Identificador de una transacción en Arweave; direcciona el contenido de forma permanente |
| **Gateway** | Servicio HTTP que sirve el contenido de Arweave por `https://<gateway>/<txid>` |
| **Permaweb** | Nombre coloquial de la web servida sobre Arweave |
| **Slug** | Identificador corto y opaco usado en `/f/<slug>`; no revela el `txid` |
| **Crédito** | Unidad interna de saldo; se debita al subir y se reembolsa si falla |
| **Ledger** | Registro append-only de movimientos de crédito; fuente de verdad del saldo |
| **Cotización** | Precio calculado para un archivo concreto, firmado y con vencimiento |
| **Idempotencia** | Propiedad por la cual repetir una operación no duplica su efecto |

---

## 12. Anexo: trazabilidad ruta → capacidad

| Ruta del scaffold | Capacidad | Documento relacionado |
|---|---|---|
| `app/api/quote` | C-03, C-04 | `developer.md` §4.2 |
| `app/api/upload` | C-05, C-06 | `developer.md` §4.3 |
| `app/api/download/[slug]` | C-09 | `developer.md` §4.4 |
| `app/api/qr/[slug]` | C-10 | `developer.md` §4.5 |
| `app/api/me` | C-02 | `developer.md` §4.1 |
| `app/api/auth/*` | C-01 | `developer.md` §4.1 |
| `app/api/admin/uploads/*` | C-13 | `developer.md` §4.6 |
| `app/api/admin/users/*` | C-12 | `developer.md` §4.6 |
| `app/f/[slug]` | C-07 | Este documento §5.2 |
| `app/v/[slug]` | C-08 | Este documento §5.2 |
| `app/historial` | C-11 | Este documento §5.3 |
| `app/admin/usuarios/*` | C-12 | Este documento §5.4 |

---

*Documento de diseño. No describe un sistema en funcionamiento. Última revisión: 2026.*
