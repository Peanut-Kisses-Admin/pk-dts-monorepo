const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');

function normalizeAppEnv(appEnv) {
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

function resolveEnvFiles(rootDir, appEnv) {
  const normalized = normalizeAppEnv(appEnv);

  return [
    path.join(rootDir, `.env.${normalized}`),
    path.join(rootDir, '.env'),
  ];
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const values = {};
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);

    if (!match) {
      continue;
    }

    values[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
  }

  return values;
}

function loadEnv(rootDir, appEnv) {
  const normalized = normalizeAppEnv(appEnv);
  const envFiles = resolveEnvFiles(rootDir, normalized);
  const merged = {};

  for (const envFile of envFiles.reverse()) {
    Object.assign(merged, parseEnvFile(envFile));
  }

  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  process.env.APP_ENV = normalized;

  if (process.env.NODE_ENV === undefined) {
    process.env.NODE_ENV = normalized;
  }

  return { appEnv: normalized, envFiles };
}

module.exports = {
  loadEnv,
  normalizeAppEnv,
  resolveEnvFiles,
};
