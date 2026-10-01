# landing-template

Fábrica de landings de una sola página con **Astro + Tailwind v4 + Keystatic** y un equipo de subagentes de Claude Code (estratega, diseñador, programador y QA).

La idea: tú escribes un **brief** del cliente, los agentes **ensamblan bloques ya existentes** (no escriben código libre) y el resultado es una web estática que el cliente puede editar después desde un CMS en `/keystatic`.

---

## Índice

1. [Cómo está montado (visión general)](#1-cómo-está-montado-visión-general)
2. [Puesta en marcha](#2-puesta-en-marcha)
3. [Crear una landing paso a paso](#3-crear-una-landing-paso-a-paso)
4. [Orquestación de agentes](#4-orquestación-de-agentes)
5. [Dónde se crea la landing (y cómo se pinta)](#5-dónde-se-crea-la-landing-y-cómo-se-pinta)
6. [Cómo funciona Keystatic por detrás](#6-cómo-funciona-keystatic-por-detrás)
7. [Publicar con CMS para el cliente](#7-publicar-con-cms-para-el-cliente)
8. [Calidad y validación](#8-calidad-y-validación)
9. [Mapa de ficheros](#9-mapa-de-ficheros)
10. [Ampliar la fábrica](#10-ampliar-la-fábrica)

---

## 1. Cómo está montado (visión general)

```
 brief del cliente                       contrato (block-spec.json)
 briefs/<cliente>.md                     bloques, campos, límites
        │                                         │
        ▼                                         ▼
 ┌─────────────┐  build/content.json  ┌─────────────┐  build/design-spec.json
 │  estratega  │ ───────────────────▶ │  disenador  │ ─────────────┐
 └─────────────┘                      └─────────────┘              │
                                                                   ▼
                                   src/content/landing/index.json  ┌─────────────┐
                    ┌────────────────────────────────────────────── │ programador │
                    │                                               └─────────────┘
                    ▼                                                      ▲
     Astro lee el JSON en build ──▶ dist/index.html (HTML estático)        │ FAIL (máx. 3)
                    │                                               ┌─────────────┐
                    └──────────────────────────────────────────────▶│     qa      │ → build/qa-report.md
                                                                    └─────────────┘
     Después: el cliente edita ese mismo index.json desde /keystatic
```

Tres piezas que conviene tener claras:

| Pieza | Qué es | Fichero clave |
|---|---|---|
| **Contenido** | Todo el texto, tema, color e imágenes de la landing. Un único JSON. | `src/content/landing/index.json` |
| **Plantilla** | Componentes Astro (uno por bloque) + tokens de diseño. Los agentes no la tocan. | `src/components/blocks/*.astro`, `src/styles/tokens.css` |
| **Contrato** | Qué bloques existen, qué campos tienen y sus límites. Lo usan agentes, validador y (a mano) el CMS. | `src/lib/block-spec.json` |

---

## 2. Puesta en marcha

Requisitos: Node (versión LTS actual) y [Claude Code](https://claude.com/claude-code) si vas a usar los agentes.

```bash
npm install
npm run dev          # web en http://localhost:4321 · CMS en http://localhost:4321/keystatic
```

El repo trae una landing de ejemplo (clínica dental ficticia) para que veas algo nada más arrancar.

---

## 3. Crear una landing paso a paso

### Opción recomendada: un proyecto por cliente

Esta carpeta es la **plantilla**. Cada cliente debería tener su copia (su repo, su despliegue, su CMS):

```bash
scripts/nuevo-cliente.sh dentista-sonrisa      # crea ../clientes/dentista-sonrisa con git init
cd ../clientes/dentista-sonrisa
npm install
```

El script copia todo salvo `node_modules`, `dist`, `.git`, `build/*` y `briefs/*`, y renombra el paquete.

### 1) Escribe el brief

Crea `briefs/<cliente>.md`. Usa [briefs/ejemplo-dentista.md](briefs/ejemplo-dentista.md) como modelo. Lo importante:

- **Negocio**: nombre, sector, ciudad.
- **Oferta**: servicios y precios **reales** (los agentes no inventan datos; si falta algo, lo reportan).
- **Público** y **tono**.
- **Objetivo**: una única acción principal (llamar, escribir, reservar…).
- **Contacto**: teléfono, email, dirección.
- Opiniones reales si las hay (si no, no habrá bloque de opiniones).

### 2) Lanza el pipeline

```bash
claude                                   # dentro de la carpeta del proyecto
> /nueva-landing briefs/<cliente>.md
```

También acepta el texto del brief directamente: `/nueva-landing Clínica X en Murcia, ...` (lo guarda en `briefs/nuevo.md`).

Sin interfaz (lotes, servidores, CI):

```bash
scripts/run-pipeline.sh briefs/<cliente>.md
```

Ejecuta `claude -p` con permisos acotados (solo lectura/escritura, agentes y `npm run` / `node scripts/`) y al final imprime el informe de QA.

### 3) Revisa el resultado

- `build/qa-report.md` → veredicto `PASS`/`FAIL` y detalles.
- `build/peticiones-plantilla.md` o `build/notas-estratega.md` → si existen, los agentes piden algo que solo una persona puede hacer (un bloque nuevo, datos que faltan…).
- `npm run dev` y mira la web en `http://localhost:4321`.

### 4) Remata a mano

- Sube las fotos desde `/keystatic` (los agentes dejan en `build/design-spec.json` → `imageNotes` qué tipo de foto conviene y el texto alternativo).
- Corrige cualquier texto en `/keystatic` o directamente en `src/content/landing/index.json`.
- `npm run build && node scripts/check-dist.mjs` antes de publicar.

---

## 4. Orquestación de agentes

El orquestador es el comando [`.claude/commands/nueva-landing.md`](.claude/commands/nueva-landing.md). No hace el trabajo: vacía `build/`, llama a cada subagente en orden y decide si repetir.

Cada subagente está definido en [`.claude/agents/`](.claude/agents/) (prompt, herramientas permitidas y modelo). Trabajan con **contexto propio** y solo se comunican **mediante ficheros en `build/`**:

| Paso | Agente | Lee | Escribe | Herramientas |
|---|---|---|---|---|
| 1 | **estratega** | brief, `block-spec.json` | `build/content.json` (estructura + todo el copy) | Read, Write, Glob |
| 2 | **disenador** | brief, `content.json`, `tokens.css`, `block-spec.json` | `build/design-spec.json` (tema, color, notas de imagen, feedback) | Read, Write, Glob |
| 3 | **programador** | `content.json` + `design-spec.json` | `src/content/landing/index.json`, ejecuta validate + build + check-dist | Read, Write, Edit, Bash, Glob, Grep |
| 4 | **qa** | todo lo anterior + brief + build | `build/qa-report.md` con `PASS`/`FAIL` | Read, Write, Bash, Glob, Grep |

Bucles de corrección:

- Si el diseñador deja `contentFeedback` relevante, el orquestador vuelve a llamar **una vez** al estratega.
- Si QA da `FAIL`, el programador recibe el informe y corrige; QA vuelve a revisar. **Máximo 3 iteraciones**. Si sigue fallando, el orquestador para y explica qué falta y quién debe resolverlo.
- Al final el orquestador comprueba él mismo `npm run validate && npm run build` y da un resumen (estado, secciones, tema/color, datos pendientes, siguientes pasos).

Reglas que comparten todos (detalle en [CLAUDE.md](CLAUDE.md)):

- Español de España, tuteo por defecto.
- **No inventar datos del cliente** (teléfonos, direcciones, precios, cifras, opiniones, premios).
- Todo texto visible vive en `index.json`, nunca en componentes.
- Los agentes **no tocan la plantilla** (`package.json`, `astro.config.mjs`, `keystatic.config.ts`, componentes, tokens). Si necesitan algo, lo piden por escrito en `build/`.

---

## 5. Dónde se crea la landing (y cómo se pinta)

**La landing es un único fichero: `src/content/landing/index.json`.** Es lo que escribe el programador y lo que luego edita el cliente en el CMS. Las imágenes subidas van a `public/images/landing/` y se referencian como `/images/landing/<fichero>`.

Estructura del JSON:

```jsonc
{
  "siteName": "Clínica Dental Sonrisa",
  "seoTitle": "...",          // <title>, máx. 65
  "seoDescription": "...",    // meta description, máx. 160
  "theme": "clean",           // clean | warm | bold
  "accentColor": "",          // hex opcional, sobrescribe el color del tema
  "footerText": "...",
  "blocks": [                 // 4–9 bloques; primero hero, último cta
    { "discriminant": "hero", "value": { "title": "...", "ctaLabel": "...", "ctaHref": "#contacto", ... } },
    { "discriminant": "features", "value": { ... } },
    ...
    { "discriminant": "cta", "value": { ... } }
  ]
}
```

Cómo se convierte en HTML:

1. [`src/pages/index.astro`](src/pages/index.astro) importa el JSON **en tiempo de build**, monta el menú del header a partir de los bloques presentes (`navLabels`) y pasa `blocks` a `BlockRenderer`.
2. [`BlockRenderer.astro`](src/components/blocks/BlockRenderer.astro) mapea cada `discriminant` a su componente (`hero → Hero.astro`, `faq → Faq.astro`…), le pasa `value` como props y le asigna su ancla (`#servicios`, `#opiniones`, `#precios`, `#faq`, `#contacto`).
3. [`Layout.astro`](src/layouts/Layout.astro) pone `lang="es"`, SEO y `data-theme` en `<html>`; ese atributo elige los tokens de [`tokens.css`](src/styles/tokens.css). Si hay `accentColor`, sobrescribe `--accent` y calcula un `--accent-contrast` legible con [`src/lib/color.ts`](src/lib/color.ts).
4. `npm run build` genera **`dist/index.html`**: HTML estático, sin JavaScript de servidor (salvo que actives el CMS en producción, ver §7).

Bloques disponibles: `hero`, `features`, `testimonials`, `pricing`, `faq`, `cta`. Campos y límites exactos en [`src/lib/block-spec.json`](src/lib/block-spec.json).

> Las anclas viven en **tres sitios** que deben coincidir: `block-spec.json` (`anchor`), `BlockRenderer.astro` (`anchors`) e `index.astro` (`navLabels`).

---

## 6. Cómo funciona Keystatic por detrás

[Keystatic](https://keystatic.com) es un CMS **basado en ficheros**: no tiene base de datos. Su interfaz (una app React montada en `/keystatic`) lee y escribe directamente ficheros del repo según un esquema.

### El esquema

[`keystatic.config.ts`](keystatic.config.ts) define un **singleton** llamado `landing`:

- `path: 'src/content/landing/index'` + `format: { data: 'json' }` → el singleton **es** `src/content/landing/index.json`. Lo que el cliente guarda en el formulario se escribe en ese fichero.
- Los campos de sitio (`siteName`, `seoTitle`, `theme`…) son campos normales del formulario.
- `blocks` usa `fields.blocks(...)`: una lista de secciones donde cada elemento tiene un tipo. Keystatic lo guarda como `{ "discriminant": "<tipo>", "value": { ... } }`, que es justo el formato que consume `BlockRenderer`. Por eso agentes, CMS y plantilla hablan el mismo idioma.
- Los campos de imagen guardan el fichero en `public/images/landing/` y escriben en el JSON la ruta pública `/images/landing/...`.

El esquema del CMS está escrito **a mano** y debe ir alineado con `block-spec.json`. Si añades o cambias un campo en uno, cámbialo en el otro.

### Los dos modos de almacenamiento

El modo lo decide la variable `PUBLIC_KEYSTATIC_GITHUB_REPO`:

| Modo | Cuándo | Qué pasa al pulsar "Guardar" |
|---|---|---|
| **local** | No hay `PUBLIC_KEYSTATIC_GITHUB_REPO` (lo normal en desarrollo) | La API de Keystatic (`/api/keystatic`, servida por `astro dev`) escribe el JSON y las imágenes **directamente en tu disco**. El servidor de desarrollo recarga y ves el cambio al momento. |
| **github** | `PUBLIC_KEYSTATIC_GITHUB_REPO=usuario/repo` | El usuario inicia sesión con GitHub (vía una GitHub App) y cada guardado se convierte en un **commit** en ese repo. Vercel detecta el commit, recompila y publica. |

> Ojo: si pones `PUBLIC_KEYSTATIC_GITHUB_REPO` en tu `.env` local, también `npm run dev` usará el modo GitHub.

### Cuándo se monta el CMS

[`astro.config.mjs`](astro.config.mjs) solo añade la integración de Keystatic si:

- estás en `astro dev`, **o**
- compilas con `CMS=1`.

Con `CMS=1` en build, `/keystatic` y `/api/keystatic` necesitan ejecutarse en servidor, así que se activa el adaptador de **Vercel** (funciones serverless). Todo lo demás sigue siendo estático. Sin `CMS=1`, el resultado es **HTML 100 % estático** y no existe `/keystatic`.

### Flujo completo en producción

```
Cliente en https://su-dominio/keystatic
   └─ login con GitHub (GitHub App de Keystatic)
       └─ edita y guarda
           └─ commit en src/content/landing/index.json (+ imágenes en public/images/landing/)
               └─ Vercel detecta el push → npm run build (valida + compila)
                   └─ nueva versión publicada en 1–2 minutos
```

Como `npm run build` ejecuta antes el validador, **si el cliente guarda algo que rompe el contrato (p. ej. un titular demasiado largo), el despliegue falla** y sigue online la versión anterior. Revisa los logs de Vercel si un cambio no aparece.

---

## 7. Publicar con CMS para el cliente

1. Sube el proyecto del cliente a un repo de GitHub y conéctalo a Vercel.
2. En Vercel define `CMS=1`, `PUBLIC_KEYSTATIC_GITHUB_REPO=usuario/repo` y `SITE_URL`.
3. En local, con esa variable de repo puesta, ejecuta `npm run dev`, abre `/keystatic` y sigue el asistente de Keystatic para crear su **GitHub App**. Copia a Vercel las variables que genera (`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`; ver [.env.example](.env.example)).
4. Instala la GitHub App en el repo del cliente y dale al cliente acceso de colaborador.
5. El cliente entra en `https://su-dominio/keystatic`.

Si el cliente no necesita editar, no actives `CMS=1`: se publica solo HTML (sirve cualquier hosting estático con la carpeta `dist/`).

---

## 8. Calidad y validación

No hay tests ni linter: la comprobación completa es

```bash
npm run validate && npm run build && node scripts/check-dist.mjs
```

- **`npm run validate`** ([scripts/validate-content.mjs](scripts/validate-content.mjs)) comprueba el contenido contra `block-spec.json`: campos obligatorios y desconocidos, límites de caracteres, orden de bloques (primero `hero`, último `cta`, 4–9 bloques), que los `#ancla` apunten a un bloque presente, contraste del color de marca (≥ 4.5:1) y textos provisionales (lorem, TODO, `[algo]`, "sustituir", "rellenar"…).
  - Para validar un borrador: `node scripts/validate-content.mjs build/content.json`.
- **`npm run build`** valida y compila a `dist/`.
- **`node scripts/check-dist.mjs`** revisa `dist/index.html`: un solo `h1`, `lang="es"`, `title` y description, `alt` en imágenes.

---

## 9. Mapa de ficheros

```
.claude/
  agents/               estratega.md · disenador.md · programador.md · qa.md
  commands/             nueva-landing.md (orquestador)
briefs/                 briefs de cliente (.md)
build/                  ficheros entre agentes (no se versiona)
public/images/landing/  imágenes de la landing (las sube el CMS)
scripts/
  validate-content.mjs  validador del contenido
  check-dist.mjs        revisión del HTML final
  run-pipeline.sh       pipeline sin interfaz
  nuevo-cliente.sh      copia la plantilla para un cliente
src/
  content/landing/index.json   ← LA LANDING (lo que edita el cliente)
  lib/block-spec.json          contrato de bloques
  lib/color.ts                 cálculo de contraste del color de marca
  components/blocks/           un componente por bloque + BlockRenderer
  components/                  Header, Footer, Button
  layouts/Layout.astro         <html>, SEO, tema
  pages/index.astro            página única
  styles/tokens.css            temas clean / warm / bold
keystatic.config.ts     esquema del CMS
astro.config.mjs        Astro + activación condicional del CMS
CLAUDE.md               instrucciones para Claude Code y sus agentes
```

---

## 10. Ampliar la fábrica

Cambios de plantilla los hace **una persona**, no los agentes.

- **Nuevo bloque**:
  1. Componente en `src/components/blocks/`; registro y ancla en `BlockRenderer.astro`; entrada en `navLabels` de `index.astro` si debe salir en el menú.
  2. Esquema en `keystatic.config.ts`.
  3. Entrada en `src/lib/block-spec.json` (campos, límites, ancla).
  4. Contenido de ejemplo y `npm run build`.
- **Nuevo tema**: defínelo en `tokens.css`, añádelo a `block-spec.json → themes` y a las opciones de `keystatic.config.ts`.
- **Nuevo sector**: añade un brief tipo en `briefs/` y, si hace falta, un tema.
- **Cálculo de contraste**: está duplicado en `src/lib/color.ts` y en el validador. Si cambias uno, cambia el otro.
- **Imágenes**: de momento las sube el cliente o tú desde el CMS. Una extensión natural es un quinto agente que genere imágenes.
