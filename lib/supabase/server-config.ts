import "server-only";

const requireEnvironmentVariable = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const getSupabaseSecretKey = () =>
  requireEnvironmentVariable(
    process.env.SUPABASE_SECRET_KEY,
    "SUPABASE_SECRET_KEY",
  );
