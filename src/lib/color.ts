// Utilidades de color: contraste automático para el color de marca del cliente.

export function isHex(value: string | undefined | null): value is string {
  return !!value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function toRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(toRgb(a));
  const lb = luminance(toRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Devuelve el color de texto (blanco u oscuro) que mejor contrasta con el fondo dado. */
export function readableOn(bg: string): { color: string; ratio: number } {
  const white = '#ffffff';
  const dark = '#0b0f17';
  const rw = contrastRatio(bg, white);
  const rd = contrastRatio(bg, dark);
  return rw >= rd ? { color: white, ratio: rw } : { color: dark, ratio: rd };
}
