#!/usr/bin/env bash
# Crea un proyecto nuevo para un cliente a partir de esta plantilla.
# Uso: scripts/nuevo-cliente.sh <slug-cliente> [carpeta-destino]
set -euo pipefail

slug="${1:?Uso: scripts/nuevo-cliente.sh <slug-cliente> [carpeta-destino]}"
dest_root="${2:-$(dirname "$PWD")/clientes}"
dest="$dest_root/$slug"

[ -e "$dest" ] && { echo "✗ Ya existe $dest"; exit 1; }
mkdir -p "$dest"

rsync -a \
  --exclude node_modules --exclude dist --exclude .astro --exclude .vercel \
  --exclude .git --exclude 'build/*' --exclude 'briefs/*' \
  ./ "$dest/"

mkdir -p "$dest/build" "$dest/briefs"
touch "$dest/build/.gitkeep"
sed -i.bak "s/\"name\": \"landing-template\"/\"name\": \"$slug\"/" "$dest/package.json" && rm "$dest/package.json.bak"

cd "$dest"
git init -q
echo "✓ Proyecto creado en $dest"
echo "  Siguiente: cd $dest && npm install && claude   →   /nueva-landing briefs/<brief>.md"
