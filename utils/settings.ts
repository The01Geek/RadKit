export interface UserSettings {
  exportFormat: 'png' | 'jpeg' | 'webp';
  exportQuality: number;
  s3Enabled: boolean;
  s3Endpoint: string;
  s3Bucket: string;
  s3AccessKey: string;
  s3SecretKey: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  exportFormat: 'png',
  exportQuality: 0.9,
  s3Enabled: false,
  s3Endpoint: '',
  s3Bucket: '',
  s3AccessKey: '',
  s3SecretKey: '',
};

export async function loadSettings(): Promise<UserSettings> {
  const result = await browser.storage.sync.get('userSettings');
  return { ...DEFAULT_SETTINGS, ...((result.userSettings as Partial<UserSettings>) ?? {}) };
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await browser.storage.sync.set({ userSettings: settings });
}
