export type ExportFormat = 'png' | 'jpeg' | 'webp';

export interface S3Config {
  enabled: boolean;
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface RadKitSettings {
  exportFormat: ExportFormat;
  exportQuality: number;
  s3: S3Config;
}

export const DEFAULT_SETTINGS: RadKitSettings = {
  exportFormat: 'png',
  exportQuality: 0.9,
  s3: {
    enabled: false,
    endpoint: '',
    bucket: '',
    accessKeyId: '',
    secretAccessKey: '',
  },
};

const STORAGE_KEY = 'radkit_settings';

export async function loadSettings(): Promise<RadKitSettings> {
  try {
    const result = await browser.storage.sync.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: RadKitSettings): Promise<void> {
  await browser.storage.sync.set({ [STORAGE_KEY]: settings });
}
