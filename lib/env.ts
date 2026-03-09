export function getEnv(name: string) {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

export function requireEnv(name: string) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

export function isExternalServicesMocked() {
  return getEnv('MOCK_EXTERNAL_SERVICES') === 'true';
}
