'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { Polar } from '@polar-sh/sdk';
import type { WebhookProductUpdatedPayload } from '@polar-sh/sdk/models/components/webhookproductupdatedpayload';
import type { WebhookProductCreatedPayload } from '@polar-sh/sdk/models/components/webhookproductcreatedpayload';
import type { WebhookSubscriptionUpdatedPayload } from '@polar-sh/sdk/models/components/webhooksubscriptionupdatedpayload';
import type { WebhookSubscriptionCreatedPayload } from '@polar-sh/sdk/models/components/webhooksubscriptioncreatedpayload';

// Initialize Polar client
const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox'
});

/**
 * Upserts a product record and its prices from Polar webhook payload
 * Uses factory function pattern (creates fresh client each call)
 */
export async function upsertProductRecord(
  payload:
    | WebhookProductUpdatedPayload
    | WebhookProductCreatedPayload
) {
  const supabaseAdmin = createServiceRoleClient();
  const product = payload.data;

  // Prepare product data
  const productData = {
    id: product.id,
    active: !product.isArchived,
    name: product.name,
    description: product.description ?? null,
    image: product.medias?.[0]?.publicUrl ?? null,
    metadata: product.metadata ?? null
  };

  // Upsert product
  const { error: upsertError } = await supabaseAdmin
    .from('products')
    .upsert([productData]);

  if (upsertError) {
    throw new Error(`Product insert/update failed: ${upsertError.message}`);
  }
  console.log(`Product inserted/updated: ${product.id}`);

  // Prepare price data
  const priceData = product.prices.map((price) => ({
    id: price.id,
    product_id: product.id,
    price_amount: price.amountType === 'fixed' ? price.priceAmount : null,
    type: price.type, // Polar returns 'recurring' or 'one_time' directly
    recurring_interval:
      price.type === 'recurring' && price.recurringInterval
        ? price.recurringInterval
        : null,
    metadata: ('metadata' in price && price.metadata) ? price.metadata : null
  }));

  // Upsert prices
  const { error: priceUpsertError } = await supabaseAdmin
    .from('prices')
    .upsert(priceData);

  if (priceUpsertError) {
    throw new Error(`Price insert/update failed: ${priceUpsertError.message}`);
  }
  console.log(`Price inserted/updated: ${priceData.map((p) => p.id).join(', ')}`);
}

/**
 * Upserts customer mapping to Supabase customers table
 * Uses factory function pattern
 */
async function upsertCustomerToSupabase(uuid: string, customerId: string) {
  const supabaseAdmin = createServiceRoleClient();
  const { error: upsertError } = await supabaseAdmin
    .from('customers')
    .upsert([{ id: uuid, polar_customer_id: customerId }]);

  if (upsertError) {
    throw new Error(
      `Supabase customer record creation failed: ${upsertError.message}`
    );
  }

  return customerId;
}

/**
 * Finds a Polar customer by external_id
 */
async function findPolarCustomerByExternalId(externalId: string): Promise<string | null> {
  try {
    // Try to get customer by external_id using getExternal method
    const customer = await polar.customers.getExternal({
      externalId: externalId
    });
    return customer.id;
  } catch (error: any) {
    // If customer doesn't exist (404), return null
    if (error.statusCode === 404 || error.error === 'ResourceNotFound') {
      return null;
    }
    // For other errors, log and return null
    console.warn(`Failed to get customer by external_id ${externalId}:`, error);
    return null;
  }
}

/**
 * Creates a customer in Polar
 * Returns the customer ID, or throws an error if creation fails
 */
