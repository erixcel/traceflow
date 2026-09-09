async function main() {
  const { rm } = await import('node:fs/promises');
  const { resolve } = await import('node:path');

  const projectRoot = resolve(__dirname, '..');
  const requestedPaths = process.argv.slice(2);
  const generatedPaths = (requestedPaths.length > 0 ? requestedPaths : ['dist', 'packages/traceflow/dist', 'packages/traceflow-kit/dist']).map((path) => resolve(projectRoot, path));

  await Promise.all(generatedPaths.map((generatedPath) => rm(generatedPath, { recursive: true, force: true })));

  console.info('Artefactos generados eliminados.');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
