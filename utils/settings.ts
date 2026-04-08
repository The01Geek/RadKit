export interface UserSettings {
  exportFormat: 'png' | 'jpeg' | 'webp';
  exportQuality: number;
  s3Enabled: boolean;
  s3Endpoint: string;
  s3Bucket: string;
  s3AccessKey: string;
  s3SecretKey: string;
}

/** Keys stored in browser.storage.sync (non-sensitive, roams across devices) */
type SyncKeys = 'exportFormat' | 'exportQuality' | 's3Enabled' | 's3Endpoint' | 's3Bucket';
/** Keys stored in browser.storage.local (credentials, device-local only) */
type LocalKeys = 's3AccessKey' | 's3SecretKey';

export const DEFAULT_SETTINGS: UserSettings = {
  exportFormat: 'png',
  exportQuality: 0.9,
  s3Enabled: false,
  s3Endpoint: '',
  s3Bucket: '',
  s3AccessKey: '',
  s3SecretKey: '',
};

const VALID_FORMATS = new Set(['png', 'jpeg', 'webp']);

function validateSettings(raw: Partial<UserSettings>): Partial<UserSettings> {
  const validated: Partial<UserSettings> = { ...raw };
  if (validated.exportFormat && !VALID_FORMATS.has(validated.exportFormat)) {
    delete validated.exportFormat;
  }
  if (validated.exportQuality !== undefined) {
    const q = Number(validated.exportQuality);
    if (!Number.isFinite(q) || q < 0.1 || q > 1.0) {
      delete validated.exportQuality;
    }
  }
  return validated;
}

export async function loadSettings(): Promise<UserSettings> {
  try {
    const [syncResult, localResult] = await Promise.all([
      browser.storage.sync.get('userSettings'),
      browser.storage.local.get('userCredentials'),
    ]);
    const syncData = (syncResult.userSettings as Partial<UserSettings>) ?? {};
    const localData = (localResult.userCredentials as Pick<UserSettings, LocalKeys>) ?? {};
    return { ...DEFAULT_SETTINGS, ...validateSettings({ ...syncData, ...localData }) };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const { s3AccessKey, s3SecretKey, ...syncData } = settings;
  await Promise.all([
    browser.storage.sync.set({ userSettings: syncData }),
    browser.storage.local.set({ userCredentials: { s3AccessKey, s3SecretKey } }),
  ]);
}
