import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'RadKit',
    description: 'Capture & edit screenshots with privacy-first design',
    version: '1.0.0',
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    },
    permissions: ['activeTab', 'storage', 'scripting', 'unlimitedStorage'],
    commands: {
      'capture-visible': {
        suggested_key: {
          default: 'Alt+S',
        },
        description: 'Capture visible viewport',
      },
      'capture-desktop': {
        suggested_key: {
          default: 'Alt+D',
        },
        description: 'Capture screen or window',
      },
    },
  },
});
