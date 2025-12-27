import { Webhooks } from "@polar-sh/nextjs";
import {
  upsertProductRecord,
  manageSubscriptionStatusChange
} from '@/lib/supabase/admin';

/**
 * Webhook handler for Polar events
 * Handles product and subscription lifecycle events
 */
export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onProductCreated: upsertProductRecord,
  onProductUpdated: upsertProductRecord,
  onSubscriptionCreated: manageSubscriptionStatusChange,
  onSubscriptionUpdated: manageSubscriptionStatusChange
});

