const requireEnvironmentVariable = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const getSupabasePublicConfig = () => ({
  // Public variables must use direct property access so Next/Vinext can
  // replace them in the browser bundle during the production build.
  url: requireEnvironmentVariable(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  ),
  publishableKey: requireEnvironmentVariable(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ),
});

export const getSupabaseSecretKey = () =>
  requireEnvironmentVariable(
    process.env.SUPABASE_SECRET_KEY,
    "SUPABASE_SECRET_KEY",
  );
