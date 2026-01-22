"use client"

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { JSX, useEffect } from "react"
import { CodeNode, registerCodeHighlighting } from "@lexical/code"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"

export function CodeHighlightPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Only register if CodeNode is available on the editor
    if (editor.hasNodes([CodeNode])) {
      try {
        return registerCodeHighlighting(editor)
      } catch (error) {
        // Silently fail if highlighting can't be registered
        // This can happen if CodeNode isn't fully initialized yet
        console.warn("CodeHighlightPlugin: Could not register code highlighting", error)
      }
    }
    return undefined
  }, [editor])

  return null
}
