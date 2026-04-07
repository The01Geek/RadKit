/**
 * Lightweight S3-compatible upload client using AWS Signature Version 4.
 * No external dependencies — uses only Web Crypto API.
 */

import type { S3Config } from './s3-storage';

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function sha256(data: ArrayBuffer | string): Promise<string> {
  const buffer = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return arrayBufferToHex(hash);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSigningKey(
  secretKey: string, dateStamp: string, region: string, service: string
): Promise<ArrayBuffer> {
  let key = await hmacSha256(
    new TextEncoder().encode('AWS4' + secretKey).buffer as ArrayBuffer,
    dateStamp
  );
  key = await hmacSha256(key, region);
  key = await hmacSha256(key, service);
  key = await hmacSha256(key, 'aws4_request');
  return key;
}

function getEndpointUrl(config: S3Config): URL {
  let endpoint = config.endpoint.replace(/\/+$/, '');
  // Support path-style URLs: append bucket to path
  return new URL(`${endpoint}/${config.bucket}`);
}

export interface UploadResult {
  url: string;
  key: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
}

export async function uploadToS3(
  config: S3Config,
  blob: Blob,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileName = `screenshot-${timestamp}-${randomSuffix}.png`;
  const objectKey = config.pathPrefix
    ? `${config.pathPrefix.replace(/\/+$/, '')}/${fileName}`
    : fileName;

  const bucketUrl = getEndpointUrl(config);
  const url = new URL(`${bucketUrl.toString().replace(/\/+$/, '')}/${objectKey}`);

  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dateOnly = dateStamp.substring(0, 8);

  const bodyBuffer = await blob.arrayBuffer();
  const payloadHash = await sha256(bodyBuffer);

  const headers: Record<string, string> = {
    'Host': url.host,
    'Content-Type': 'image/png',
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': dateStamp,
  };

  if (config.acl) {
    headers['x-amz-acl'] = config.acl;
  }

  // Build canonical request
  const sortedHeaderKeys = Object.keys(headers).map(k => k.toLowerCase()).sort();
  const signedHeaders = sortedHeaderKeys.join(';');
  const canonicalHeaders = sortedHeaderKeys
    .map(k => `${k}:${headers[Object.keys(headers).find(h => h.toLowerCase() === k)!].trim()}`)
    .join('\n') + '\n';

  const canonicalUri = url.pathname.split('/').map(s => encodeURIComponent(s)).join('/');
  const canonicalQueryString = '';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateOnly}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateStamp,
    credentialScope,
    await sha256(canonicalRequest),
  ].join('\n');

  const signingKey = await getSigningKey(config.secretAccessKey, dateOnly, config.region, 's3');
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = arrayBufferToHex(signatureBuffer);

  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const requestHeaders: Record<string, string> = {
    ...headers,
    'Authorization': authorization,
  };
  // Remove Host header — browser sets it automatically and disallows setting it manually
  delete requestHeaders['Host'];

  // Use XMLHttpRequest for progress tracking
  const publicUrl = url.toString();

  if (onProgress) {
    return new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', publicUrl, true);

      for (const [key, value] of Object.entries(requestHeaders)) {
        xhr.setRequestHeader(key, value);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress({ loaded: e.loaded, total: e.total });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ url: publicUrl, key: objectKey });
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText} — ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(blob);
    });
  }

  // Simple fetch for no-progress case
  const response = await fetch(publicUrl, {
    method: 'PUT',
    headers: requestHeaders,
    body: blob,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${response.status} ${response.statusText} — ${text}`);
  }

  return { url: publicUrl, key: objectKey };
}

/**
 * Validate S3 credentials by performing a HeadBucket request.
 */
export async function validateS3Connection(config: S3Config): Promise<{ ok: boolean; error?: string }> {
  const bucketUrl = getEndpointUrl(config);
  const url = new URL(bucketUrl.toString().replace(/\/+$/, '') + '/');

  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dateOnly = dateStamp.substring(0, 8);

  const payloadHash = await sha256('');

  const headers: Record<string, string> = {
    'Host': url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': dateStamp,
  };

  const sortedHeaderKeys = Object.keys(headers).map(k => k.toLowerCase()).sort();
  const signedHeaders = sortedHeaderKeys.join(';');
  const canonicalHeaders = sortedHeaderKeys
    .map(k => `${k}:${headers[Object.keys(headers).find(h => h.toLowerCase() === k)!].trim()}`)
    .join('\n') + '\n';

  const canonicalUri = url.pathname.split('/').map(s => encodeURIComponent(s)).join('/');

  const canonicalRequest = [
    'HEAD',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateOnly}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateStamp,
    credentialScope,
    await sha256(canonicalRequest),
  ].join('\n');

  const signingKey = await getSigningKey(config.secretAccessKey, dateOnly, config.region, 's3');
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = arrayBufferToHex(signatureBuffer);

  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const requestHeaders: Record<string, string> = {
    ...headers,
    'Authorization': authorization,
  };
  delete requestHeaders['Host'];

  try {
    const response = await fetch(url.toString(), {
      method: 'HEAD',
      headers: requestHeaders,
    });

    if (response.ok || response.status === 200 || response.status === 301) {
      return { ok: true };
    }

    return { ok: false, error: `Bucket check failed: ${response.status} ${response.statusText}` };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error' };
  }
}
