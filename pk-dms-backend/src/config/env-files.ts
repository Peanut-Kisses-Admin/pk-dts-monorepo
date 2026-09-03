export function normalizeAppEnv(appEnv?: string): string {
  if (!appEnv) {
    return 'development';
  }

  const normalized = appEnv.toLowerCase();

  if (normalized === 'dev') {
    return 'development';
  }

  if (normalized === 'prod') {
    return 'production';
  }

  return normalized;
}

export function resolveEnvFilePaths(appEnv?: string): string[] {
  const normalized = normalizeAppEnv(appEnv);

  return [`.env.${normalized}`, '.env'];
}
