import { ElementNode, NodeTypes, Position, TemplateChildNode, TextNode, SourceLocation } from "./ast";


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
    offset: 0
  };
}

export const baseParse = (
  content: string
): { children: TemplateChildNode[]; } => {
  const context = createParserContext(content);
  const children = parseChildren(context, []); // 子ノードをパース
  // TODO: 
  return { children: [] };
};

function parseChildren(
  context: ParserContext,
  ancestors: ElementNode[]
): TemplateChildNode[] {
  const nodes: TemplateChildNode[] = [];

  while (!isEnd(context, ancestors)) {
    const s = context.source;
    let node: TemplateChildNode | undefined = undefined;

    if (s[0] === '<') {
      // sが"<"で始まり、かつ次の文字がアルファベットの場合は要素としてパース
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors);
      }
    }

    if (!node) {
      node = parseText(context);
    }

    pushNode(nodes, node);
  }

  return nodes;
}

// 子要素パースの while を判定(パース終了)するための関数
function isEnd(context: ParserContext, ancestors: ElementNode[]): boolean {
  const s = context.source;

  // sが"</"で始まり、かつその後にancestorsのタグ名が続くことを判定し、閉じタグがあるか(parseChildrenが終了するべきか)を判定する
  if (startsWith(s, '<')) {
    for (let i = ancestors.length - 1; i >= 0; --i) {
      if (starsWithEndTagOpen(s, ancestors[i].tag)) {
        return true;
      }
    }
  }

  return !s;
}

function startsWith(source: string, searchString: string): boolean {
  return source.startsWith(searchString);
}

function pushNode(nodes: TemplateChildNode[], node: TemplateChildNode): void {
  if (node.type === NodeTypes.TEXT) {
    const prev = last(nodes);
    if (prev && prev.type === NodeTypes.TEXT) {
      prev.content += node.content;
      return;
    }
  }
  nodes.push(node);
}

// 配列の最後の要素を抽出
function last<T>(xs: T[]): T | undefined {
  return xs[xs.length - 1];
}

function starsWithEndTagOpen(source: string, tag: string): boolean {
  return (
    startsWith(source, '</') &&
    // source 文字列の3文字目（インデックス2）から、タグ名の長さ分の文字列を抽出し、それが tag と一致するか
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
    // タグ名の直後の文字が、タブ、改行、フォームフィード、スペース、/ または > のいずれかであるか
    /[\t\r\n\f />]/.test(source[2 + tag.length] || '>')
  );
}

function parseText(context: ParserContext): TextNode {
  const endToken = '<';
  let endIndex = context.source.length;
  const index = context.source.indexOf(endToken, 1);
  if (index !== -1 && endIndex > index) {
    endIndex = index;
  }

  const start = getCursor(context);
  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content,
    loc: getSelection(context, start)
  };
}

function parseTextData(context: ParserContext, length: number): string {
  const rawText = context.source.slice(0, length);
  advanceBy(context, length);
  return rawText;
}

/*
 * utilities
 */
function advanceBy(context: ParserContext, numberOfCharacters: number) {
  const { source } = context;
  advancePositionWithMutation(context, source, numberOfCharacters);
  context.source = source.slice(numberOfCharacters);
}

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
  pos.column = lastNewLinePos === -1 ? pos.column + numberOfCharacters : numberOfCharacters - lastNewLinePos;

  return pos;
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
    source: context.originalSource.slice(start.offset, end.offset)
  };
}