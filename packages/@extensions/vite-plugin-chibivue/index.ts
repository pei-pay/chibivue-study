import type { Plugin } from 'vite';

export default function vitePluginChibivue(): Plugin {
  return {
    name: 'vite:chibivue',

    transform(code, id) {
      return { code };
    },
  };
}