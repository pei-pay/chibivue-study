import { parse } from "path";
import {
  AttributeNode,
  ElementNode,
  InterpolationNode,
  NodeTypes,
  Position,
  SourceLocation,
  TemplateChildNode,
  TextNode,
} from "./ast";

export interface ParserContext {
  // 元々のテンプレート文字列
  readonly originalSource: string;
  source: string;
  // このパーサが読み取っている現在地
  offset: number;
  line: number;
  column: number;
}

function createParserContext(content: string): ParserContext {
  return {
    originalSource: content,
    source: content,
    column: 1,
    line: 1,
    offset: 0,
  };
}

export const baseParse = (content: string): { children: TemplateChildNode[] } => {
  const context = createParserContext(content); // contextを生成
  const children = parseChildren(context, []); // 子ノードをパース
  return { children: children };
};

function parseChildren(
  context: ParserContext,
  // HTMLは再起的な構造を持っているので、祖先要素をスタックとして持っておいて、子にネストして行くたびにpush。
  // endタグを見つけるとparseChildrenが終了してancestorsをpopする感じ。
  ancestors: ElementNode[]
): TemplateChildNode[] {
  const nodes: TemplateChildNode[] = [];

  while (!isEnd(context, ancestors)) {
    const s = context.source;
    let node: TemplateChildNode | undefined = undefined;
    if (startsWith(s, "{{")) {
      // sが"{{"で始まる場合はマスタッシュとしてパース。
      node = parseInterpolation(context);
    } else if (s[0] === "<") {
      // sが"<"で始まり、かつ次の文字がアルファベットの場合は要素としてパース。
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors);
      }
    }

    if (!node) {
      // 上記の条件に当てはまらなかった場合はTextNodeとしてパース。
      node = parseText(context);
    }

    pushNode(nodes, node);
  }

  return nodes;
}

function advanceBy(context: ParserContext, numberOfCharacters: number): void {
  const { source } = context;
  advancePositionWithMutation(context, source, numberOfCharacters);
  context.source = source.slice(numberOfCharacters);
}

// 少し長いが、やっていることは単純で、 pos の計算を行っている。
// 引数でもらった pos のオブジェクトを破壊的に更新。
function advancePositionWithMutation(
  pos: Position,
  source: string,
  numberOfCharacters: number = source.length
): Position {
  let linesCount = 0;
  let lastNewLinePos = -1;
  for (let i = 0; i < numberOfCharacters; i++) {
    if (source.charCodeAt(i) === 10 /* newline char code */) {
      linesCount++;
      lastNewLinePos = i;
    }
  }

  pos.offset += numberOfCharacters;
  pos.line += linesCount;
  pos.column =
    lastNewLinePos === -1
      ? pos.column + numberOfCharacters
      : numberOfCharacters - lastNewLinePos;

  return pos;
}

// 子要素パースの while を判定(パース終了)するための関数
function isEnd(context: ParserContext, ancestors: ElementNode[]): boolean {
  const s = context.source;

  // sが"</"で始まり、かつその後にancestorsのタグ名が続くことを判定し、閉じタグがあるか(parseChildrenが終了するべきか)を判定。
  if (startsWith(s, "</")) {
    for (let i = ancestors.length - 1; i >= 0; --i) {
      if (startsWithEndTagOpen(s, ancestors[i].tag)) {
        return true;
      }
    }
  }

  return !s;
}

function startsWith(source: string, searchString: string): boolean {
  return source.startsWith(searchString);
}

function advanceSpaces(context: ParserContext): void {
  const match = /^[\t\r\n\f ]+/.exec(context.source);
  if (match) {
    advanceBy(context, match[0].length);
  }
}

function pushNode(nodes: TemplateChildNode[], node: TemplateChildNode): void {
  // nodeTypeがTextのものが連続している場合は結合してあげる
  if (node.type === NodeTypes.TEXT) {
    const prev = last(nodes);
    if (prev && prev.type === NodeTypes.TEXT) {
      prev.content += node.content;
      return;
    }
  }

  nodes.push(node);
}

function parseText(context: ParserContext): TextNode {
  // "<" (タグの開始(開始タグ終了タグ問わず))、もしくは "{{"(マスタッシュの開始) まで読み進め、何文字読んだかを元にTextデータの終了時点のindexを算出
  const endTokens = ["<", "{{"];

  let endIndex = context.source.length;
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i], 1);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }

  const start = getCursor(context);
  // endIndexの情報を元に Text データをパース
  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content,
    loc: getSelection(context, start),
  };
}

const enum TagType {
  Start,
  End,
}

