/**
 * S3 credentials storage utilities.
 * Uses browser.storage.sync for cross-device roaming.
 */

import type { S3Config } from './s3';

const STORAGE_KEY = 's3Config';

export interface StoredS3Config {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  pathPrefix: string;
  acl: string;
}

const defaultConfig: StoredS3Config = {
  endpoint: '',
  bucket: '',
  region: 'us-east-1',
  accessKeyId: '',
  secretAccessKey: '',
  pathPrefix: '',
  acl: 'public-read',
};

export async function loadS3Config(): Promise<StoredS3Config> {
  const result = await browser.storage.sync.get(STORAGE_KEY);
  const saved = result[STORAGE_KEY] as Partial<StoredS3Config> | undefined;
  return { ...defaultConfig, ...saved };
}

export async function saveS3Config(config: StoredS3Config): Promise<void> {
  await browser.storage.sync.set({ [STORAGE_KEY]: config });
}

export async function clearS3Config(): Promise<void> {
  await browser.storage.sync.remove(STORAGE_KEY);
}

export function isConfigured(config: StoredS3Config): boolean {
  return !!(
    config.endpoint &&
    config.bucket &&
    config.region &&
    config.accessKeyId &&
    config.secretAccessKey
  );
}

export function toS3Config(stored: StoredS3Config): S3Config {
  return {
    endpoint: stored.endpoint,
    bucket: stored.bucket,
    region: stored.region,
    accessKeyId: stored.accessKeyId,
    secretAccessKey: stored.secretAccessKey,
    pathPrefix: stored.pathPrefix || undefined,
    acl: stored.acl || undefined,
  };
}

/**
 * Request host permission for the S3 endpoint.
 * Returns true if granted, false otherwise.
 */
export async function requestEndpointPermission(endpoint: string): Promise<boolean> {
  try {
    const url = new URL(endpoint);
    const origin = `${url.protocol}//${url.host}/*`;
    return await browser.permissions.request({ origins: [origin] });
  } catch {
    return false;
  }
}

/**
 * Mask a secret key for display: show first 4 and last 4 characters.
 */
export function maskSecretKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}
