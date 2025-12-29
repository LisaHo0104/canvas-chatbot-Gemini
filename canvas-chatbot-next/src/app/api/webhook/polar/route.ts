import { Webhooks } from "@polar-sh/nextjs";
import {
  upsertProductRecord,
  manageSubscriptionStatusChange
} from '@/lib/supabase/admin';

/**
 * Webhook handler for Polar events
 * Handles product and subscription lifecycle events
 * 
 * Following Polar best practices:
 * - Validates webhook secret for security
 * - Handles product and subscription lifecycle events
 * - Automatically syncs products/prices before subscriptions to avoid FK constraints
 */
export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onProductCreated: upsertProductRecord,
  onProductUpdated: upsertProductRecord,
  onSubscriptionCreated: manageSubscriptionStatusChange,
  onSubscriptionUpdated: manageSubscriptionStatusChange
});

