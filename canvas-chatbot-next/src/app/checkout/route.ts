import { Checkout } from "@polar-sh/nextjs";

export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: process.env.POLAR_SUCCESS_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success`,
  returnUrl: process.env.POLAR_RETURN_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`,
  server: (process.env.POLAR_SERVER as "sandbox" | "production") || "production",
  theme: "light", // Can be "light", "dark", or omitted for system preference
});

