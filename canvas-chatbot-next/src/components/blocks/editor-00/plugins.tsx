import { useState } from "react"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { Klass, LexicalEditor, LexicalNode } from "lexical"

import { ContentEditable } from "@/components/editor/editor-ui/content-editable"
import { ToolbarPlugin } from "@/components/editor/plugins/toolbar/toolbar-plugin"
import { BlockFormatDropDown } from "@/components/editor/plugins/toolbar/block-format-toolbar-plugin"
import { ClearFormattingToolbarPlugin } from "@/components/editor/plugins/toolbar/clear-formatting-toolbar-plugin"
import { ElementFormatToolbarPlugin } from "@/components/editor/plugins/toolbar/element-format-toolbar-plugin"
import { FontColorToolbarPlugin } from "@/components/editor/plugins/toolbar/font-color-toolbar-plugin"
import { FontBackgroundToolbarPlugin } from "@/components/editor/plugins/toolbar/font-background-toolbar-plugin"
import { FontFamilyToolbarPlugin } from "@/components/editor/plugins/toolbar/font-family-toolbar-plugin"
import { FontFormatToolbarPlugin } from "@/components/editor/plugins/toolbar/font-format-toolbar-plugin"
import { FontSizeToolbarPlugin } from "@/components/editor/plugins/toolbar/font-size-toolbar-plugin"
import { HistoryToolbarPlugin } from "@/components/editor/plugins/toolbar/history-toolbar-plugin"
import { LinkToolbarPlugin } from "@/components/editor/plugins/toolbar/link-toolbar-plugin"
import { SubSuperToolbarPlugin } from "@/components/editor/plugins/toolbar/subsuper-toolbar-plugin"
import { LinkPlugin } from "@/components/editor/plugins/link-plugin"
import { AutoLinkPlugin } from "@/components/editor/plugins/auto-link-plugin"
import { FloatingLinkEditorPlugin } from "@/components/editor/plugins/floating-link-editor-plugin"
import { ActionsPlugin } from "@/components/editor/plugins/actions/actions-plugin"
import { ClearEditorActionPlugin } from "@/components/editor/plugins/actions/clear-editor-plugin"
import { CounterCharacterPlugin } from "@/components/editor/plugins/actions/counter-character-plugin"
import { ImportExportPlugin } from "@/components/editor/plugins/actions/import-export-plugin"
import { MarkdownTogglePlugin } from "@/components/editor/plugins/actions/markdown-toggle-plugin"
import { TreeViewPlugin } from "@/components/editor/plugins/actions/tree-view-plugin"
import {
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
} from "@lexical/markdown"
import { TABLE } from "@/components/editor/transformers/markdown-table-transformer"
import { ListMaxIndentLevelPlugin } from "@/components/editor/plugins/list-max-indent-level-plugin"
import { FormatParagraph } from "@/components/editor/plugins/toolbar/block-format/format-paragraph"
import { FormatHeading } from "@/components/editor/plugins/toolbar/block-format/format-heading"
import { FormatBulletedList } from "@/components/editor/plugins/toolbar/block-format/format-bulleted-list"
import { FormatNumberedList } from "@/components/editor/plugins/toolbar/block-format/format-numbered-list"
import { FormatCheckList } from "@/components/editor/plugins/toolbar/block-format/format-check-list"
import { FormatQuote } from "@/components/editor/plugins/toolbar/block-format/format-quote"
import { FormatCodeBlock } from "@/components/editor/plugins/toolbar/block-format/format-code-block"
import { CodeHighlightPlugin } from "@/components/editor/plugins/code-highlight-plugin"
import { CodeActionMenuPlugin } from "@/components/editor/plugins/code-action-menu-plugin"
import { CodeLanguageToolbarPlugin } from "@/components/editor/plugins/toolbar/code-language-toolbar-plugin"
import { DraggableBlockPlugin } from "@/components/editor/plugins/draggable-block-plugin"
import { TablePlugin, TableContext } from "@/components/editor/plugins/table-plugin"
import { BlockInsertPlugin } from "@/components/editor/plugins/toolbar/block-insert-plugin"
import { InsertTable } from "@/components/editor/plugins/toolbar/block-insert/insert-table"
import { Separator } from "@/components/ui/separator"
import { nodes } from "./nodes"
import { editorTheme } from "@/components/editor/themes/editor-theme"

