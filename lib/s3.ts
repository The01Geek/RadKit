/**
 * Lightweight S3-compatible upload client using AWS Signature Version 4.
 * Uses only the Web Crypto API — no external dependencies.
 */

export interface S3Config {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  pathPrefix?: string;
  acl?: string;
}

export interface UploadResult {
  url: string;
  key: string;
}

// --- SigV4 Helpers ---

const encoder = new TextEncoder();

async function hmacSHA256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

async function sha256(data: ArrayBuffer | string): Promise<string> {
  const buffer =
    typeof data === 'string' ? encoder.encode(data).buffer : data;
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return hexEncode(hash);
}

function hexEncode(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  let key = await hmacSHA256(encoder.encode('AWS4' + secretKey).buffer as ArrayBuffer, dateStamp);
  key = await hmacSHA256(key, region);
  key = await hmacSHA256(key, service);
  key = await hmacSHA256(key, 'aws4_request');
  return key;
}

function toDateStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').slice(0, 8);
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function uriEncode(str: string): string {
  return encodeURIComponent(str).replace(/%2F/g, '/');
}

// --- Upload ---

export function generateObjectKey(prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const key = `screenshot-${timestamp}-${random}.png`;
  if (prefix) {
    const trimmed = prefix.replace(/^\/+|\/+$/g, '');
    return trimmed ? `${trimmed}/${key}` : key;
  }
  return key;
}

export function getPublicUrl(config: S3Config, key: string): string {
  const endpoint = config.endpoint.replace(/\/+$/, '');

  // Path-style: endpoint/bucket/key
  return `${endpoint}/${config.bucket}/${key}`;
}

export async function uploadToS3(
  config: S3Config,
  blob: Blob,
  onProgress?: (loaded: number, total: number) => void,
): Promise<UploadResult> {
  const key = generateObjectKey(config.pathPrefix);
  const endpoint = config.endpoint.replace(/\/+$/, '');
  const url = `${endpoint}/${config.bucket}/${key}`;
  const body = await blob.arrayBuffer();

  const now = new Date();
  const dateStamp = toDateStamp(now);
  const amzDate = toAmzDate(now);
  const payloadHash = await sha256(body);

  const headers: Record<string, string> = {
    'Content-Type': 'image/png',
    'Content-Disposition': 'inline',
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    Host: new URL(url).host,
  };

  if (config.acl) {
    headers['x-amz-acl'] = config.acl;
  }

  // Canonical request
  const parsedUrl = new URL(url);
  const canonicalUri = uriEncode(parsedUrl.pathname);
  const canonicalQuerystring = '';
  const signedHeaderKeys = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort();
  const signedHeaders = signedHeaderKeys.join(';');
  const canonicalHeaders =
    signedHeaderKeys.map((k) => `${k}:${headers[Object.keys(headers).find((h) => h.toLowerCase() === k)!].trim()}`).join('\n') + '\n';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // String to sign
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join('\n');

  // Signature
  const signingKey = await getSignatureKey(config.secretAccessKey, dateStamp, config.region, 's3');
  const signature = hexEncode(await hmacSHA256(signingKey, stringToSign));

  // Authorization header
  headers['Authorization'] =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // Signal progress start
  onProgress?.(0, blob.size);

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`S3 upload failed (${response.status}): ${text}`);
  }

  // Signal progress complete
  onProgress?.(blob.size, blob.size);

  return { url: getPublicUrl(config, key), key };
}

/**
 * Validates S3 credentials by sending a HEAD request to the bucket.
 */
export async function validateS3Connection(config: S3Config): Promise<void> {
  const endpoint = config.endpoint.replace(/\/+$/, '');
  const url = `${endpoint}/${config.bucket}`;

  const now = new Date();
  const dateStamp = toDateStamp(now);
  const amzDate = toAmzDate(now);
  const payloadHash = await sha256('');

  const headers: Record<string, string> = {
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    Host: new URL(url).host,
  };

  const parsedUrl = new URL(url);
  const canonicalUri = uriEncode(parsedUrl.pathname) || '/';
  const canonicalQuerystring = '';
  const signedHeaderKeys = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort();
  const signedHeaders = signedHeaderKeys.join(';');
  const canonicalHeaders =
    signedHeaderKeys.map((k) => `${k}:${headers[Object.keys(headers).find((h) => h.toLowerCase() === k)!].trim()}`).join('\n') + '\n';

  const canonicalRequest = [
    'HEAD',
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join('\n');

  const signingKey = await getSignatureKey(config.secretAccessKey, dateStamp, config.region, 's3');
  const signature = hexEncode(await hmacSHA256(signingKey, stringToSign));

  headers['Authorization'] =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: 'HEAD',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Connection failed (${response.status}): Unable to access bucket "${config.bucket}"`);
  }
}
