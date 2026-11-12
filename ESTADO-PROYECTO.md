# PermaDrop — estado del proyecto

**Actualizado:** 5 de noviembre de 2026  
**Ubicación:** `/home/jma/Documents/Proyect/permaweb-app`  
**Estado:** compilación de producción funcional y pruebas de integración superadas.

## Alcance actual

Aplicación Next.js 16 + React 19 + Postgres para publicar archivos permanentes con etiqueta única,
precio previo en CLP, saldo por cuenta, historial, visor, descarga y QR. La interfaz pública no
muestra el proveedor de infraestructura, la credencial de firma ni el identificador interno de la
transacción.

## Funciones terminadas

- Registro, acceso y cierre de sesión.
- Sesiones opacas con hash en DB, revocables, 12 h absolutas y 30 min de inactividad.
- La primera cuenta histórica es administradora; actualmente `demo@example.com` tiene ese rol.
- Las cuentas nuevas empiezan sin saldo (`SIGNUP_CREDITS_CLP=0`).
- Cotización firmada por usuario/tamaño/importe, válida durante 5 minutos.
- Reserva transaccional de saldo y etiqueta antes de publicar.
- Devolución automática solo tras un fallo definitivo; resultado ambiguo conserva seguimiento.
- Resolución administrativa idempotente de publicaciones huérfanas.
- Historial propio con estados `publishing`, `pending`, `confirmed`, `failed` y refresco automático.
- Consulta pública `/f/<etiqueta>`, descarga y apertura bajo el dominio propio.
- Vista integrada de texto, PDF, imágenes, vídeo y audio; rangos para contenido multimedia.
- QR PNG por publicación correcta, en la ficha y en el resultado de subida.
- Panel `/admin`: métricas, usuarios, saldo, archivos, actividad, libro mayor y suspensión.
- Expediente `/admin/usuarios/<uuid>` con abono/descuento idempotente y revisión de publicaciones.
- Estética responsive en grafito, marfil y latón, sin pasteles.

## Seguridad aplicada

- scrypt reforzado con sal aleatorio y comparación de tiempo constante; compatible con hashes
  anteriores. Las contraseñas nuevas exigen 12 caracteres, letras y números.
- Cookie `HttpOnly`, `SameSite=Strict`, `Secure` con HTTPS y sesión guardada solo como hash.
- Rol, suspensión e inactividad comprobados en el servidor, no solo ocultando enlaces.
- Validación de `Origin` en mutaciones y cuerpos JSON con forma/tipos comprobados.
- Lectura de cuerpos con límite real de bytes, no solo `Content-Length`.
- Límites de frecuencia en acceso, registro, cotización, publicación, administración y contenido.
- Consultas SQL parametrizadas, UUID validados y React sin HTML inyectado.
- CSP, anti-framing, `nosniff`, COOP, permisos restringidos, referencia nula y HSTS en producción.
- Respuestas privadas `no-store`; contenido pendiente nunca se cachea como definitivo.
- Auditoría con huella HMAC de IP, sin guardar la IP en claro.
- Idempotencia en ajustes administrativos y resolución de devoluciones.
- Credenciales, entornos, bases, logs y wallets excluidos por `.gitignore`.

## Archivos principales

- `db/schema.sql`: tablas, migraciones idempotentes, índices y restricciones.
- `lib/auth.ts`: contraseñas y sesiones.
- `lib/security.ts`: origen, límites, lectura segura, URL canónica y utilidades.
- `lib/quote.ts`: cotizaciones firmadas y caducidad.
- `lib/activity.ts`: auditoría.
- `app/api/upload/route.ts`: cotización, reserva, publicación y devolución.
- `components/Uploader.tsx`: precio previo, progreso, saldo y QR.
- `components/FilePreview.tsx`: visor seguro por MIME.
- `components/IdleLogout.tsx`: complemento de cierre por inactividad.
- `app/admin`: consola y expedientes.
- `app/premium.css`: sistema visual y responsive.

## Operación

```bash
cd /home/jma/Documents/Proyect/permaweb-app
./start.sh
# http://localhost:3000
./stop.sh
```

Desarrollo manual:

```bash
npm run dev:db
npm run db:init
npm run dev
```

Administración y saldo por CLI:

```bash
npm run admin -- usuario@email.com
npm run grant -- usuario@email.com 30000
```

## Verificación realizada

- `npm run typecheck`: correcto.
- `npm run db:init`: migración aplicada conservando usuarios, saldos y archivos.
- `npm run build`: correcto; todas las rutas nuevas incluidas.
- Login, JSON inválido, validación de origen y rol admin: correcto.
- Registro con saldo cero: correcto.
- Abono repetido con el mismo `operationId`: un solo movimiento y saldo restaurado.
- Suspensión: sesión revocada y reingreso bloqueado; rehabilitación posterior correcta.
- Expiración de inactividad forzada a 31 minutos: `401` y nueva autenticación correcta.
- Ficha, visor de texto, QR PNG 360×360 y contenido: `200`.
- Rango simple: `206`; rango múltiple: `400`.
- Cotización inválida al subir: `409`, sin publicación ni débito.
- Resolución huérfana repetida: una sola devolución.
- Las páginas HTML y respuestas de cotización no contienen el nombre del proveedor interno.

Las pruebas finales no publicaron archivos nuevos para evitar costes reales. Los archivos históricos
confirmados se utilizaron para verificar ficha, contenido y QR. Los usuarios y registros sintéticos
de prueba se eliminaron.

## Antes de exponer a Internet

1. HTTPS real, `APP_URL` canónica y proxy con límites de cuerpo/conexión.
2. `TRUST_PROXY=1` solo si el proxy sobrescribe correctamente las cabeceras de IP.
3. Rate limit distribuido (Redis o equivalente) si hay más de una instancia.
4. Gestor de secretos y credencial de publicación dedicada con saldo limitado.
5. Copias, alertas para `CRITICAL`, revisión independiente y pruebas de penetración.
6. Verificación de email o invitaciones si se abre el registro; el bono inicial está desactivado.
7. Moderación/antimalware y textos legales. Una etiqueta es pública, no un permiso de acceso.

No prometer invulnerabilidad. La etiqueta permite consultar contenido público; suspender una cuenta
impide nuevas operaciones, pero no retira publicaciones permanentes ya confirmadas.
