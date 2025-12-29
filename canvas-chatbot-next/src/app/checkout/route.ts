import { Checkout } from "@polar-sh/nextjs";
import { getAppUrl } from '@/lib/utils/get-app-url';

export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: process.env.POLAR_SUCCESS_URL || getAppUrl('/checkout/success'),
  returnUrl: process.env.POLAR_RETURN_URL || getAppUrl(),
  server: (process.env.POLAR_SERVER as "sandbox" | "production") || "production",
  theme: "light", // Can be "light", "dark", or omitted for system preference
});

