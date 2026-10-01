---
description: Genera una landing completa a partir de un brief (estratega → diseñador → programador → QA)
argument-hint: <ruta del brief, ej. briefs/dentista.md>
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

Vas a orquestar la creación de una landing con los subagentes del proyecto. Brief: `$ARGUMENTS`

Si `$ARGUMENTS` no es una ruta a un fichero existente, trátalo como el texto del brief: guárdalo en `briefs/nuevo.md` y úsalo.

Prepara la carpeta `build/` (vacíala salvo `.gitkeep`) y sigue estos pasos EN ORDEN. Cada subagente trabaja con su propio contexto y se comunica solo mediante ficheros en `build/`.

1. **estratega** → entrégale la ruta del brief. Debe crear `build/content.json`.
2. **disenador** → entrégale la ruta del brief. Debe crear `build/design-spec.json`. Si añade `contentFeedback` relevante, vuelve a llamar al estratega una única vez con ese feedback.
3. **programador** → debe generar `src/content/landing/index.json`, pasar `npm run validate`, `npm run build` y `node scripts/check-dist.mjs`.
4. **qa** → debe crear `build/qa-report.md`.
   - Si el veredicto es `FAIL`: llama al programador con el informe y vuelve a pasar QA. Máximo 3 iteraciones.
   - Si tras 3 iteraciones sigue en `FAIL`, para y explica qué falta y quién debe resolverlo.

Reglas del orquestador:
- No hagas tú el trabajo de los subagentes: delega siempre.
- No modifiques componentes, tokens ni el CMS. Si algún agente deja `build/peticiones-plantilla.md` o `build/notas-estratega.md`, repórtalo.
- Verifica tú mismo al final: `npm run validate && npm run build` deben pasar.

Resumen final (máximo 8 líneas): estado (PASS/FAIL), estructura de secciones, tema y color elegidos, datos pendientes del cliente, y los siguientes pasos para publicar (subir imágenes en /keystatic, crear repo del cliente y desplegar).
