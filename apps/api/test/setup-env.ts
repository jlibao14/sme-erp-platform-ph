// Sensible defaults so e2e specs can run without a full .env. DATABASE_URL must
// be provided by the environment (it points at the test Postgres, app role).
process.env.JWT_ACCESS_SECRET ||= 'test_access_secret';
process.env.JWT_REFRESH_SECRET ||= 'test_refresh_secret';
process.env.JWT_ACCESS_EXPIRES_IN ||= '15m';
process.env.JWT_REFRESH_EXPIRES_IN ||= '7d';
// Disable rate limiting noise during tests.
process.env.THROTTLE_LIMIT ||= '100000';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set for e2e tests');
}
