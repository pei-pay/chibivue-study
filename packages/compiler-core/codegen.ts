import { toHandlerKey } from "../shared/general";
import {
  AttributeNode,
  DirectiveNode,
  ElementNode,
  InterpolationNode,
  NodeTypes,
  TemplateChildNode,
  TextNode,
} from "./ast";
import { CompilerOptions } from "./options";

export const generate = (
  {
    children,
  }: {
    children: TemplateChildNode[];
  },
  option: Required<CompilerOptions>,
): string => {
  return `${option.isBrowser ? 'return ' : ''}function render(_ctx) {
  const { h } = ChibiVue;
  return ${genNode(children[0])};
}`;
};

const genNode = (node: TemplateChildNode): string => {
  switch (node.type) {
    case NodeTypes.ELEMENT:
      return genElement(node);
    case NodeTypes.TEXT:
      return genText(node);
    case NodeTypes.INTERPOLATION:
      return genInterpolation(node);
    default:
      return "";
  }
};

const genElement = (el: ElementNode): string => {
  return `h("${el.tag}", {${el.props
    .map(prop => genProp(prop))
    .join(", ")}}, [${el.children.map((it) => genNode(it)).join(", ")}])`;
};

const genText = (text: TextNode): string => {
  return `\`${text.content}\``;
};

const genInterpolation = (node: InterpolationNode): string => {
  return `${node.content}`;
};

const genProp = (prop: AttributeNode | DirectiveNode): string => {
  switch (prop.type) {
    case NodeTypes.ATTRIBUTE:
      return `${prop.name}: "${prop.value?.content}"`;
    case NodeTypes.DIRECTIVE: {
      switch (prop.name) {
        case 'on':
          return `${toHandlerKey(prop.arg)}: ${prop.exp}`;
        default:
          // TODO: other directives
          throw new Error(`unexpected directive name. got "${prop.name}"`);
      }
    }
    default:
      throw new Error(`unexpected prop type.`);
  }
};