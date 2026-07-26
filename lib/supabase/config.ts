const requireEnvironmentVariable = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const getSupabasePublicConfig = () => ({
  url: requireEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
  publishableKey: requireEnvironmentVariable(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ),
});

export const getSupabaseSecretKey = () =>
  requireEnvironmentVariable("SUPABASE_SECRET_KEY");

