import { VNode, VnodeProps } from "./vnode";

export function h(
  type: string,
  props: VnodeProps,
  children: (VNode | string)[]
) {
  return { type, props, children };
}