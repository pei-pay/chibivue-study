import type { Plugin } from 'vite';
import { createFilter } from 'vite';
import { parse, rewriteDefault } from '../../compiler-sfc';
import { compile } from '../../compiler-dom';

export default function vitePluginChibivue(): Plugin {
  const filter = createFilter(/\.vue$/);

  return {
    name: 'vite:chibivue',

    transform(code, id) {
      if (!filter(id)) return;

      const outputs = [];
      outputs.push("import * as ChibiVue from 'chibivue'");

      const { descriptor } = parse(code, { filename: id });

      // --------------------------- ここから
      const SFC_MAIN = '_sfc_main';
      const scriptCode = rewriteDefault(
        descriptor.script?.content ?? '',
        SFC_MAIN,
      );
      outputs.push(scriptCode);
      // --------------------------- ここまで

      const templateCode = compile(descriptor.template?.content ?? '', {
        isBrowser: false,
      });
      outputs.push(templateCode);

      outputs.push('\n');
      outputs.push(`export default { ...${SFC_MAIN}, render }`); // ここ

      return { code: outputs.join('\n') };
    },
  };
}