async function createCustomerInPolar(uuid: string, email: string): Promise<string> {
  const customerData = {
    metadata: { supabaseUUID: uuid },
    email: email,
    organizationId: process.env.POLAR_ORGANIZATION_ID,
    externalId: uuid // Use Supabase UUID as external ID
  };
  
  try {
    const newCustomer = await polar.customers.create(customerData);
    if (!newCustomer) {
      throw new Error('Polar customer creation failed.');
    }
    return newCustomer.id;
  } catch (error: any) {
    // If customer already exists (422 error), try to find it by external_id
    if (error.statusCode === 422 || error.error === 'PolarRequestValidationError') {
      const errorDetail = error.detail || error.body?.detail || [];
      const hasEmailError = errorDetail.some((d: any) => 
        d.loc?.includes('email') && d.msg?.includes('already exists')
      );
      const hasExternalIdError = errorDetail.some((d: any) => 
        d.loc?.includes('external_id') && d.msg?.includes('already exists')
      );

      if (hasEmailError || hasExternalIdError) {
        console.log(`Customer already exists in Polar, searching by external_id: ${uuid}`);
        const existingCustomerId = await findPolarCustomerByExternalId(uuid);
        if (existingCustomerId) {
          console.log(`Found existing Polar customer: ${existingCustomerId}`);
          return existingCustomerId;
        }
        // If we can't find it by external_id, try to get by email
        // Note: Polar API might not support direct email search, so we'll throw a more helpful error
        throw new Error(
          `Customer with email ${email} or external_id ${uuid} already exists in Polar, ` +
          `but could not retrieve the customer ID. Please check Polar dashboard.`
        );
      }
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Creates or retrieves a Polar customer for a given user
 * Uses factory function pattern
 */
export async function createOrRetrieveCustomer({
  email,
  uuid
}: {
  email: string;
  uuid: string;
}) {
  const supabaseAdmin = createServiceRoleClient();
  const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public';

  // Check if the customer already exists in Supabase
  const { data: existingSupabaseCustomer, error: queryError } =
    await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', uuid)
      .maybeSingle();

  if (queryError) {
    // Provide more helpful error message including schema info
    const errorMessage = queryError.message.includes('permission denied')
      ? `Supabase customer lookup failed: ${queryError.message}. ` +
        `Schema: ${schema}. ` +
        `Make sure NEXT_PUBLIC_SUPABASE_SCHEMA is set correctly and service role key has access.`
      : `Supabase customer lookup failed: ${queryError.message}`;
    throw new Error(errorMessage);
  }

  // Retrieve the Polar customer ID using the Supabase customer ID
  let polarCustomerId: string | undefined;
  if (existingSupabaseCustomer?.polar_customer_id) {
    try {
      const existingPolarCustomer = await polar.customers.get({
        id: existingSupabaseCustomer.polar_customer_id
      });
      polarCustomerId = existingPolarCustomer.id;
    } catch (error: any) {
      // If customer not found (404), try to find by external_id
      if (error.statusCode === 404 || error.error === 'ResourceNotFound') {
        console.warn(
          `Polar customer ${existingSupabaseCustomer.polar_customer_id} not found, ` +
          `searching by external_id: ${uuid}`
        );
        const foundCustomerId = await findPolarCustomerByExternalId(uuid);
        if (foundCustomerId) {
          polarCustomerId = foundCustomerId;
          console.log(`Found Polar customer by external_id: ${foundCustomerId}`);
        } else {
          console.warn('Could not find Polar customer by external_id, will try to create or find by email');
        }
      } else {
        console.warn('Failed to retrieve Polar customer:', error);
      }
    }
  }

  // If still no polarCustomerId, create a new customer in Polar (or find existing one)
  const polarIdToInsert = polarCustomerId
    ? polarCustomerId
    : await createCustomerInPolar(uuid, email);
  
  if (!polarIdToInsert) {
    throw new Error('Polar customer creation failed.');
  }

  if (existingSupabaseCustomer && polarCustomerId) {
    // If Supabase has a record but doesn't match Polar, update Supabase record
    if (existingSupabaseCustomer.polar_customer_id !== polarCustomerId) {
      const { error: updateError } = await supabaseAdmin
        .from('customers')
        .update({ polar_customer_id: polarCustomerId })
        .eq('id', uuid);

      if (updateError) {
        throw new Error(
          `Supabase customer record update failed: ${updateError.message}`
        );
      }
      console.warn(
        `Supabase customer record mismatched Polar ID. Supabase record updated.`
      );
    }
    // If Supabase has a record and matches Polar, return Polar customer ID
    return polarCustomerId;
  } else {
    console.warn(
      `Supabase customer record was missing. A new record was created.`
    );

    // If Supabase has no record, create a new record and return Polar customer ID
    const upsertedPolarCustomer = await upsertCustomerToSupabase(
      uuid,
      polarIdToInsert
    );
    if (!upsertedPolarCustomer) {
      throw new Error('Supabase customer record creation failed.');
    }

    return upsertedPolarCustomer;
  }
}

/**
 * Manages subscription status changes from Polar webhooks
 * Handles both created and updated subscription events
 * Uses factory function pattern
 */
export async function manageSubscriptionStatusChange(
  payload:
    | WebhookSubscriptionUpdatedPayload
    | WebhookSubscriptionCreatedPayload
) {
  const supabaseAdmin = createServiceRoleClient();
  const polarCustomerId = payload.data.customer.id;
  const customerEmail = payload.data.customer.email || '';

  // Get customer's UUID from mapping table
  let { data: customerData, error: noCustomerError } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('polar_customer_id', polarCustomerId)
    .single();

  if (noCustomerError || !customerData) {
    // Try to get customer UUID from customer metadata, external_id, or fetch from Polar API
    const customerMetadata = payload.data.customer.metadata as Record<string, any> | undefined;
    let customerIdFromMetadata = customerMetadata?.['customerId'] || 
                                 customerMetadata?.['supabaseUUID'] ||
                                 payload.data.customer.externalId;

    // If still not found, try fetching the customer from Polar API
    if (!customerIdFromMetadata) {
      try {
        const polarCustomer = await polar.customers.get({ id: polarCustomerId });
        customerIdFromMetadata = polarCustomer.metadata?.['supabaseUUID'] as string | undefined ||
                                 polarCustomer.externalId ||
                                 undefined;
      } catch (error) {
        console.warn(`Failed to fetch customer from Polar API: ${error}`);
      }
    }

    // If we still don't have a UUID, try to find user by email
    if (!customerIdFromMetadata && customerEmail) {
      // First, try to find in dev.users by email
      const { data: userByEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', customerEmail)
        .maybeSingle();

      if (userByEmail?.id) {
        customerIdFromMetadata = userByEmail.id;
        console.log(`Found user by email in dev.users: ${customerIdFromMetadata}`);
      } else {
        // Try to find in auth.users by email
        try {
          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
          const authUser = authUsers.users.find(u => u.email === customerEmail);
          if (authUser?.id) {
            customerIdFromMetadata = authUser.id;
            console.log(`Found user by email in auth.users: ${customerIdFromMetadata}`);
          }
        } catch (error) {
          console.warn(`Failed to search auth.users by email: ${error}`);
        }
      }
    }

    // If we still don't have a UUID, we can't proceed
    if (!customerIdFromMetadata) {
      throw new Error(
        `Cannot find customer mapping for Polar customer ${polarCustomerId}. ` +
        `No metadata found in webhook payload or Polar API. ` +
        `Customer email: ${customerEmail || 'unknown'}`
      );
    }

    // Create or retrieve the customer mapping
    const createdCustomerId = await createOrRetrieveCustomer({
      email: customerEmail,
      uuid: customerIdFromMetadata as string
    });

    // Get the customer data again after creation
    const { data: newCustomerData } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('polar_customer_id', createdCustomerId)
      .single();

    if (!newCustomerData) {
      throw new Error('Failed to retrieve customer after creation');
    }

    customerData = newCustomerData;
  }

  // Ensure user exists in dev.users table BEFORE inserting subscription
  // First, try to get the user's email from profiles or auth.users
  let userEmail = customerEmail;
  
  if (!userEmail) {
    // Try to get email from profiles table
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', customerData.id)
      .single();
    
    if (profile?.email) {
      userEmail = profile.email;
    } else {
      // Try to get email from auth.users
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(customerData.id);
        if (authUser?.user?.email) {
          userEmail = authUser.user.email;
        }
      } catch (error) {
        console.warn(`Failed to get user email from auth.users: ${error}`);
      }
    }
  }

  // If we still don't have an email, use a placeholder (but this shouldn't happen)
  if (!userEmail) {
    userEmail = `user-${customerData.id}@placeholder.local`;
    console.warn(`No email found for user ${customerData.id}, using placeholder`);
  }

  // Upsert user record in dev.users table FIRST (ensures it exists before subscription insert)
  const { error: upsertUserError } = await supabaseAdmin
    .from('users')
    .upsert({
      id: customerData.id,
      email: userEmail,
      subscription_status: payload.data.status,
      current_plan_id: payload.data.product?.id || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    });

  if (upsertUserError) {
    throw new Error(
      `Failed to upsert user record before subscription insert: ${upsertUserError.message}`
    );
  }

  console.log(
    `Upserted user record for user [${customerData.id}] with email [${userEmail}]`
  );

  const subscription = payload.data;

  // Get the price ID - handle both singular price and prices array (for different SDK versions)
  const priceId = (subscription as any).price?.id || subscription.prices?.[0]?.id || null;

  // Ensure price exists in database before creating subscription
  // This handles cases where subscription webhook arrives before product/price webhooks
  let verifiedPriceId: string | null = null;
  
  if (priceId) {
    // Check if price exists
    const { data: existingPrice, error: priceCheckError } = await supabaseAdmin
      .from('prices')
      .select('id')
      .eq('id', priceId)
      .maybeSingle();

    if (priceCheckError) {
      console.warn(`Error checking price existence: ${priceCheckError.message}`);
    }

    // If price doesn't exist, try to create it from subscription data
    if (!existingPrice) {
      console.warn(
        `Price ${priceId} not found in database. Attempting to create from subscription data.`
      );

      // Get price data from subscription
      const priceData = (subscription as any).price || subscription.prices?.[0];
      const productId = subscription.product?.id;

      if (priceData && productId) {
        // First ensure the product exists
        const { data: existingProduct } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('id', productId)
          .maybeSingle();

        if (!existingProduct && subscription.product) {
          // Create the product if it doesn't exist
          const { error: productError } = await supabaseAdmin
            .from('products')
            .upsert({
              id: productId,
              active: !subscription.product.isArchived,
              name: subscription.product.name,
              description: subscription.product.description ?? null,
              image: subscription.product.medias?.[0]?.publicUrl ?? null,
              metadata: subscription.product.metadata ?? null
            });

          if (productError) {
            console.warn(`Failed to create product ${productId}: ${productError.message}`);
          } else {
            console.log(`Created missing product: ${productId}`);
          }
        }

        // Create the price
        const priceToInsert = {
          id: priceId,
          product_id: productId,
          price_amount: priceData.amountType === 'fixed' ? priceData.priceAmount : null,
          type: priceData.type,
          recurring_interval:
            priceData.type === 'recurring' && priceData.recurringInterval
              ? priceData.recurringInterval
              : null,
          metadata: ('metadata' in priceData && priceData.metadata) ? priceData.metadata : null
        };

        const { error: priceCreateError } = await supabaseAdmin
          .from('prices')
          .upsert([priceToInsert]);

        if (priceCreateError) {
          console.warn(
            `Failed to create price ${priceId}: ${priceCreateError.message}. ` +
            `Subscription will be created without price_id.`
          );
        } else {
          console.log(`Created missing price: ${priceId}`);
          verifiedPriceId = priceId;
        }
      } else {
        console.warn(
          `Cannot create price ${priceId}: missing price data or product ID in subscription payload.`
        );
      }
    } else {
      // Price exists, use it
      verifiedPriceId = priceId;
    }
  }

  // Prepare subscription data
  // Note: id is auto-generated UUID, polar_subscription_id is the Polar subscription ID
  const subscriptionData = {
    user_id: customerData.id,
    polar_subscription_id: subscription.id, // Use Polar subscription ID
    polar_product_id: subscription.product?.id || null,
    status: subscription.status,
    price_id: verifiedPriceId, // Use verified price_id (null if price doesn't exist and couldn't be created)
    cancel_at_period_end: subscription.cancelAtPeriodEnd || false,
    current_period_start: subscription.currentPeriodStart
      ? subscription.currentPeriodStart.toISOString()
      : null,
    current_period_end: subscription.currentPeriodEnd
      ? subscription.currentPeriodEnd.toISOString()
      : null,
    updated_at: new Date().toISOString()
  };

  // Upsert subscription using polar_subscription_id as conflict target
  const { error: upsertError } = await supabaseAdmin
    .from('subscriptions')
    .upsert([subscriptionData], {
      onConflict: 'polar_subscription_id'
    });

  if (upsertError) {
    // If it's still a foreign key error, try without price_id as fallback
    if (upsertError.message.includes('foreign key constraint') && verifiedPriceId) {
      console.warn(
        `Foreign key error with price_id ${verifiedPriceId}, retrying without it`
      );
      const subscriptionDataWithoutPrice = {
        ...subscriptionData,
        price_id: null
      };
      
      const { error: retryError } = await supabaseAdmin
        .from('subscriptions')
        .upsert([subscriptionDataWithoutPrice], {
          onConflict: 'polar_subscription_id'
        });

      if (retryError) {
        throw new Error(
          `Subscription insert/update failed even without price_id: ${retryError.message}`
        );
      }
      
      console.log(
        `Inserted/updated subscription [${subscription.id}] for user [${customerData.id}] without price_id`
      );
    } else {
      throw new Error(
        `Subscription insert/update failed: ${upsertError.message}`
      );
    }
  }
  
  console.log(
    `Inserted/updated subscription [${subscription.id}] for user [${customerData.id}]`
  );

  // Update user subscription status after successful subscription upsert
  const { error: updateUserError } = await supabaseAdmin
    .from('users')
    .update({
      subscription_status: subscription.status,
      current_plan_id: subscription.product?.id || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', customerData.id);

  if (updateUserError) {
    console.warn(
      `Failed to update user subscription status: ${updateUserError.message}`
    );
  } else {
    console.log(
      `Updated user subscription status for user [${customerData.id}] to [${subscription.status}]`
    );
  }
}

