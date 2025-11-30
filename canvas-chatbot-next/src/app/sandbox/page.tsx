"use client";

import { CodeBlock } from "@/components/ai-elements/code-block";

const longLine =
  "const veryLongLine = '" +
  "x".repeat(500) +
  "'; // This line is intentionally very long to test horizontal scroll";

const largeJson = {
  message: "Testing vertical and horizontal scroll behavior",
  array: Array.from({ length: 50 }, (_, i) => ({ index: i, value: "item-" + i })),
  nested: {
    description:
      "A nested object with enough entries to exceed container height and require vertical scrolling.",
    data: Array.from({ length: 30 }, (_, i) => ({ a: i, b: i * 2, c: i * 3 })),
  },
};

export default function SandboxPage() {
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-lg font-semibold">CodeBlock Scroll Sandbox</h1>

      <div className="rounded-md border p-2">
        <p className="text-sm text-muted-foreground mb-2">
          Long single line (expect horizontal scroll); container constrained to 20rem height.
        </p>
        <div className="h-80 w-full">
          <CodeBlock
            code={longLine}
            language="tsx"
            className="w-full max-w-full h-full max-h-full overflow-auto"
          />
        </div>
      </div>

      <div className="rounded-md border p-2">
        <p className="text-sm text-muted-foreground mb-2">
          Large JSON (expect vertical scroll); container constrained to 20rem height.
        </p>
        <div className="h-80 w-full">
          <CodeBlock
            code={JSON.stringify(largeJson, null, 2)}
            language="json"
            className="w-full max-w-full h-full max-h-full overflow-auto"
          />
        </div>
      </div>
    </div>
  );
}

