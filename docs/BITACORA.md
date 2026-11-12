# Bitácora de documentación

Registro de lo encontrado, lo decidido y lo descartado al documentar **Permaweb App**. Sirve para que un futuro implementador no repita el análisis ni reintente caminos que ya se descartaron.

**Fecha:** 2026 · **Alcance:** documentación de un scaffold sin código · **Autor:** wanderc137

---

## 1. Método

1. Inventario de archivos y directorios, incluidos ocultos, excluyendo `node_modules`.
2. Inventario interno de `node_modules` para reconstruir el stack a partir de nombres de paquetes.
3. Lectura de proyectos hermanos del mismo autor para inferir convenciones (sin copiar contenido).
4. Redacción de README, datasheet, developer, referencias y diagramas.
5. Verificación de tamaños, enlaces internos y validez XML de los SVG.

### Comandos usados

```bash
find . -path ./node_modules -prune -o -type f -print        # 0 archivos
find node_modules -type f | wc -l                           # 0 archivos
find node_modules -mindepth 1 -maxdepth 1 -type d | wc -l   # 85 paquetes
ls -la                                                      # sin package.json ni git
```

---

## 2. Hallazgos

### 2.1. El repositorio está vacío de código

| Elemento | Estado |
|---|---|
| Archivos de código | 0 |
| `package.json` / lockfile | Ausentes |
| `tsconfig.json` / `next.config.*` | Ausentes |
| Esquema o migraciones | Ausentes |
| `.env.example` | Ausente |
| `Dockerfile` / `compose` | Ausentes |
| Pruebas | Ausentes |
| Git | No inicializado |

La estructura de carpetas es real y coherente con una aplicación Next.js App Router, pero **no hay una sola línea de implementación**. Cualquier afirmación sobre comportamiento sería inventada.

### 2.2. `node_modules` es una pista, no una instalación

85 paquetes, todos directorios vacíos, con su árbol interno replicado. Los nombres permiten inferir el stack:

- **Next.js + React + TypeScript** — `next`, `react`, `react-dom`, `typescript`, `@types/*`, `@next/*`, `@swc/*`.
- **PostgreSQL con `pg`** — `pg`, `pg-pool`, `pg-protocol`, `pg-types`, `@types/pg`; **sin** `prisma` ni `@prisma/client`.
- **Postgres embebido** — `@electric-sql/pglite` y extensiones (`pg_uuidv7`, `pg_hashids`, `pgvector`, `pgtap`).
- **Arweave** — `arweave`, `arconnect`, `@ardrive/*`, `@noble/*`, `@scure/*`, `@ethersproject/*`.
- **Utilidades** — `jose`, `qrcode`, `pngjs`, `sharp`, `nanoid`, `dotenv`, `p-limit`.
- **Posible cripto** — `@solana/*` (sin rutas que lo confirmen).

### 2.3. Ausencias significativas

No hay `zod`, `bcryptjs`, `argon2`, `tailwindcss`, `eslint`, `vitest`, `jest` ni `playwright`. Esto implica que validación, hash de contraseñas, estilos y pruebas **no estaban decididos** al crear el scaffold, aunque el diseño los necesite.

### 2.4. Rutas que el diseño necesita y no existen

`app/layout.tsx`, `app/page.tsx`, `app/login`, `app/registro`, `app/api/health`, `app/api/upload/[id]`, `app/api/admin/audit`, `app/api/admin/settings`, `app/not-found.tsx`, `app/error.tsx`, `db/migrations/`, `public/`, `middleware.ts`.

---

## 3. Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| B-01 | Documentar sin crear código | El encargo es documental; crear un esqueleto sin manifiesto daría falsa impresión de avance |
| B-02 | Declarar el estado "scaffold/diseño" en la primera pantalla del README | Evitar que un lector suponga que la app funciona |
| B-03 | Inferir el stack solo desde nombres de paquetes y marcar la confianza | Honestidad epistémica: un nombre no es una dependencia instalada |
| B-04 | Tratar `pg` como driver principal y Prisma como alternativa | `pg` está en el scaffold; Prisma no |
| B-05 | Mantener `/f` = ficha y `/v` = visor como hipótesis explícita | El scaffold no documenta la diferencia; se marca como decisión abierta |
| B-06 | No afirmar que existe pasarela de pago | `@solana` es un indicio, no una ruta ni un flujo |
| B-07 | No crear `docs/index.html` | Lo genera el orquestador; duplicarlo causaría conflicto |
| B-08 | No inventar límites numéricos ni SLA | No hay base para elegirlos; se documenta el procedimiento |
| B-09 | Usar diagramas SVG escritos a mano | Sin dependencias, versionables, accesibles y editables |
| B-10 | Añadir `README(*).md` al `.gitignore` | Evitar commitear duplicados generados por sincronización |

### 3.1. Decisiones de arquitectura documentadas

