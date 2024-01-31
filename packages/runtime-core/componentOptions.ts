export type ComponentOptions = {
  props?: Record<string, any>;
  render?: Function;
  setup?: (
    props: Record<string, any>,
    ctx: { emit: (event: string, ...args: any[]) => void }
  ) => Function | void;
  template?: string;
};
