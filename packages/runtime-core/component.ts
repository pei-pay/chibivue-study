import { ReactiveEffect } from '../reactivity';
import { emit } from './componentEmits';
import { ComponentOptions } from './componentOptions';
import { initProps, Props } from './componentProps';
import { VNode, VNodeChild } from './vnode';

export type Component = ComponentOptions;
export type Data = Record<string, unknown>

export interface ComponentInternalInstance {
  type: Component
  vnode: VNode
  subTree: VNode
  next: VNode | null
  effect: ReactiveEffect
  render: InternalRenderFunction
  update: () => void
  propsOptions: Props
  props: Data
  emit: (event: string, ...args: any[]) => void
  isMounted: boolean,
  setupState: Data
}

export type InternalRenderFunction = {
  (ctx: Data): VNodeChild
}

export function createComponentInstance(vnode: VNode): ComponentInternalInstance {
  const type = vnode.type as Component

  const instance: ComponentInternalInstance = {
    type,
    vnode,
    next: null,
    effect: null!,
    subTree: null!,
    update: null!,
    render: null!,
    propsOptions: type.props || {},
    props: {},
    emit: null!,
    isMounted: false,
    setupState: null!
  }

  instance.emit = emit.bind(null, instance)

  return instance
}

export const setupComponent = (instance: ComponentInternalInstance) => {
  const { props } = instance.vnode;
  initProps(instance, props);

  const component = instance.type as Component;
  if (component.setup) {
    const setupResult = component.setup(instance.props, { emit: instance.emit }) as InternalRenderFunction;

    if (typeof setupResult === 'function') {
      instance.render = setupResult
    } else if (typeof setupResult === 'object' && setupResult !== null) {
      instance.setupState = setupResult
    } else {
      // do nothing
    }
  }

  if(compile && !component.render) {
    const template = component.template ?? ''
    if(template) {
      instance.render = compile(template)
    }
  }
}

type CompileFunction = (template: string) => InternalRenderFunction
let compile: CompileFunction | undefined

export function registerRuntimeCompiler(_compile: any) {
  compile = _compile
}