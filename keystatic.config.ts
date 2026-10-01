import { config, fields, singleton } from '@keystatic/core';

// IMPORTANTE: este esquema debe mantenerse alineado con src/lib/block-spec.json,
// que es el contrato que usan los agentes y el validador.

const href = (label = 'Enlace') =>
  fields.text({
    label,
    description: 'Ancla (#contacto), URL (https://...), mailto: o tel:',
  });

const image = (label = 'Imagen') =>
  fields.image({
    label,
    directory: 'public/images/landing',
    publicPath: '/images/landing/',
  });

// Esta config también se ejecuta en el navegador: aquí no existe `process`.
// Por eso se usa import.meta.env con prefijo PUBLIC_.
const githubRepo = import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO as
  | `${string}/${string}`
  | undefined;

export default config({
  storage: githubRepo
    ? { kind: 'github', repo: githubRepo }
    : { kind: 'local' },

  ui: { brand: { name: 'Editor de la web' } },

  singletons: {
    landing: singleton({
      label: 'Mi página',
      path: 'src/content/landing/index',
      format: { data: 'json' },
      schema: {
        siteName: fields.text({ label: 'Nombre del negocio' }),
        seoTitle: fields.text({
          label: 'Título en Google',
          description: 'Máx. 65 caracteres',
        }),
        seoDescription: fields.text({
          label: 'Descripción en Google',
          multiline: true,
          description: 'Máx. 160 caracteres',
        }),
        theme: fields.select({
          label: 'Estilo visual',
          options: [
            { label: 'Limpio', value: 'clean' },
            { label: 'Cálido', value: 'warm' },
            { label: 'Atrevido (oscuro)', value: 'bold' },
          ],
          defaultValue: 'clean',
        }),
        accentColor: fields.text({
          label: 'Color de marca (opcional)',
          description: 'Hex, por ejemplo #0e7490. Vacío = el del estilo.',
        }),
        footerText: fields.text({ label: 'Texto del pie de página' }),

        blocks: fields.blocks(
          {
            hero: {
              label: 'Portada',
              itemLabel: (p) => p.fields.title.value || 'Portada',
              schema: fields.object({
                eyebrow: fields.text({ label: 'Etiqueta superior' }),
                title: fields.text({ label: 'Titular' }),
                subtitle: fields.text({ label: 'Subtítulo', multiline: true }),
                ctaLabel: fields.text({ label: 'Botón principal (texto)' }),
                ctaHref: href('Botón principal (enlace)'),
                secondaryLabel: fields.text({ label: 'Botón secundario (texto)' }),
                secondaryHref: href('Botón secundario (enlace)'),
                image: image('Imagen de portada'),
                imageAlt: fields.text({ label: 'Descripción de la imagen' }),
              }),
            },

            features: {
              label: 'Servicios / ventajas',
              itemLabel: (p) => p.fields.title.value || 'Servicios',
              schema: fields.object({
                title: fields.text({ label: 'Título' }),
                subtitle: fields.text({ label: 'Subtítulo', multiline: true }),
                items: fields.array(
                  fields.object({
                    icon: fields.text({
                      label: 'Icono (un emoji)',
                      description: 'Por ejemplo 🦷',
                    }),
                    title: fields.text({ label: 'Título' }),
                    text: fields.text({ label: 'Texto', multiline: true }),
                  }),
                  {
                    label: 'Elementos',
                    itemLabel: (p) => p.fields.title.value || 'Elemento',
                  },
                ),
              }),
            },

            testimonials: {
              label: 'Opiniones',
              itemLabel: (p) => p.fields.title.value || 'Opiniones',
              schema: fields.object({
                title: fields.text({ label: 'Título' }),
                items: fields.array(
                  fields.object({
                    quote: fields.text({ label: 'Opinión', multiline: true }),
                    name: fields.text({ label: 'Nombre' }),
                    role: fields.text({ label: 'Detalle (ej. Paciente desde 2021)' }),
                  }),
                  {
                    label: 'Opiniones',
                    itemLabel: (p) => p.fields.name.value || 'Opinión',
                  },
                ),
              }),
            },

            pricing: {
              label: 'Precios',
              itemLabel: (p) => p.fields.title.value || 'Precios',
              schema: fields.object({
                title: fields.text({ label: 'Título' }),
                subtitle: fields.text({ label: 'Subtítulo', multiline: true }),
                plans: fields.array(
                  fields.object({
                    name: fields.text({ label: 'Nombre del plan' }),
                    price: fields.text({ label: 'Precio (ej. 49 €)' }),
                    period: fields.text({ label: 'Periodo (ej. /mes)' }),
                    description: fields.text({ label: 'Descripción' }),
                    features: fields.array(fields.text({ label: 'Incluye' }), {
                      label: 'Incluye',
                      itemLabel: (p) => p.value || 'Característica',
                    }),
                    ctaLabel: fields.text({ label: 'Botón (texto)' }),
                    ctaHref: href('Botón (enlace)'),
                    highlighted: fields.checkbox({
                      label: 'Destacar este plan',
                      defaultValue: false,
                    }),
                  }),
                  {
                    label: 'Planes',
                    itemLabel: (p) => p.fields.name.value || 'Plan',
                  },
                ),
              }),
            },

            faq: {
              label: 'Preguntas frecuentes',
              itemLabel: (p) => p.fields.title.value || 'FAQ',
              schema: fields.object({
                title: fields.text({ label: 'Título' }),
                items: fields.array(
                  fields.object({
                    question: fields.text({ label: 'Pregunta' }),
                    answer: fields.text({ label: 'Respuesta', multiline: true }),
                  }),
                  {
                    label: 'Preguntas',
                    itemLabel: (p) => p.fields.question.value || 'Pregunta',
                  },
                ),
              }),
            },

            cta: {
              label: 'Llamada a la acción final',
              itemLabel: (p) => p.fields.title.value || 'CTA',
              schema: fields.object({
                title: fields.text({ label: 'Titular' }),
                text: fields.text({ label: 'Texto', multiline: true }),
                ctaLabel: fields.text({ label: 'Botón (texto)' }),
                ctaHref: href('Botón (enlace)'),
              }),
            },
          },
          { label: 'Secciones de la página' },
        ),
      },
    }),
  },
});
