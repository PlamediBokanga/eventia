const DEFAULT_INSECURE_SECRET = "dev-secret-change-me";

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function requireEnv(name: string) {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requireSecret(name: string) {
  const value = requireEnv(name);
  if (value === DEFAULT_INSECURE_SECRET) {
    throw new Error(`Insecure default secret is not allowed for ${name}`);
  }
  return value;
}

export const appConfig = {
  get port() {
    return Number(process.env.PORT || 4000);
  },
  get corsOrigin() {
    return requireEnv("CORS_ORIGIN");
  },
  get jwtSecret() {
    return requireSecret("JWT_SECRET");
  },
  get passwordResetSecret() {
    return readEnv("PASSWORD_RESET_SECRET") || requireSecret("JWT_SECRET");
  },
  get emailVerificationSecret() {
    return readEnv("EMAIL_VERIFICATION_SECRET") || requireSecret("JWT_SECRET");
  },
  get appUrl() {
    return readEnv("APP_URL");
  },
  get frontendUrl() {
    return readEnv("FRONTEND_URL");
  },
  get frontendAppUrl() {
    return readEnv("FRONTEND_APP_URL");
  }
};

export function validateConfig() {
  void appConfig.corsOrigin;
  void appConfig.jwtSecret;
  void appConfig.passwordResetSecret;
  void appConfig.emailVerificationSecret;
}
