# Stripe Payment Integration Setup Guide

## Overview

This guide will help you set up the Stripe payment integration system that has been built for your Next.js application. The system includes subscription management, payment processing, webhook handling, and customer billing portal functionality.

## Features Implemented

✅ **Complete Payment Flow**
- Pricing page with 3 subscription tiers (Basic, Pro, Premium)
- Secure checkout process using Stripe Checkout
- Payment success and cancellation pages
- Customer billing portal for subscription management

✅ **Backend Infrastructure**
- Supabase database with users, subscriptions, payments, and webhook events tables
- Server-side API routes for checkout and portal session creation
- Comprehensive webhook handler for Stripe events
- Database service layer for user and subscription management

✅ **Security & Compliance**
- Webhook signature validation
- Row Level Security (RLS) policies
- PCI-compliant payment processing (no card data stored locally)
- Input validation with Zod schemas

✅ **User Experience**
- Responsive design with Tailwind CSS
- Loading states and error handling
- Toast notifications for user feedback
- Monthly/yearly billing toggle

## Setup Instructions

### 1. Stripe Account Setup

1. Create a Stripe account at https://stripe.com
2. Navigate to the Stripe Dashboard
3. Get your API keys:
   - **Test Mode**: Go to Developers → API keys
   - Copy your Publishable key (starts with `pk_test_`)
   - Copy your Secret key (starts with `sk_test_`)

### 2. Create Products and Prices

1. In Stripe Dashboard, go to Products
2. Create 3 products for your subscription tiers:
   - **Basic Plan**: $9/month
   - **Pro Plan**: $29/month  
   - **Premium Plan**: $99/month
3. Copy the Price IDs for each product (they look like `price_1234567890`)

### 3. Configure Environment Variables

Update your `.env.local` file with your actual Stripe credentials:

```bash
# Replace with your actual Stripe keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Replace with your actual Price IDs
NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC=price_your_basic_price_id
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_your_pro_price_id
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM=price_your_premium_price_id
```

### 4. Set Up Stripe Webhooks

1. Install Stripe CLI for local development:
```bash
brew install stripe/stripe-cli/stripe
```

2. Login to Stripe CLI:
```bash
stripe login
```

3. Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. Copy the webhook signing secret from the output and add it to your `.env.local`

### 5. Database Migration

Run the database migration to create the payment tables:

```bash
# Apply the migration to your Supabase database
npx supabase migration up
```

Or manually run the SQL in your Supabase dashboard:
- Go to SQL Editor
- Run the contents of `/supabase/migrations/20241202000000_payment_integration.sql`

### 6. Test the Integration

1. **Start your development server**:
```bash
npm run dev
```

2. **Test the pricing page**: Navigate to http://localhost:3000/pricing

3. **Test the checkout flow**:
   - Click on a plan
   - You'll be redirected to Stripe Checkout
   - Use test card: `4242 4242 4242 4242`
   - Any future date for expiry, any 3-digit CVC

4. **Test the billing portal**: After successful payment, go to http://localhost:3000/account/billing

## API Endpoints

- `POST /api/create-checkout-session` - Creates a Stripe Checkout session
- `POST /api/create-portal-session` - Creates a customer portal session
- `POST /api/webhooks/stripe` - Handles Stripe webhook events

## Database Schema

### Users Table
- `id`: UUID primary key
- `email`: User email
- `stripe_customer_id`: Stripe customer ID
- `subscription_status`: Current subscription status
- `current_plan_id`: Current plan ID

### Subscriptions Table
- `id`: UUID primary key
- `user_id`: Foreign key to users
- `stripe_subscription_id`: Stripe subscription ID
- `stripe_price_id`: Stripe price ID
- `status`: Subscription status
- `current_period_start/end`: Billing period dates

### Payments Table
- `id`: UUID primary key
- `user_id`: Foreign key to users
- `subscription_id`: Foreign key to subscriptions
- `stripe_payment_intent_id`: Stripe payment intent ID
- `amount`: Payment amount
- `currency`: Payment currency
- `status`: Payment status

### Webhook Events Table
- `id`: UUID primary key
- `stripe_event_id`: Stripe event ID
- `event_type`: Type of webhook event
- `payload`: Event payload (JSONB)
- `processed`: Whether event was processed

## Webhook Events Handled

- `checkout.session.completed` - User completed checkout
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed

## Security Features

✅ **Webhook Security**: All webhooks are validated using Stripe's signature
✅ **Input Validation**: All API inputs are validated with Zod schemas
✅ **Database Security**: RLS policies prevent unauthorized access
✅ **PCI Compliance**: No card data is stored locally - all handled by Stripe

## Testing

### Test Cards
Use these test cards in Stripe's test mode:

- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Requires Authentication**: 4000 0025 0000 3155
- **Insufficient Funds**: 4000 0000 0000 9995

### Test Webhooks
Use Stripe CLI to trigger test events:
```bash
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

## Production Deployment

1. **Update to Production Keys**: Replace test keys with production keys
2. **Configure Production Webhook**: Set up webhook endpoint in Stripe Dashboard
3. **Update Environment Variables**: Use production values in your deployment platform
4. **Test Thoroughly**: Test all payment flows in production mode

## Support

If you encounter issues:
1. Check Stripe Dashboard for webhook delivery status
2. Review server logs for error messages
3. Verify all environment variables are set correctly
4. Ensure database migrations are applied

## Next Steps

- Add email notifications for payment events
- Implement usage-based billing if needed
- Add subscription upgrade/downgrade functionality
- Implement coupon/discount system
- Add more detailed analytics and reporting