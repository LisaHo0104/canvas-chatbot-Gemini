## Overview
- Add PDF upload support to the chat UI and wire attachments to the server using AI SDK messages with `parts`.
- Use models that can read PDFs (e.g., `anthropic/claude-3.5-sonnet`, `google/gemini-2.0-flash-exp`, `openai/gpt-4o` where attachment support is available via your provider).
- Keep the existing OpenRouter + AI SDK server integration; only adjust the client to send file parts.

## Server (Already Ready)
- The chat route already uses AI SDK: `convertToModelMessages` and `streamText` (`src/app/api/chat/route.ts:195`, `src/app/api/chat/route.ts:198`).
- It sanitizes incoming `messages` to include `file` parts (`src/app/api/chat/route.ts:157–169`). No server change required.
- It returns a UI message stream response with reasoning enabled (`src/app/api/chat/route.ts:284`).

## Client Changes
- Enable attachments in the prompt input and pass files to `sendMessage` as `parts`.
- Accept PDFs and images; enforce a sensible size/quantity limit.
- Render selected attachments in the input and continue showing attachments in the conversation (already supported).

### Edits in `src/app/protected/chat/page.tsx`
1) Update `PromptInput` props to allow PDFs:
```
<PromptInput
  className="px-4 pb-4 w-full"
  globalDrop
  multiple
  accept="application/pdf,image/*"
  maxFiles={4}
  maxFileSize={10 * 1024 * 1024}
  onSubmit={onSubmitAI}
>
```
- Location: `src/app/protected/chat/page.tsx:886` (replace current `PromptInput` opening tag).

2) Show attachments in the input area:
```
<PromptInputAttachments>
  {(file) => (
    <PromptInputAttachment data={file} />
  )}
</PromptInputAttachments>
```
- Insert immediately above `<PromptInputBody>` inside the same `PromptInput` to preview selected files.

3) Enable the “Add attachments” action:
```
<PromptInputActionAddAttachments />
```
- Location: `src/app/protected/chat/page.tsx:895–899` (remove `disabled`).

4) Send attachments with the user message:
```
await sendChatMessage(
  { role: 'user', parts: [{ type: 'text', text: message.text }, ...message.files] } as any,
  {
    body: {
      model: selectedModel,
      webSearch,
      canvas_token: canvasStatus === 'connected' ? canvasToken : undefined,
      canvas_url: canvasStatus === 'connected' ? canvasUrl : undefined,
      provider_id: activeProvider?.id,
      model_override: activeProvider?.provider_name === 'openrouter' ? selectedModel : undefined,
    },
    headers: { 'X-Session-ID': sessionForSend.id },
  }
)
```
- Location: replace current call at `src/app/protected/chat/page.tsx:530–544`.

5) Conversation rendering already displays file parts via `MessageAttachments` (`src/app/protected/chat/page.tsx:721–727`). No change needed.

## Model Support
- Prefer models known to handle PDFs: `anthropic/claude-3.5-sonnet`, `google/gemini-2.0-flash-exp`. `openai/gpt-4o` may handle attachments via provider but PDF parsing quality varies.
- Selection uses your existing model selector; users can pick a PDF-capable model.

## Validation
- Drag-and-drop a PDF into the input or use the action menu; submit a question like “Summarize this PDF”.
- Confirm the server receives `messages` containing `file` parts and the assistant returns text.
- Exercise size limit and multi-file handling; verify attachments preview and removal.

## Notes
- Attachments are converted from blob URLs to data URLs in the input component before submission; this matches the AI SDK cookbook flow.
- Rate limiting, persistence, and Canvas tools continue to work unchanged.
