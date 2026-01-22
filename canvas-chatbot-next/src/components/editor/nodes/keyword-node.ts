/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $applyNodeReplacement,
  $createTextNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
  Spread,
  TextNode,
} from "lexical"

export type SerializedKeywordNode = Spread<
  {
    type: "keyword"
  },
  SerializedTextNode
>

export class KeywordNode extends TextNode {
  static getType(): string {
    return "keyword"
  }

  static clone(node: KeywordNode): KeywordNode {
    return new KeywordNode(node.__text, node.__key)
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key)
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config)
    element.className = "keyword"
    return element
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (node: Node) => ({
        conversion: convertKeywordElement,
        priority: 1,
      }),
    }
  }

  static importJSON(serializedNode: SerializedKeywordNode): KeywordNode {
    const { text } = serializedNode
    const node = $createKeywordNode(text)
    node.setFormat(serializedNode.format)
    node.setDetail(serializedNode.detail)
    node.setMode(serializedNode.mode)
    node.setStyle(serializedNode.style)
    return node
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span")
    element.className = "keyword"
    element.textContent = this.__text
    return { element }
  }

  exportJSON(): SerializedKeywordNode {
    return {
      ...super.exportJSON(),
      type: "keyword",
    }
  }

  canInsertTextBefore(): boolean {
    return false
  }

  canInsertTextAfter(): boolean {
    return false
  }

  isInline(): true {
    return true
  }
}

function convertKeywordElement(domNode: Node): DOMConversionOutput {
  const node = domNode as HTMLElement
  const text = node.textContent || ""
  const keywordNode = $createKeywordNode(text)
  return { node: keywordNode }
}

export function $createKeywordNode(text: string): KeywordNode {
  const keywordNode = new KeywordNode(text)
  keywordNode.setMode("segmented").toggleDirectionless()
  return $applyNodeReplacement(keywordNode)
}

export function $isKeywordNode(
  node: LexicalNode | null | undefined
): node is KeywordNode {
  return node instanceof KeywordNode
}
