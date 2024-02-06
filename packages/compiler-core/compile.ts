import { generate } from "./codegen";
import { baseParse } from "./parse";

export function baseCompile(template: string) {
  const parseResult = baseParse(template.trim());
  console.log("🚀 ~ baseCompile ~ parseResult:", parseResult) // parse結果確認用

  const code = generate(parseResult);
  console.log("🚀 ~ baseCompile ~ code:", code) // compile結果表示

  return code;
}