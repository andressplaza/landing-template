// Comprobaciones sobre el HTML generado (dist/index.html). Las usa el agente QA.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(import.meta.dirname, '..', 'dist', 'index.html');
if (!existsSync(file)) {
  console.error('✗ No existe dist/index.html. Ejecuta `npm run build` primero.');
  process.exit(1);
}
const html = readFileSync(file, 'utf8');
const problems = [];
const warnings = [];

const count = (re) => (html.match(re) || []).length;

if (count(/<h1[\s>]/g) !== 1) problems.push(`debe haber exactamente 1 <h1> (hay ${count(/<h1[\s>]/g)})`);
if (!/<html[^>]*\slang="es"/.test(html)) problems.push('falta lang="es" en <html>');
const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
if (!title) problems.push('falta <title>');
else if (title.length > 65) warnings.push(`<title> largo (${title.length})`);
const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
if (!desc) problems.push('falta meta description');
else if (desc.length > 160) warnings.push(`meta description larga (${desc.length})`);

for (const m of html.matchAll(/<img\b[^>]*>/g)) {
  if (!/\salt=/.test(m[0])) problems.push(`<img> sin atributo alt: ${m[0].slice(0, 80)}`);
  if (!/\swidth=/.test(m[0]) || !/\sheight=/.test(m[0])) warnings.push('<img> sin width/height (provoca saltos de maquetación)');
}
if (/lorem|ipsum|\bTODO\b|sustituir/i.test(html)) problems.push('quedan textos provisionales en el HTML');
if (/href="#"/.test(html.replace(/<a href="#" class="font-heading[^>]*>/, ''))) warnings.push('hay enlaces href="#" que no llevan a ninguna parte');

const bytes = Buffer.byteLength(html);
if (bytes > 150_000) warnings.push(`HTML pesado: ${(bytes / 1024).toFixed(0)} KB`);

for (const w of warnings) console.warn(`⚠ ${w}`);
if (problems.length) {
  console.error(`✗ ${problems.length} problema(s) en dist/index.html:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`✓ HTML correcto (${(bytes / 1024).toFixed(1)} KB, ${warnings.length} aviso(s))`);
