import { CustomerPortal } from "@polar-sh/nextjs";
import { NextRequest } from "next/server";
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { createOrRetrieveCustomer } from '@/lib/supabase/admin';
import { getAppUrl } from '@/lib/utils/get-app-url';

export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? '',
  returnUrl: process.env.POLAR_RETURN_URL || getAppUrl('/account/billing'),
  server: (process.env.POLAR_SERVER as "sandbox" | "production") || "production",
  getCustomerId: async (req: NextRequest) => {
    const supabase = createRouteHandlerClient(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not found');
    }

    return createOrRetrieveCustomer({
      email: user.email ?? '',
      uuid: user.id
    });
  }
});

