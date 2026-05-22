#!/bin/bash
echo "=== Syncing cover-related files to global server ==="

# List of files to sync
FILES=(
  "project/apps/web/src/components/CoverEditor.tsx"
  "project/apps/web/src/components/CollectionForm.tsx"
  "project/apps/web/src/app/edit/[id]/page.tsx"
  "project/apps/web/src/app/add/page.tsx"
)

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    echo "Syncing $FILE..."
    # Get the destination path relative to apps/web
    DEST_FILE=$(echo "$FILE" | sed 's|project/apps/web/||')
    # Copy to temp first
    scp "$FILE" "ubuntu@43.133.44.232:/tmp/$(basename $FILE)"
    # Then move to correct location
    ssh "ubuntu@43.133.44.232" "mv /tmp/$(basename $FILE) /opt/linkchest/api/apps/web/$DEST_FILE"
    echo "✓ Synced $FILE"
  else
    echo "✗ File not found: $FILE"
  fi
done

echo -e "\n=== All files synced ==="
