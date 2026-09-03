const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { loadEnv } = require('./env-runtime');

const rootDir = path.resolve(__dirname, '..');
const appEnv = process.argv[2];
const mode = process.argv[3] || 'start';

loadEnv(rootDir, appEnv);

function runNodeScript(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });

  return result.status ?? 1;
}

function runStep(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });

  return result.status ?? 1;
}

function statMtimeMs(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

function shouldGeneratePrismaClient() {
  const schemaPath = path.join(rootDir, 'prisma', 'schema.prisma');
  const generatedClientPath = path.join(
    rootDir,
    'node_modules',
    '.prisma',
    'client',
    'index.js',
  );
  const schemaMtimeMs = statMtimeMs(schemaPath);
  const clientMtimeMs = statMtimeMs(generatedClientPath);

  if (!schemaMtimeMs || !clientMtimeMs) {
    return true;
  }

  return clientMtimeMs < schemaMtimeMs;
}

const prismaWrapper = path.join(rootDir, 'scripts', 'prisma-env.js');
if (shouldGeneratePrismaClient()) {
  const generateStatus = runNodeScript(prismaWrapper, [
    '--app-env',
    process.env.APP_ENV,
    'generate',
  ]);

  if (generateStatus !== 0) {
    process.exit(generateStatus);
  }
} else {
  console.log('Prisma Client is up to date. Skipping generate.');
}

if (mode === 'prod') {
  if (process.env.SKIP_BUILD !== 'true') {
    const buildStatus = runStep('npm.cmd', ['run', 'build']);

    if (buildStatus !== 0) {
      process.exit(buildStatus);
    }
  }

  process.exit(runStep(process.execPath, ['./dist/main.js']));
}

const nestCli = path.join(rootDir, 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js');
const nestArgs = ['start'];

if (mode === 'watch') {
  nestArgs.push('--watch');
}

process.exit(runStep(process.execPath, [nestCli, ...nestArgs]));
