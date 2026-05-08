#!/bin/bash
set -euo pipefail

if [ -f /etc/unraid-version ]; then
  . /etc/unraid-version
else
  # Fallback for development environment
  version="6.12.54"
fi

WORKDIR="/boot"
BACKUPDIR="$WORKDIR/bzbackup"
TMPDIR="$WORKDIR/tmp_dl"
BASEURL="https://github.com/bobbintb/unraid_ebpf/releases/download/${version}"

mkdir -p "$BACKUPDIR" "$TMPDIR"

# Common wget options for resilience
WGET="wget -q --show-progress --progress=bar:force --tries=5 --waitretry=5 --timeout=30 --retry-connrefused"

# --- Download bzimage and checksum ---
echo "Downloading bzimage..."
if ! $WGET -O "$TMPDIR/bzimage-${version}" "$BASEURL/bzimage-${version}"; then
  echo "Error: Failed to download bzimage"
  exit 1
fi

if ! $WGET -O "$TMPDIR/bzimage-${version}.sha256" "$BASEURL/bzimage-${version}.sha256"; then
  echo "Error: Failed to download bzimage sha256"
  exit 1
fi

# --- Download bzmodules (complete file, not parts) ---
echo "Downloading bzmodules..."
if ! $WGET -O "$TMPDIR/bzmodules-${version}" "$BASEURL/bzmodules-${version}"; then
  echo "Error: Failed to download bzmodules"
  exit 1
fi

# Download bzmodules sha256
if ! $WGET -O "$TMPDIR/bzmodules-${version}.sha256" "$BASEURL/bzmodules-${version}.sha256"; then
  echo "Error: Failed to download bzmodules sha256"
  exit 1
fi

# --- Verify checksums ---
echo "Verifying checksums..."
pushd "$TMPDIR" >/dev/null
if ! sha256sum -c bzimage-${version}.sha256; then
  echo "Error: bzimage checksum mismatch"
  exit 1
fi

if ! sha256sum -c bzmodules-${version}.sha256; then
  echo "Error: bzmodules checksum mismatch"
  exit 1
fi
popd >/dev/null

# --- Backup current files ---
echo "Backing up current files..."
[ -f "$WORKDIR/bzimage" ] && mv "$WORKDIR/bzimage"          "$BACKUPDIR/bzimage.${version}"
[ -f "$WORKDIR/bzimage.sha256" ] && mv "$WORKDIR/bzimage.sha256"   "$BACKUPDIR/bzimage.${version}.sha256"
[ -f "$WORKDIR/bzmodules" ] && mv "$WORKDIR/bzmodules"        "$BACKUPDIR/bzmodules.${version}"
[ -f "$WORKDIR/bzmodules.sha256" ] && mv "$WORKDIR/bzmodules.sha256" "$BACKUPDIR/bzmodules.${version}.sha256"

# --- Install new files ---
echo "Installing new files..."
mv "$TMPDIR/bzimage-${version}"          "$WORKDIR/bzimage"
mv "$TMPDIR/bzimage-${version}.sha256"   "$WORKDIR/bzimage.sha256"
mv "$TMPDIR/bzmodules-${version}"        "$WORKDIR/bzmodules"
mv "$TMPDIR/bzmodules-${version}.sha256" "$WORKDIR/bzmodules.sha256"

# Cleanup
rm -rf "$TMPDIR"

echo "Done!"