export function Plugins() {
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null)
  const [isLinkEditMode, setIsLinkEditMode] = useState(false)

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem)
    }
  }

  // Cell editor config for table cells
  const cellEditorConfig = {
    namespace: "TableCellEditor",
    nodes: nodes as ReadonlyArray<Klass<LexicalNode>>,
    theme: editorTheme,
    onError: (error: Error, editor: LexicalEditor) => {
      console.error(error)
    },
  }

  return (
    <TableContext>
      <div className="relative">
      <ToolbarPlugin>
        {() => (
          <div className="border-b bg-background p-2 flex items-center gap-2 flex-wrap">
            <HistoryToolbarPlugin />
            <Separator orientation="vertical" className="!h-7" />
            <BlockFormatDropDown>
              <FormatParagraph />
              <FormatHeading levels={["h1", "h2", "h3"]} />
              <FormatBulletedList />
              <FormatNumberedList />
              <FormatCheckList />
              <FormatQuote />
              <FormatCodeBlock />
            </BlockFormatDropDown>
            <Separator orientation="vertical" className="!h-7" />
            <BlockInsertPlugin>
              <InsertTable />
            </BlockInsertPlugin>
            <Separator orientation="vertical" className="!h-7" />
            <FontFormatToolbarPlugin />
            <Separator orientation="vertical" className="!h-7" />
            <FontFamilyToolbarPlugin />
            <FontSizeToolbarPlugin />
            <Separator orientation="vertical" className="!h-7" />
            <SubSuperToolbarPlugin />
            <Separator orientation="vertical" className="!h-7" />
            <FontColorToolbarPlugin />
            <FontBackgroundToolbarPlugin />
            <Separator orientation="vertical" className="!h-7" />
            <LinkToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
            <Separator orientation="vertical" className="!h-7" />
            <CodeLanguageToolbarPlugin />
            <Separator orientation="vertical" className="!h-7" />
            <ElementFormatToolbarPlugin />
            <Separator orientation="vertical" className="!h-7" />
            <ClearFormattingToolbarPlugin />
          </div>
        )}
      </ToolbarPlugin>
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <div className="min-h-[200px]">
              <div className="prose prose-sm max-w-none p-4" ref={onRef}>
                <ContentEditable placeholder={"Start typing ..."} />
              </div>
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <LinkPlugin />
        <AutoLinkPlugin />
        <CodeHighlightPlugin />
        <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />
        <TablePlugin cellEditorConfig={cellEditorConfig}>
          {[]}
        </TablePlugin>
        {floatingAnchorElem !== null && (
          <>
            <FloatingLinkEditorPlugin
              anchorElem={floatingAnchorElem}
              isLinkEditMode={isLinkEditMode}
              setIsLinkEditMode={setIsLinkEditMode}
            />
            <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
          </>
        )}
        <ListMaxIndentLevelPlugin maxDepth={7} />
      </div>
      
      {/* Actions */}
      <ActionsPlugin>
        <div className="border-t bg-background px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ClearEditorActionPlugin />
            <ImportExportPlugin />
            <MarkdownTogglePlugin
              shouldPreserveNewLinesInMarkdown={false}
              transformers={[
                ...TEXT_FORMAT_TRANSFORMERS,
                ...ELEMENT_TRANSFORMERS,
                CHECK_LIST,
                TABLE,
              ]}
            />
            <TreeViewPlugin />
          </div>
          <CounterCharacterPlugin charset="UTF-16" />
        </div>
      </ActionsPlugin>
      </div>
    </TableContext>
  )
}
