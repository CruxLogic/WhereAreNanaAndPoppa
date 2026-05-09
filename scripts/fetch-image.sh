#!/usr/bin/env bash
# fetch-image.sh — download a Wikimedia Commons image as a scaled thumbnail.
#
# Usage:
#   fetch-image.sh <out_path> <commons_original_url> [width]
#
# Example:
#   fetch-image.sh public/images/sydney/hero.jpg \
#     https://upload.wikimedia.org/wikipedia/commons/7/7c/Sydney_Opera_House_-_Dec_2008.jpg 1600
#
# Converts an "original" Commons URL like
#   https://upload.wikimedia.org/wikipedia/commons/<a>/<bc>/<File>
# into the matching thumbnail
#   https://upload.wikimedia.org/wikipedia/commons/thumb/<a>/<bc>/<File>/<W>px-<File>
# and saves it to <out_path>. Falls back to the original URL on failure.

set -euo pipefail

out="$1"
url="$2"
width="${3:-1600}"

mkdir -p "$(dirname "$out")"

UA="WhereIsNanaAndPop/1.0 (https://github.com/PeteBanks/WhereNanaAndPop)"
file="${url##*/}"
thumb_url="$(printf '%s' "$url" | sed 's|wikipedia/commons/|wikipedia/commons/thumb/|')/${width}px-${file}"

# Some animated/SVG/transparent files don't have a same-extension thumb;
# Commons serves those as .png. We try thumb first, then original.
if curl -sSL --fail --max-filesize 6000000 -A "$UA" -o "$out" "$thumb_url"; then
  :
else
  echo "thumb failed, falling back to original" >&2
  curl -sSL --fail --max-filesize 25000000 -A "$UA" -o "$out" "$url"
fi

# Sanity-check: must be an image (not an HTML error page)
mime="$(file -b --mime-type "$out")"
case "$mime" in
  image/*) ;;
  *)
    echo "ERROR: $out is $mime, not an image. Removing." >&2
    rm -f "$out"
    exit 2
    ;;
esac

bytes=$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")
echo "saved $out ($mime, ${bytes} bytes)"
