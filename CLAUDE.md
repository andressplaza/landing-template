# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Fábrica de landings (Astro + Keystatic)

Plantilla para generar landings de una página que el cliente edita en un CMS. Los agentes **ensamblan bloques existentes**; no escriben código libre.

## Stack
Astro (estático) · Tailwind v4 (tokens CSS) · Keystatic (CMS, contenido en `src/content/landing/index.json`).

## Mapa del proyecto
- `src/lib/block-spec.json` — **contrato**: bloques, campos, límites. Fuente de verdad para agentes y validador.
- `keystatic.config.ts` — esquema del CMS. Debe ir alineado con el contrato.
- `src/components/blocks/*.astro` — un componente por bloque. `BlockRenderer.astro` los registra.
- `src/styles/tokens.css` — temas (`clean`, `warm`, `bold`). Todo el color/tipografía sale de aquí.
- `src/content/landing/index.json` — contenido de la landing (lo que edita el cliente).
- `briefs/` — briefs de cliente. `build/` — ficheros intercambiados entre agentes (no se versiona).
- `scripts/validate-content.mjs` y `scripts/check-dist.mjs` — validación de contenido y de HTML.
- `.claude/agents/*.md` — definición de cada subagente. `.claude/commands/nueva-landing.md` — orquestador.

## Arquitectura (lo que no se ve en un solo fichero)
- `index.json` es un singleton de Keystatic: campos de sitio (`siteName`, `seoTitle`, `theme`, `accentColor`…) + `blocks`, una lista de `{ discriminant, value }`. `src/pages/index.astro` la pasa a `BlockRenderer`, que mapea `discriminant` → componente y pasa `value` como props.
- Reglas de estructura en `block-spec.json → rules`: primero `hero`, último `cta`, `hero` y `cta` únicos, 4–9 bloques. Campos no declarados en el contrato = error.
- Las anclas de bloque (`#servicios`, `#opiniones`, `#precios`, `#faq`, `#contacto`) están en **tres sitios** que deben coincidir: `block-spec.json` (`anchor`), `BlockRenderer.astro` (`anchors`) e `index.astro` (`navLabels`, menú del header). El validador exige que `ctaHref`/`secondaryHref` con `#ancla` apunten a un bloque presente en la página.
- Tema: `Layout.astro` pone `data-theme` en `<html>` y eso selecciona los tokens de `tokens.css`. Si hay `accentColor`, sobrescribe `--accent` y calcula `--accent-contrast` con `src/lib/color.ts`. El validador reimplementa ese cálculo (mín. 4.5:1): si cambias uno, cambia el otro.
- Imágenes: rutas `/images/...`, servidas desde `public/images/`.
- El CMS (`/keystatic`) solo se monta en `astro dev` o con `CMS=1`; con `CMS=1` usa el adaptador de Vercel y el modo GitHub (variables en `.env.example`). Sin `CMS=1` el resultado es HTML 100 % estático.
- El validador rechaza textos provisionales (lorem, TODO, `[algo]`, "sustituir", "rellenar"…).

## Flujo de agentes
`/nueva-landing briefs/<cliente>.md` → **estratega** (`build/content.json`) → **disenador** (`build/design-spec.json`) → **programador** (`src/content/landing/index.json` + build) → **qa** (`build/qa-report.md`).
- Los agentes se comunican solo mediante ficheros en `build/`.
- Si QA da `FAIL`, se vuelve al programador (máx. 3 iteraciones).
- Para pedir cambios de plantilla a una persona, los agentes dejan `build/peticiones-plantilla.md` o `build/notas-estratega.md`.

## Reglas globales (todos los agentes)
- Idioma del contenido: español de España. Tuteo por defecto.
- Todo texto visible está en `src/content/landing/index.json`, nunca en componentes.
- No inventar datos del cliente (teléfonos, direcciones, precios, cifras, opiniones, premios). Si falta, se reporta.
- No instalar dependencias ni tocar `package.json`, `astro.config.mjs` o `keystatic.config.ts` salvo petición expresa de una persona.
- Antes de dar algo por terminado: `npm run validate && npm run build && node scripts/check-dist.mjs` en verde.
- Accesibilidad mínima: contraste AA, un solo `h1`, `alt` en imágenes, `lang="es"`.

## Comandos
No hay tests ni linter: la comprobación completa es validate + build + check-dist.
- `npm run dev` — desarrollo con CMS en `/keystatic`.
- `npm run validate` — valida el contenido contra el contrato.
- `node scripts/validate-content.mjs <fichero.json>` — valida un JSON concreto (p. ej. un borrador en `build/`).
- `npm run build` — valida y compila a `dist/`.
- `node scripts/check-dist.mjs` — revisa `dist/index.html` (un `h1`, `lang`, `title`/description, `alt`). Requiere build previo.
- `CMS=1 npm run build` — compila con CMS en producción (necesita el adaptador de Vercel, ya incluido).
- `scripts/run-pipeline.sh briefs/<cliente>.md` — pipeline de agentes sin interfaz (`claude -p`).
- `scripts/nuevo-cliente.sh <slug>` — copia la plantilla a `../clientes/<slug>` con `git init`.

## Añadir un bloque nuevo (lo hace una persona, no un agente)
1. Componente en `src/components/blocks/`; registro y ancla en `BlockRenderer.astro`; entrada en `navLabels` de `index.astro` si debe salir en el menú.
2. Esquema en `keystatic.config.ts`.
3. Entrada en `src/lib/block-spec.json` (campos, límites, ancla).
4. Contenido de ejemplo y `npm run build`.

Tema nuevo: definirlo en `tokens.css`, añadirlo a `block-spec.json → themes` y a las opciones de `keystatic.config.ts`.
