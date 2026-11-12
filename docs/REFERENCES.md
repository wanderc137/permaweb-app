# Referencias oficiales

Enlaces primarios para implementar y mantener Permaweb App. Se prefieren documentación oficial y especificaciones sobre blogs o tutoriales. Las URLs se verificaron al redactar este documento (2026); pueden cambiar de estructura con el tiempo.

> **Nota:** ninguna de estas herramientas está instalada ni declarada en el repositorio. Son referencias de diseño, no dependencias activas.

---

## 1. Framework y lenguaje

| Recurso | Enlace | Para qué se usa |
|---|---|---|
| Next.js — documentación | <https://nextjs.org/docs> | App Router, Server Components, Route Handlers |
| Next.js — App Router | <https://nextjs.org/docs/app> | Estructura `app/`, layouts, segmentos dinámicos |
| Next.js — Route Handlers | <https://nextjs.org/docs/app/building-your-application/routing/route-handlers> | Contratos de `/api/*` |
| Next.js — despliegue | <https://nextjs.org/docs/app/building-your-application/deploying> | Build, `standalone`, contenedores |
| React — documentación | <https://react.dev/> | Componentes, estado, efectos |
| TypeScript — handbook | <https://www.typescriptlang.org/docs/handbook/intro.html> | Tipos, `strict`, módulos |
| TypeScript — `tsconfig` | <https://www.typescriptlang.org/tsconfig> | Opciones del compilador |
| Node.js — documentación | <https://nodejs.org/docs/latest-v20.x/api/> | Runtime del servidor |
| MDN Web Docs | <https://developer.mozilla.org/> | Web APIs, HTTP, cookies, streams |

---

## 2. Almacenamiento permanente

| Recurso | Enlace | Para qué se usa |
|---|---|---|
| Arweave — sitio oficial | <https://www.arweave.org/> | Descripción del protocolo y la permaweb |
| Arweave — documentación | <https://docs.arweave.org/developers/> | Transacciones, tags, `txid` |
| Arweave — especificación de transacciones | <https://github.com/ArweaveTeam/arweave-standards> | Formatos y estándares comunitarios |
| Arweave — gateways | <https://arweave.net/> | Resolución HTTP de contenido |
| Irys — documentación | <https://docs.irys.xyz/> | Bundler, financiación, API de subida |
| Irys — SDK | <https://docs.irys.xyz/developer-docs/irys-sdk> | Integración desde TypeScript |
| Turbo (ArDrive) | <https://turbo.ardrive.io/> | Alternativa de bundler con financiación |
| ArDrive — documentación | <https://docs.ardrive.io/> | SDK, almacenamiento y buenas prácticas |
| ArConnect | <https://docs.arconnect.io/> | Wallet en el navegador (no requerida para el MVP) |
| `arweave` (npm) | <https://www.npmjs.com/package/arweave> | Cliente JS de transacciones |

**Conceptos clave a revisar antes de implementar:** costo por byte, tags de transacción, confirmaciones, tamaño máximo por transacción, y diferencia entre publicar directo y publicar mediante bundler.

---

## 3. Datos

| Recurso | Enlace | Para qué se usa |
|---|---|---|
| PostgreSQL — documentación | <https://www.postgresql.org/docs/> | SQL, tipos, índices, transacciones |
| PostgreSQL — `citext` | <https://www.postgresql.org/docs/current/citext.html> | Emails sin distinción de mayúsculas |
| PostgreSQL — `pgcrypto` | <https://www.postgresql.org/docs/current/pgcrypto.html> | `gen_random_uuid()` |
| PostgreSQL — índices parciales | <https://www.postgresql.org/docs/current/indexes-partial.html> | Reembolso único por subida |
| PostgreSQL — bloqueo explícito | <https://www.postgresql.org/docs/current/explicit-locking.html> | `SELECT ... FOR UPDATE` en el ledger |
| node-postgres | <https://node-postgres.com/> | Pool, consultas parametrizadas, transacciones |
| `pg` (npm) | <https://www.npmjs.com/package/pg> | Driver |
| PGlite | <https://pglite.dev/> | Postgres embebido para desarrollo y pruebas |
| Prisma — documentación | <https://www.prisma.io/docs> | Alternativa de ORM (no instalada) |
| Prisma — migraciones | <https://www.prisma.io/docs/orm/prisma-migrate> | Flujo de esquema y migraciones |

---

## 4. Autenticación y seguridad

| Recurso | Enlace | Para qué se usa |
|---|---|---|
| OWASP Top 10 | <https://owasp.org/www-project-top-ten/> | Riesgos base de la aplicación |
| OWASP ASVS | <https://owasp.org/www-project-application-security-verification-standard/> | Verificación de requisitos |
| OWASP Cheat Sheet Series | <https://cheatsheetseries.owasp.org/> | Recetas concretas por tema |
| OWASP — Password Storage | <https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html> | Argon2id, bcrypt, parámetros |
| OWASP — Session Management | <https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html> | Cookies y revocación |
| OWASP — CSRF | <https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html> | `SameSite`, `Origin` |
| OWASP — File Upload | <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html> | Validación de tipos y tamaños |
| OWASP — XSS | <https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html> | Escape y CSP |
| `jose` | <https://github.com/panva/jose> | Firma y verificación de JWT |
| RFC 7519 — JWT | <https://www.rfc-editor.org/rfc/rfc7519> | Especificación del token |
| RFC 6265 — Cookies | <https://www.rfc-editor.org/rfc/rfc6265> | Atributos de cookie |
| `nanoid` | <https://github.com/ai/nanoid> | Generación de slugs |

---

## 5. QR e imágenes

| Recurso | Enlace | Para qué se usa |
|---|---|---|
| `qrcode` (npm) | <https://www.npmjs.com/package/qrcode> | Generación de PNG y SVG |
| `qrcode` — repositorio | <https://github.com/soldair/node-qrcode> | Opciones, niveles de corrección |
| `pngjs` | <https://github.com/pngjs/pngjs> | Procesamiento PNG si se compone la imagen |
| `sharp` | <https://sharp.pixelplumbing.com/> | Miniaturas y límites de píxeles |
| ISO/IEC 18004 | <https://www.iso.org/standard/62021.html> | Especificación del código QR (referencia normativa) |

---

## 6. Infraestructura y operación

| Recurso | Enlace | Para qué se usa |
|---|---|---|
| Docker — documentación | <https://docs.docker.com/> | Imágenes y contenedores |
| Docker — multi-stage builds | <https://docs.docker.com/build/building/multi-stage/> | Build de producción |
| Docker Compose | <https://docs.docker.com/compose/> | App + base local |
| Caddy — documentación | <https://caddyserver.com/docs/> | Proxy con TLS automático |
| Nginx — documentación | <https://nginx.org/en/docs/> | Alternativa de proxy |
| PostgreSQL — respaldo | <https://www.postgresql.org/docs/current/backup.html> | Estrategia de backups |

---

## 7. Cómo usar estas referencias

1. **Antes de implementar:** leer la sección correspondiente de la documentación oficial, no solo ejemplos de terceros.
2. **Al fijar versiones:** consultar las notas de release y el soporte LTS; no copiar versiones de tutoriales.
3. **Al integrar el bundler:** confirmar comisiones y límites vigentes en su documentación; cambian con el tiempo.
4. **Al revisar seguridad:** usar ASVS como checklist y los cheat sheets como guía de implementación.
5. **Al documentar una decisión:** enlazar aquí la fuente que la sustenta.

---

*Referencias de diseño. Ninguna librería listada está instalada en el repositorio.*
