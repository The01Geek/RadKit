# Options / Settings Page

> **Status:** Implemented. The options page provides S3-compatible storage configuration for the sharing feature.

## Overview

The options page (`entrypoints/options/`) allows users to configure S3-compatible storage credentials for the screenshot sharing feature. It is auto-discovered by WXT and generates the appropriate `options_page` manifest entry.

## S3 Credential Form

The form collects the following fields:

| Field | Required | Storage Key | Notes |
|-------|----------|-------------|-------|
| Endpoint URL | Yes | `endpoint` | Any S3-compatible endpoint (AWS, R2, MinIO, etc.) |
| Bucket Name | Yes | `bucket` | Target bucket for uploads |
| Region | Yes | `region` | Defaults to `us-east-1` |
| Access Key ID | Yes | `accessKeyId` | AWS-style access key |
| Secret Access Key | Yes | `secretAccessKey` | Masked after saving |
| Path Prefix | No | `pathPrefix` | Folder prefix for uploaded files |
| ACL | No | `acl` | Defaults to `public-read` |

## Storage

Credentials are persisted in `browser.storage.sync` under the key `s3Config`, allowing them to roam across the user's devices. The storage schema is defined in `lib/storage.ts` as `StoredS3Config`.

## Validation

On save, the options page:
1. Requests host permission for the configured endpoint via `browser.permissions.request()`
2. Validates the connection by issuing a HEAD request to the bucket (SigV4-signed)
3. Displays success or error feedback

## Secret Key Handling

The Secret Access Key is stored as plaintext in `browser.storage.sync` (which is encrypted at rest by the browser). In the UI, the key is masked after saving — only the first 4 and last 4 characters are shown.

## Related Files

- `entrypoints/options/Options.tsx` — React component for the settings form
- `entrypoints/options/options.css` — Styles (light theme, matching editor aesthetic)
- `lib/storage.ts` — Storage read/write utilities and permission helpers
- `lib/s3.ts` — S3-compatible upload client with SigV4 signing
