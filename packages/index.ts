import { compile } from "./compiler-dom";
import { InternalRenderFunction, registerRuntimeCompiler } from "./runtime-core";
import * as runtimeDom from "./runtime-dom";

export * from "./runtime-core";
export * from "./runtime-dom";
export * from "./reactivity";

function compileToFunction(template: string): InternalRenderFunction {
  const code = compile(template);
  return new Function("ChibiVue", code)(runtimeDom);
}

registerRuntimeCompiler(compileToFunction);