// Valida src/content/landing/index.json contra src/lib/block-spec.json.
// Es el "contrato" entre agentes y plantilla: si pasa, la página compila y es editable en el CMS.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const file = process.argv[2] || resolve(root, 'src/content/landing/index.json');
const spec = JSON.parse(readFileSync(resolve(root, 'src/lib/block-spec.json'), 'utf8'));

let data;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`✗ No se pudo leer ${file}: ${e.message}`);
  process.exit(1);
}

const errors = [];
const err = (path, msg) => errors.push(`${path}: ${msg}`);

const PLACEHOLDER = /lorem|ipsum|\b(todo|tbd|xxx)\b|\[\s*[a-záéíóúñ ]+\s*\]|sustituir|rellenar|texto de ejemplo|your (text|title)/i;
const isStr = (v) => typeof v === 'string';
const blank = (v) => v === undefined || v === null || (isStr(v) && v.trim() === '');

function checkValue(path, def, value) {
  if (blank(value)) {
    if (def.required) err(path, 'obligatorio y vacío');
    return;
  }
  switch (def.type) {
    case 'text':
      if (!isStr(value)) return err(path, 'debe ser texto');
      if (def.max && value.length > def.max) err(path, `${value.length} caracteres (máx. ${def.max})`);
      if (PLACEHOLDER.test(value)) err(path, `parece texto provisional: "${value.slice(0, 40)}"`);
      break;
    case 'href':
      if (!isStr(value) || !/^(#[\w-]+|https?:\/\/\S+|mailto:\S+|tel:\+?[\d\s-]+)$/.test(value))
        err(path, `enlace no válido: "${value}" (usa #ancla, https://, mailto: o tel:)`);
      break;
    case 'hex':
      if (!isStr(value) || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) err(path, `color hex no válido: "${value}"`);
      break;
    case 'theme':
      if (!spec.themes.includes(value)) err(path, `tema "${value}" no existe (${spec.themes.join(', ')})`);
      break;
    case 'image':
      if (!isStr(value) || !value.startsWith('/images/')) err(path, 'la imagen debe ser una ruta /images/...');
      break;
    case 'checkbox':
      if (typeof value !== 'boolean') err(path, 'debe ser true/false');
      break;
    case 'list':
      if (!Array.isArray(value)) return err(path, 'debe ser una lista');
      if (def.min && value.length < def.min) err(path, `mínimo ${def.min} elementos`);
      if (def.max && value.length > def.max) err(path, `máximo ${def.max} elementos`);
      value.forEach((v, i) => {
        if (!isStr(v) || !v.trim()) err(`${path}[${i}]`, 'elemento vacío');
        else if (def.max_item && v.length > def.max_item) err(`${path}[${i}]`, `${v.length} caracteres (máx. ${def.max_item})`);
        else if (PLACEHOLDER.test(v)) err(`${path}[${i}]`, 'parece texto provisional');
      });
      break;
    case 'array':
      if (!Array.isArray(value)) return err(path, 'debe ser una lista');
      if (def.min && value.length < def.min) err(path, `mínimo ${def.min} elementos`);
      if (def.max && value.length > def.max) err(path, `máximo ${def.max} elementos`);
      value.forEach((item, i) => checkFields(`${path}[${i}]`, def.item, item));
      break;
  }
}

function checkFields(path, defs, obj) {
  if (!obj || typeof obj !== 'object') return err(path, 'debe ser un objeto');
  for (const key of Object.keys(obj)) if (!(key in defs)) err(`${path}.${key}`, 'campo desconocido');
  for (const [key, def] of Object.entries(defs)) checkValue(`${path}.${key}`, def, obj[key]);
}

// --- sitio ---
checkFields('site', spec.site, Object.fromEntries(Object.keys(spec.site).map((k) => [k, data[k]])));
for (const k of Object.keys(data)) if (k !== 'blocks' && !(k in spec.site)) err(k, 'campo desconocido');

// --- bloques ---
const blocks = data.blocks;
if (!Array.isArray(blocks) || blocks.length === 0) {
  err('blocks', 'debe ser una lista no vacía');
} else {
  const { rules } = spec;
  if (blocks.length < rules.minBlocks) err('blocks', `mínimo ${rules.minBlocks} secciones`);
  if (blocks.length > rules.maxBlocks) err('blocks', `máximo ${rules.maxBlocks} secciones`);
  if (blocks[0]?.discriminant !== rules.firstBlock) err('blocks[0]', `la primera sección debe ser "${rules.firstBlock}"`);
  if (blocks.at(-1)?.discriminant !== rules.lastBlock) err(`blocks[${blocks.length - 1}]`, `la última sección debe ser "${rules.lastBlock}"`);
  for (const name of rules.single) {
    const n = blocks.filter((b) => b.discriminant === name).length;
    if (n !== 1) err('blocks', `debe haber exactamente 1 "${name}" (hay ${n})`);
  }
  blocks.forEach((b, i) => {
    const path = `blocks[${i}](${b?.discriminant})`;
    const def = spec.blocks[b?.discriminant];
    if (!def) return err(path, `bloque desconocido. Válidos: ${Object.keys(spec.blocks).join(', ')}`);
    checkFields(path, def.fields, b.value);
  });
  // los CTA internos deben apuntar a un ancla que exista
  const anchors = new Set(blocks.map((b) => spec.blocks[b?.discriminant]?.anchor).filter(Boolean));
  const json = JSON.stringify(blocks);
  for (const m of json.matchAll(/"(?:ctaHref|secondaryHref)":"#([\w-]+)"/g))
    if (!anchors.has(m[1])) err('blocks', `enlace a #${m[1]} pero esa sección no existe en la página`);
}

// --- contraste del color de marca (texto blanco u oscuro sobre el acento) ---
if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(data.accentColor || '')) {
  const lum = (hex) => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = [...h].map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((v) => v / 255)
      .map((s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4))
      .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const best = Math.max(ratio(data.accentColor, '#ffffff'), ratio(data.accentColor, '#0b0f17'));
  if (best < 4.5) err('accentColor', `contraste ${best.toFixed(2)}:1 insuficiente (mín. 4.5:1). Elige un tono más claro u oscuro.`);
}

if (errors.length) {
  console.error(`✗ Contenido no válido (${errors.length} problema${errors.length > 1 ? 's' : ''}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ Contenido válido (${blocks.length} secciones: ${blocks.map((b) => b.discriminant).join(' > ')})`);
