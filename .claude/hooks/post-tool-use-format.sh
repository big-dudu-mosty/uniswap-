#!/bin/bash

# Post-Tool-Use Hook: Auto-format Code
# This hook automatically formats code after Edit or Write operations

# Hook receives event data via stdin as JSON
EVENT=$(cat)

# Extract tool name and file path using jq
TOOL_NAME=$(echo "$EVENT" | jq -r '.tool_name')
FILE_PATH=$(echo "$EVENT" | jq -r '.tool_input.file_path // empty')

# Only run for Edit and Write tools
if [[ "$TOOL_NAME" != "Edit" ]] && [[ "$TOOL_NAME" != "Write" ]]; then
  exit 0
fi

# Only format if file path is provided
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Get file extension
FILE_EXT="${FILE_PATH##*.}"

# Format based on file type
case "$FILE_EXT" in
  ts|tsx|js|jsx)
    echo "🎨 Formatting TypeScript/JavaScript file: $FILE_PATH"

    # Run ESLint auto-fix
    if command -v eslint &> /dev/null; then
      eslint --fix "$FILE_PATH" 2>/dev/null || true
    fi

    # Run Prettier
    if command -v prettier &> /dev/null; then
      prettier --write "$FILE_PATH" 2>/dev/null || true
    fi

    echo "✅ Code formatted successfully"
    ;;

  sol)
    echo "🎨 Formatting Solidity file: $FILE_PATH"

    # Run Prettier with Solidity plugin
    if command -v prettier &> /dev/null; then
      prettier --write "$FILE_PATH" --plugin=prettier-plugin-solidity 2>/dev/null || true
    fi

    echo "✅ Solidity file formatted successfully"
    ;;

  json)
    echo "🎨 Formatting JSON file: $FILE_PATH"

    # Format JSON using jq
    if command -v jq &> /dev/null; then
      TMP_FILE=$(mktemp)
      jq '.' "$FILE_PATH" > "$TMP_FILE" 2>/dev/null && mv "$TMP_FILE" "$FILE_PATH" || rm "$TMP_FILE"
    fi

    echo "✅ JSON formatted successfully"
    ;;

  md|markdown)
    echo "🎨 Formatting Markdown file: $FILE_PATH"

    if command -v prettier &> /dev/null; then
      prettier --write "$FILE_PATH" --prose-wrap always 2>/dev/null || true
    fi

    echo "✅ Markdown formatted successfully"
    ;;

  *)
    # Unknown file type, skip formatting
    exit 0
    ;;
esac

exit 0
