// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import keystatic from '@keystatic/astro';

// El CMS (Keystatic) se activa en `astro dev` y, en producción, con CMS=1.
// En producción necesita un adaptador de servidor (aquí Vercel) porque /keystatic
// y /api/keystatic se renderizan bajo demanda. Sin CMS=1 el sitio es 100% estático.
const isDev = process.argv.includes('dev');
const cms = isDev || process.env.CMS === '1';

const adapter =
  cms && !isDev ? (await import('@astrojs/vercel')).default() : undefined;

export default defineConfig({
  site: process.env.SITE_URL || undefined,
  integrations: [react(), ...(cms ? [keystatic()] : [])],
  adapter,
  vite: { plugins: [tailwindcss()] },
});
