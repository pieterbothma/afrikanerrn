#!/bin/bash

# Script to set up EAS environment variables for Afrikaner.ai
# Run this script to configure production secrets

echo "🔐 Setting up EAS environment variables for Afrikaner.ai"
echo ""

# Check if EXPO_TOKEN is set
if [ -z "$EXPO_TOKEN" ]; then
  echo "⚠️  EXPO_TOKEN not set. Please set it first:"
  echo "   export EXPO_TOKEN=your_token_here"
  exit 1
fi

# Read from .env.local if it exists
if [ -f .env.local ]; then
  source .env.local
fi

# Set Supabase URL
if [ -n "$EXPO_PUBLIC_SUPABASE_URL" ]; then
  echo "📦 Setting EXPO_PUBLIC_SUPABASE_URL..."
  eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "$EXPO_PUBLIC_SUPABASE_URL" --scope project --type string --visibility plaintext --environment production --force --non-interactive
else
  echo "⚠️  EXPO_PUBLIC_SUPABASE_URL not found in .env.local"
fi

# Set Supabase Anon Key
if [ -n "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "📦 Setting EXPO_PUBLIC_SUPABASE_ANON_KEY..."
  eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "$EXPO_PUBLIC_SUPABASE_ANON_KEY" --scope project --type string --visibility plaintext --environment production --force --non-interactive
else
  echo "⚠️  EXPO_PUBLIC_SUPABASE_ANON_KEY not found in .env.local"
fi

# Set OpenAI API Key
if [ -n "$OPENAI_API_KEY" ]; then
  echo "📦 Setting EXPO_PUBLIC_OPENAI_API_KEY..."
  eas env:create --name EXPO_PUBLIC_OPENAI_API_KEY --value "$OPENAI_API_KEY" --scope project --type string --visibility plaintext --environment production --force --non-interactive
else
  echo "⚠️  OPENAI_API_KEY not found in .env.local"
fi

# Set Sentry DSN (optional)
if [ -n "$EXPO_PUBLIC_SENTRY_DSN" ]; then
  echo "📦 Setting EXPO_PUBLIC_SENTRY_DSN..."
  eas env:create --name EXPO_PUBLIC_SENTRY_DSN --value "$EXPO_PUBLIC_SENTRY_DSN" --scope project --type string --visibility secret --environment production --force --non-interactive
else
  echo "ℹ️  EXPO_PUBLIC_SENTRY_DSN not set (optional)"
fi

echo ""
echo "✅ Done! Verify with: eas env:list"

