import { ElementNode, InterpolationNode, NodeTypes, TemplateChildNode, TextNode } from './ast'

export const generate = ({
  children,
}: {
  children: TemplateChildNode[]
}): string => {
  // with(非推奨): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/with
  return `return function render(_ctx) {
  with(_ctx) {
    const { h } = ChibiVue;
    return ${genNode(children[0])};
  }
}`
}

const genNode = (node: TemplateChildNode): string => {
  switch (node.type) {
    case NodeTypes.ELEMENT:
      return genElement(node)
    case NodeTypes.TEXT:
      return genText(node)
    case NodeTypes.INTERPOLATION:
      return genInterpolation(node)
    default:
      return ''
  }
}

const genElement = (el: ElementNode): string => {
  return `h("${el.tag}", {${el.props
    .map(({ name, value }) => `${name}: "${value?.content}"`)
    .join(', ')}}, [${el.children.map(it => genNode(it)).join(', ')}])`
}

const genText = (text: TextNode): string => {
  return `\`${text.content}\``
}

const genInterpolation = (node: InterpolationNode): string => {
  return `${node.content}`
}