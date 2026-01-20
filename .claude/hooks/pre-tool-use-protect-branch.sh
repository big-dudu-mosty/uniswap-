#!/bin/bash

# Pre-Tool-Use Hook: Protect Main Branch
# This hook prevents code modifications on protected branches

# Hook receives event data via stdin as JSON
EVENT=$(cat)

# Extract tool name
TOOL_NAME=$(echo "$EVENT" | jq -r '.tool_name')

# Only check for destructive tools
if [[ "$TOOL_NAME" != "Edit" ]] && [[ "$TOOL_NAME" != "Write" ]] && [[ "$TOOL_NAME" != "MultiEdit" ]]; then
  exit 0
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)

# List of protected branches
PROTECTED_BRANCHES=("main" "master" "production")

# Check if current branch is protected
for branch in "${PROTECTED_BRANCHES[@]}"; do
  if [[ "$CURRENT_BRANCH" == "$branch" ]]; then
    echo "❌ ERROR: Cannot modify code on protected branch '$CURRENT_BRANCH'"
    echo ""
    echo "Please create a feature branch first:"
    echo "  git checkout -b feature/your-feature-name"
    echo ""
    echo "Or switch to an existing branch:"
    echo "  git checkout <branch-name>"
    echo ""
    echo "Protected branches: ${PROTECTED_BRANCHES[*]}"

    # Exit with error to block the tool execution
    exit 1
  fi
done

# Check if there are uncommitted changes (optional warning)
if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
  echo "⚠️  Warning: You have uncommitted changes"
  echo "   Consider committing or stashing them before making new changes"
  echo ""
fi

# Allow the operation
exit 0
