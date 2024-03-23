export interface VNode {
  type: string;
  props: VnodeProps;
  children: (VNode | string)[];
}

export interface VnodeProps {
  [key: string]: any;
}