function parseElement(
  context: ParserContext,
  ancestors: ElementNode[]
): ElementNode | undefined {
  // Start tag.
  const element = parseTag(context, TagType.Start); // TODO:

  // <img /> のような self closing の要素の場合にはここで終了。( children も end タグもないので)
  if (element.isSelfClosing) {
    return element;
  }

  // Children.
  ancestors.push(element);
  const children = parseChildren(context, ancestors);
  ancestors.pop();

  element.children = children;

  // End tag.
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End); // TODO:
  }

  return element;
}

function parseTag(context: ParserContext, type: TagType): ElementNode {
  // Tag open.
  const start = getCursor(context);
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)!;
  const tag = match[1];

  advanceBy(context, match[0].length);
  advanceSpaces(context);

  // Attributes.
  let props = parseAttributes(context, type);

  // Tag close.
  let isSelfClosing = false;

  // 属性まで読み進めた時点で、次が "/>" だった場合は SelfClosing とする
  isSelfClosing = startsWith(context.source, "/>");
  advanceBy(context, isSelfClosing ? 2 : 1);

  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children: [],
    isSelfClosing,
    loc: getSelection(context, start),
  };
}

function parseInterpolation(context: ParserContext): InterpolationNode | undefined {
  const [open, close] = ["{{", "}}"];
  const closeIndex = context.source.indexOf(close, open.length);
  if (closeIndex === -1) return undefined;

  const start = getCursor(context);
  advanceBy(context, open.length);

  const innerStart = getCursor(context);
  const innerEnd = getCursor(context);
  const rawContentLength = closeIndex - open.length;
  const rawContent = context.source.slice(0, rawContentLength);
  const preTrimContent = parseTextData(context, rawContentLength);

  const content = preTrimContent.trim();

  const startOffset = preTrimContent.indexOf(content);

  if (startOffset > 0) {
    advancePositionWithMutation(innerStart, rawContent, startOffset);
  }
  const endOffset =
    rawContentLength - (preTrimContent.length - content.length - startOffset);
  advancePositionWithMutation(innerEnd, rawContent, endOffset);
  advanceBy(context, close.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content,
    loc: getSelection(context, start),
  };
}

function parseAttributes(context: ParserContext, type: TagType): AttributeNode[] {
  const props = [];
  const attributeNames = new Set<string>();
  while (
    context.source.length > 0 &&
    !startsWith(context.source, ">") &&
    !startsWith(context.source, "/>")
  ) {
    const attr = parseAttribute(context, attributeNames);

    if (type === TagType.Start) {
      props.push(attr);
    }

    advanceSpaces(context);
  }
  return props;
}

type AttributeValue =
  | {
      content: string;
      loc: SourceLocation;
    }
  | undefined;

function parseAttribute(context: ParserContext, nameSet: Set<string>): AttributeNode {
  // Name.
  const start = getCursor(context);
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)!;
  const name = match[0];

  nameSet.add(name);

  advanceBy(context, name.length);

  // Value
  let value: AttributeValue = undefined;

  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    advanceSpaces(context);
    advanceBy(context, 1);
    advanceSpaces(context);
    value = parseAttributeValue(context);
  }

  const loc = getSelection(context, start);

  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value && {
      type: NodeTypes.TEXT,
      content: value.content,
      loc: value.loc,
    },
    loc,
  };
}

function parseAttributeValue(context: ParserContext): AttributeValue {
  const start = getCursor(context);
  let content: string;

  const quote = context.source[0];
  const isQuoted = quote === `"` || quote === `'`;
  if (isQuoted) {
    // Quoted value.
    advanceBy(context, 1);

    const endIndex = context.source.indexOf(quote);
    if (endIndex === -1) {
      content = parseTextData(context, context.source.length);
    } else {
      content = parseTextData(context, endIndex);
      advanceBy(context, 1);
    }
  } else {
    // Unquoted
    const match = /^[^\t\r\n\f >]+/.exec(context.source);
    if (!match) {
      return undefined;
    }
    content = parseTextData(context, match[0].length);
  }

  return { content, loc: getSelection(context, start) };
}

// content と length を元に text を抽出。
function parseTextData(context: ParserContext, length: number): string {
  const rawText = context.source.slice(0, length);
  advanceBy(context, length);
  return rawText;
}

function getCursor(context: ParserContext): Position {
  const { column, line, offset } = context;
  return { column, line, offset };
}

function getSelection(
  context: ParserContext,
  start: Position,
  end?: Position
): SourceLocation {
  end = end || getCursor(context);
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset),
  };
}

function last<T>(xs: T[]): T | undefined {
  return xs[xs.length - 1];
}

function startsWithEndTagOpen(source: string, tag: string): boolean {
  return (
    startsWith(source, "</") &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
    /[\t\r\n\f />]/.test(source[2 + tag.length] || ">")
  );
}
