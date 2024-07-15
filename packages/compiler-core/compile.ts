import { generate } from './codegen'
import { baseParse } from './parse'


export function baseCompiler(template: string) {
  const parsedResult = baseParse(template)
  const code = generate(parsedResult)
  return code
}