- **Monolito modular** sobre App Router: el tamaño esperado no justifica microservicios.
- **Server-first**: las páginas leen en el servidor; el cliente solo para interacción.
- **Ledger como fuente de verdad** del saldo, con proyección en `users.credits`.
- **Cotización firmada con TTL** para que el precio no cambie a mitad de la subida.
- **Slug opaco** de 10–16 caracteres, separado del `txid`.
- **Reembolso único** garantizado por índice parcial en la base, no solo por código.
- **Descarga por redirect al gateway** por defecto; stream solo si se pide adjunto.

---

## 4. Enfoques descartados

| Enfoque | Por qué se descartó |
|---|---|
| Crear `package.json`, `tsconfig` y un "hola mundo" | Fuera de alcance y generaría la ilusión de un proyecto ejecutable |
| Rellenar `node_modules` con paquetes reales | Prohibido instalar; además ocultaría que el scaffold está vacío |
| Documentar Prisma como si estuviera instalado | No está; induciría a error al implementar |
| Describir métricas, benchmarks o tiempos de respuesta | No hay código que medir; serían cifras inventadas |
| Copiar el README de un proyecto hermano | El producto y el estado son distintos; habría afirmaciones falsas |
| Generar diagramas raster con una herramienta externa | Los SVG son editables, ligeros y no requieren dependencias |
| Incluir una sección de "instalación" con `pip`/`requirements.txt` | Es un proyecto Node; no existe `requirements.txt` |
| Crear `docs/index.html` | El orquestador lo genera; se evita duplicar |
| Suponer que `/api/upload` recibe multipart | La evidencia no lo dice; se documentan ambas variantes |
| Suponer que `@solana` implica pagos en producción | Es un paquete vacío; se marca como confianza baja |

---

## 5. Incidente de sincronización (MEGA)

Durante la redacción, el cliente de sincronización renombró el `README.md` a `README(1).md` y luego a `README(1)(1).md`. Ocurrió tras varias escrituras y renombrados rápidos sobre el mismo archivo.

**Diagnóstico:** el archivo se escribía en `/tmp`, se movía al proyecto y se volvía a editar; MEGA interpretó los cambios como conflicto y aplicó su política de renombrado.

**Mitigación aplicada:**

1. Trabajar el contenido en `/tmp/opencode/pw/` y copiarlo **una sola vez** al proyecto.
2. No volver a editar el README después de la copia final.
3. Añadir `README(*).md` y `* (1).*` al `.gitignore`.
4. Verificar el nombre del archivo después de unos segundos.
5. Borrar los duplicados `README(1)(1).md` y `ZZZ_TEST.md`.

**Lección:** en carpetas sincronizadas, escribir una vez y verificar; los editores que guardan muchas veces pueden disparar duplicados.

---

## 6. Verificación realizada

| Comprobación | Resultado |
|---|---|
| README dentro de 20.000–30.000 caracteres | Sí (29.924) |
| README declara el estado de scaffold | Sí, en advertencia inicial y §1 |
| Rutas del scaffold documentadas | Sí, §6 y datasheet §12 |
| Contratos de API previstos | Sí, developer §4 |
| Modelo de datos propuesto | Sí, developer §5 (DDL) |
| 3 SVG originales y válidos | Sí; parseo XML correcto |
| `LICENSE` MIT con titular | Sí |
| `.gitignore` con secretos y artefactos | Sí |
| `requirements.txt` referenciado | No aplica: no existe; se explica el equivalente Node |
| `docs/index.html` creado | No, por indicación expresa |

---

## 7. Lecciones para proyectos futuros

1. **Un scaffold no es un proyecto.** Antes de documentar, contar archivos: si son cero, el documento debe decirlo en la primera línea.
2. **Los nombres de paquetes son evidencia débil.** Sirven para inferir intención, no para afirmar versiones ni funcionamiento.
3. **Separar "previsto" de "existente"** con una convención visual (tablas de estado, negritas, advertencias) evita promesas falsas.
4. **Documentar las decisiones abiertas** es más útil que inventar una respuesta: el implementador sabe qué debe decidir.
5. **Los invariantes de dinero merecen índices en la base**, no solo validaciones en código.
6. **La permanencia es un requisito de producto, no solo técnico:** obliga a moderación previa, términos claros y advertencia explícita.
7. **En carpetas sincronizadas, una escritura final y verificación posterior** ahorra duplicados y confusión.
8. **Los SVG a mano** son suficientes para arquitectura, flujos y modelo de datos; no hace falta una herramienta de diagramado.

---

## 8. Pendientes al cierre

- Implementar el vertical completo (ver roadmap en `developer.md` §12).
- Decidir bundler, ORM, compra de créditos y política de moderación.
- Crear `package.json`, `.env.example`, esquema y migraciones.
- Definir límites numéricos y tarifas con datos reales del proveedor.
- Diseñar el flujo de custodia y rotación de la wallet.
- Añadir pruebas y CI antes de la primera publicación.

---

*Bitácora de diseño. No certifica funcionalidad alguna.*
