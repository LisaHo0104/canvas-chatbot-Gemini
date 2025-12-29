# Polar Payment Integration Setup Guide

## Environment Variables

Update your `.env.local` file with the following Polar configuration:

```bash
# Polar Access Token (from Polar Dashboard)
POLAR_ACCESS_TOKEN=your_polar_access_token_here

# Polar Webhook Secret (from Polar Dashboard)
POLAR_WEBHOOK_SECRET=your_polar_webhook_secret_here

# Polar Product ID (Premium Subscription)
NEXT_PUBLIC_POLAR_PRODUCT_ID_PRO=11e3a7bc-3786-48ff-853a-7e14e960c1e1

# Polar Server (optional: "sandbox" or "production", defaults to production)
POLAR_SERVER=production

# Polar URLs (optional, defaults provided)
# If not set, the app will automatically use VERCEL_URL on Vercel deployments
# For local development, it defaults to http://localhost:3000
POLAR_SUCCESS_URL=http://localhost:3000/checkout/success
POLAR_RETURN_URL=http://localhost:3000/account/billing

# Supabase Schema (set to dev to match payment tables)
NEXT_PUBLIC_SUPABASE_SCHEMA=dev

# Note: NEXT_PUBLIC_APP_URL is no longer needed!
# The app automatically uses VERCEL_URL (set by Vercel) in production/preview environments.
# For local development, it defaults to http://localhost:3000
```

## Migration Complete

All Stripe dependencies have been removed and replaced with Polar:

- ✅ Installed `@polar-sh/nextjs` package
- ✅ Created database migration for `dev` schema with Polar field names
- ✅ Created Polar library files (`src/lib/polar/`)
- ✅ Replaced checkout route (`/checkout`)
- ✅ Replaced portal route (`/portal`)
- ✅ Replaced webhook handler (`/api/webhook/polar`)
- ✅ Updated pricing page to use Polar product IDs
- ✅ Updated billing page to use Polar customer portal and dev schema
- ✅ Updated success page for Polar checkout flow
- ✅ Removed all Stripe files

## Database Migration

Run the migration to create Polar payment tables in the `dev` schema:

```bash
supabase migration up
```

The migration file is located at:
`supabase/migrations/20251227140635_migrate_stripe_to_polar_dev_schema.sql`

## Webhook Configuration

Configure the webhook endpoint in your Polar Dashboard:
- URL: `https://your-domain.com/api/webhook/polar`
- Secret: Use the `POLAR_WEBHOOK_SECRET` value

## Testing

1. Set up environment variables
2. Run database migration
3. Test checkout flow: `/pricing` → Select plan → `/checkout?products=...`
4. Test customer portal: `/account/billing` → Manage Subscription
5. Verify webhook events are being received and processed

