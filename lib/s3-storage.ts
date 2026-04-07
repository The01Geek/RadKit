/**
 * S3 credential storage using browser.storage.sync.
 * Credentials roam across devices via sync storage.
 */

export interface S3Config {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  pathPrefix: string;
  acl: string;
}

const STORAGE_KEY = 's3Config';

const DEFAULT_CONFIG: S3Config = {
  endpoint: '',
  bucket: '',
  region: 'us-east-1',
  accessKeyId: '',
  secretAccessKey: '',
  pathPrefix: '',
  acl: 'public-read',
};

export async function getS3Config(): Promise<S3Config | null> {
  const result = await browser.storage.sync.get(STORAGE_KEY);
  const config = result[STORAGE_KEY] as S3Config | undefined;
  if (!config || !config.endpoint || !config.bucket || !config.accessKeyId || !config.secretAccessKey) {
    return null;
  }
  return config;
}

export async function saveS3Config(config: S3Config): Promise<void> {
  await browser.storage.sync.set({ [STORAGE_KEY]: config });
}

export async function clearS3Config(): Promise<void> {
  await browser.storage.sync.remove(STORAGE_KEY);
}

export function isConfigured(config: S3Config | null): config is S3Config {
  return config !== null &&
    config.endpoint.length > 0 &&
    config.bucket.length > 0 &&
    config.accessKeyId.length > 0 &&
    config.secretAccessKey.length > 0;
}

export { DEFAULT_CONFIG };
