#!/usr/bin/env bash
#
# Package Cookie Cockpit for Chrome Web Store upload.
# Creates a clean .zip containing only extension files.
#
# Usage: bash scripts/package.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Read version from manifest.json
VERSION=$(grep '"version"' "$ROOT_DIR/manifest.json" | head -1 | sed 's/.*: *"\(.*\)".*/\1/')

if [ -z "$VERSION" ]; then
  echo "Error: could not read version from manifest.json"
  exit 1
fi

OUTPUT_NAME="cookie-cockpit-v${VERSION}.zip"
OUTPUT_PATH="$ROOT_DIR/$OUTPUT_NAME"

# Remove old build if it exists
rm -f "$OUTPUT_PATH"

echo "Packaging Cookie Cockpit v${VERSION}..."

cd "$ROOT_DIR"

zip -r "$OUTPUT_PATH" . \
  -x ".git/*" \
  -x ".gitignore" \
  -x ".DS_Store" \
  -x "scripts/*" \
  -x "store/*" \
  -x "*.md" \
  -x "*.zip" \
  -x "*.crx" \
  -x "*.code-workspace" \
  -x "node_modules/*" \
  -x ".vscode/*" \
  -x "Thumbs.db" \
  -x "notes-*" \
  -x "*.txt"

echo ""
echo "Created: $OUTPUT_NAME"
echo ""

# Show contents for verification
echo "Contents:"
unzip -l "$OUTPUT_PATH" | awk 'NR>3 && /^ / && !/----/ {print "  " $4}'
echo ""
echo "Ready for Chrome Web Store upload."
