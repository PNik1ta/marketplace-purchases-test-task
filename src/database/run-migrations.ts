import dataSource from './data-source';

async function runMigrations(): Promise<void> {
  await dataSource.initialize();

  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}

runMigrations().catch((error: unknown) => {
  console.error('Failed to run database migrations', error);
  process.exit(1);
});
