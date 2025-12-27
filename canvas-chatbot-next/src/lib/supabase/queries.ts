import { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';

export const getProducts = cache(async (supabase: SupabaseClient) => {
  const { data: products, error } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .order('price_amount', { referencedTable: 'prices', ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    return null;
  }

  return products;
});

export const getSubscription = cache(async (supabase: SupabaseClient) => {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .in('status', ['trialing', 'active'])
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching subscription:', error);
    return null;
  }

  return subscription;
});

