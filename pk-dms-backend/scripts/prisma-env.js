const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { loadEnv } = require('./env-runtime');

const rootDir = path.resolve(__dirname, '..');
const rawArgs = process.argv.slice(2);
let appEnv;
const prismaArgs = [];

for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index];

  if (arg === '--app-env') {
    appEnv = rawArgs[index + 1];
    index += 1;
    continue;
  }

  prismaArgs.push(arg);
}

loadEnv(rootDir, appEnv || process.env.APP_ENV || process.env.NODE_ENV);

const schema = path.join(
  rootDir,
  process.env.PRISMA_SCHEMA_PATH || path.join('prisma', 'schema.prisma'),
);

const prismaCli = path.join(rootDir, 'node_modules', 'prisma', 'build', 'index.js');
const args = [prismaCli, ...prismaArgs, '--schema', schema];
const result = spawnSync(process.execPath, args, {
  cwd: rootDir,
  env: process.env,
  stdio: 'inherit',
  shell: false,
});

process.exit(result.status ?? 1);
