import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import {
  PromptInputProvider,
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";

describe("PromptInput – clears input on Enter", () => {
  test("clears provider-controlled textarea immediately on submit", () => {
    const onSubmit = jest.fn();

    render(
      <PromptInputProvider initialInput="Hello world">
        <PromptInput onSubmit={onSubmit}>
          <PromptInputTextarea />
          <PromptInputSubmit />
        </PromptInput>
      </PromptInputProvider>
    );

    const textarea = screen.getByPlaceholderText(
      "What would you like to know?"
    ) as HTMLTextAreaElement;

    expect(textarea.value).toBe("Hello world");

    const submit = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submit);

    expect(textarea.value).toBe("");
  });
});
