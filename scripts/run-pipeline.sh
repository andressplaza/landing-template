#!/usr/bin/env bash
# Ejecuta el pipeline de agentes sin interfaz (para automatizar por lotes o desde un servidor).
# Uso: scripts/run-pipeline.sh briefs/cliente.md
set -euo pipefail

brief="${1:?Uso: scripts/run-pipeline.sh briefs/cliente.md}"
[ -f "$brief" ] || { echo "✗ No existe $brief"; exit 1; }

claude -p "/nueva-landing $brief" \
  --permission-mode acceptEdits \
  --allowedTools "Read,Write,Edit,Glob,Grep,Agent,Bash(npm run *),Bash(node scripts/*),Bash(npx astro *)" \
  --output-format text

echo
echo "── Informe de QA ──"
cat build/qa-report.md 2>/dev/null || echo "(sin informe)"
