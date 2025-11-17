# Security Guide

## Environment Variables & Secrets Management

### Required Environment Variables

All sensitive keys must be stored in `.env.local` (which is gitignored) and never committed to version control.

Required variables:
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (safe to expose in client)
- `EXPO_PUBLIC_OPENAI_API_KEY` - OpenAI API key
- `EXPO_PUBLIC_REVENUECAT_API_KEY` - RevenueCat API key (test or production)
- `EXPO_PUBLIC_SENTRY_DSN` - Sentry DSN for error monitoring (optional)

### Security Best Practices

1. **Never commit secrets**: The `.gitignore` file excludes all `.env*` files except `.env.example`
2. **Use EXPO_PUBLIC_ prefix**: All client-side environment variables must use `EXPO_PUBLIC_` prefix (they will be bundled into the app)
3. **EAS Secrets**: For production builds, use EAS secrets:
   ```bash
   ./scripts/setup-eas-secrets.sh
   ```
4. **Supabase Anon Key**: The Supabase anon key is safe to expose in the client - it's protected by Row Level Security (RLS) policies
5. **API Keys**: OpenAI and RevenueCat keys are exposed in the client bundle. This is acceptable for these services as they have usage limits and rate limiting

### Verifying Secrets Are Not Committed

Run this command to check for accidentally committed secrets:
```bash
git log --all --full-history --source -- "*env*" "*secret*" "*key*" "*password*"
```

If any secrets are found, rotate them immediately.

## Row Level Security (RLS)

All database tables have RLS enabled with policies that ensure users can only access their own data:

### Profiles Table
- Users can SELECT and UPDATE their own profile only
- Policy: `auth.uid() = id`

### Messages Table
- Users can INSERT, SELECT, UPDATE, and DELETE their own messages only
- Policy: `auth.uid() = user_id`

### Usage Logs Table
- Users can INSERT and SELECT their own usage logs only
- Policy: `auth.uid() = user_id`

### Conversations Table
- Users can INSERT, SELECT, UPDATE, and DELETE their own conversations only
- Policy: `auth.uid() = user_id`

### Storage Bucket (chat-images)
- Authenticated users can upload images to their own folder (`{userId}/`)
- Public read access for images (for sharing)
- Policies ensure users can only upload to their own folder

## Code Security

### Console Logging
- Never log API keys, tokens, or sensitive user data
- Use `console.error` for errors (which are captured by Sentry in production)
- Avoid logging full error objects that might contain sensitive data

### Error Handling
- Errors are captured by Sentry for monitoring
- User-facing error messages don't expose internal details
- Sensitive information is stripped from error logs

### Input Validation
- All user inputs are validated before processing
- Image prompts are sanitized to prevent injection attacks
- File uploads are validated for size and type

## Production Checklist

Before deploying to production:

- [ ] Verify all secrets are set in EAS (not in code)
- [ ] Confirm `.env.local` is in `.gitignore`
- [ ] Test RLS policies are working correctly
- [ ] Verify storage bucket policies are configured
- [ ] Ensure Sentry is configured for error monitoring
- [ ] Review all console.log statements for sensitive data
- [ ] Test subscription flow end-to-end
- [ ] Verify usage limits are enforced correctly

## Reporting Security Issues

If you discover a security vulnerability, please report it privately to the maintainers rather than opening a public issue.

