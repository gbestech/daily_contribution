#!/bin/bash
# fix-theme-colors.sh
# Run from your project root: ./fix-theme-colors.sh

echo "Scanning src/ for hardcoded colors..."

FILES=$(grep -rlE "#[0-9a-fA-F]{3,6}|color:\s*[\"']?(white|black)[\"']?" src/ --include="*.jsx" --include="*.js" --include="*.tsx")

if [ -z "$FILES" ]; then
  echo "No files with hardcoded colors found."
  exit 0
fi

echo "Found $(echo "$FILES" | wc -l) files. Fixing..."

for f in $FILES; do
  sed -i \
    -e "s/color: \"white\"/color: \"var(--text)\"/g" \
    -e "s/color: 'white'/color: 'var(--text)'/g" \
    -e "s/color:\s*\"#fff\"/color: \"var(--text)\"/g" \
    -e "s/color:\s*\"#ffffff\"/color: \"var(--text)\"/g" \
    -e "s/color: \"black\"/color: \"var(--text)\"/g" \
    -e "s/color: '#000'/color: 'var(--text)'/g" \
    -e "s/color:\s*\"#000000\"/color: \"var(--text)\"/g" \
    \
    -e 's/#94a3b8/var(--text-muted)/g' \
    -e 's/#9ca3af/var(--text-muted)/g' \
    -e 's/#a1a1aa/var(--text-muted)/g' \
    \
    -e 's/#64748b/var(--text-dim)/g' \
    -e 's/#6b7280/var(--text-dim)/g' \
    -e 's/#475569/var(--text-dim)/g' \
    -e 's/#71717a/var(--text-dim)/g' \
    \
    -e 's/#cbd5e1/var(--text)/g' \
    -e 's/#d1d5db/var(--text)/g' \
    -e 's/#e5e7eb/var(--text)/g' \
    -e 's/#f1f5f9/var(--text)/g' \
    \
    -e 's/#60a5fa/var(--info)/g' \
    -e 's/#3b82f6/var(--info)/g' \
    -e 's/#2563eb/var(--info)/g' \
    \
    -e 's/#a78bfa/var(--purple)/g' \
    -e 's/#7c3aed/var(--purple)/g' \
    -e 's/#8b5cf6/var(--purple)/g' \
    -e 's/#c084fc/var(--purple)/g' \
    \
    -e 's/#34d399/var(--credit)/g' \
    -e 's/#10b981/var(--accent)/g' \
    -e 's/#059669/var(--accent)/g' \
    -e 's/#00aa69/var(--accent)/g' \
    \
    -e 's/#f87171/var(--debit)/g' \
    -e 's/#ef4444/var(--debit)/g' \
    -e 's/#dc2626/var(--debit)/g' \
    \
    -e 's/#fbbf24/var(--warning)/g' \
    -e 's/#f59e0b/var(--warning)/g' \
    -e 's/#d97706/var(--warning)/g' \
    -e 's/#b45309/var(--warning)/g' \
    \
    -e 's/#1e293b/var(--bg-surface)/g' \
    -e 's/#0f172a/var(--bg-app)/g' \
    -e 's/#334155/var(--bg-surface-2)/g' \
    "$f"
done

echo ""
echo "Done. Files changed:"
echo "$FILES"
echo ""
echo "Review the changes with: git diff"
echo "If something looks wrong, revert a single file with: git checkout -- <file>"