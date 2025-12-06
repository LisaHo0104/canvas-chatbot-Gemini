"use client";

import { cn } from "@/lib/utils";
import {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationSource,
  InlineCitationQuote,
} from "@/components/ai-elements/inline-citation";
import type { ComponentProps } from "react";

export type CitationSource = {
  number?: string;
  title?: string;
  url: string;
  description?: string;
  quote?: string;
};

export type InlineCitationRendererProps = ComponentProps<"div"> & {
  text: string;
  sources: CitationSource[];
};

export function InlineCitationRenderer({ text, sources, className, ...props }: InlineCitationRendererProps) {
  console.log("[DEBUG] InlineCitationRenderer render", { sourcesCount: sources.length });

  const appendHeaderCitations = (t: string, s: CitationSource[]) => {
    if (!t || s.length === 0) return t;
    const headerRegex = /(This information is sourced from:)(.*)/i;
    return t.replace(headerRegex, (m, p1, p2) => {
      if (/\[\d+\]/.test(p2)) return m;
      const tokens = s.map((_, i) => `[${i + 1}]`).join("");
      return `${p1}${p2} ${tokens}`.trim();
    });
  };

  const enhancedText = appendHeaderCitations(String(text || ""), sources);
  const parts = enhancedText.split(/(\[\d+\])/);
  let skipGroup = false;

  const renderCitation = (token: string, index: number) => {
    const match = token.match(/\[(\d+)\]/);
    if (!match) return token;
    const num = match[1];
    const citationIndex = Math.max(0, Number(num) - 1);
    const src = sources[citationIndex];
    if (!src || !src.url) return token;

    return (
      <InlineCitation key={`ic-${index}-${num}`}>
        <InlineCitationText>{token}</InlineCitationText>
        <InlineCitationCard>
          <InlineCitationCardTrigger sources={[src.url]} />
          <InlineCitationCardBody>
            <InlineCitationCarousel>
              <InlineCitationCarouselHeader>
                <InlineCitationCarouselPrev />
                <InlineCitationCarouselNext />
                <InlineCitationCarouselIndex />
              </InlineCitationCarouselHeader>
              <InlineCitationCarouselContent>
                <InlineCitationCarouselItem>
                  <InlineCitationSource title={src.title} url={src.url} description={src.description}>
                    {src.quote && <InlineCitationQuote>{src.quote}</InlineCitationQuote>}
                  </InlineCitationSource>
                </InlineCitationCarouselItem>
              </InlineCitationCarouselContent>
            </InlineCitationCarousel>
          </InlineCitationCardBody>
        </InlineCitationCard>
      </InlineCitation>
    );
  };

  return (
    <div className={cn("prose prose-sm max-w-none", className)} {...props}>
      <p className="leading-relaxed">
        {parts.map((p, i) => {
          const isBracket = /^\[\d+\]$/.test(p);
          if (skipGroup && isBracket) return null as any;
          if (isBracket) {
            skipGroup = true;
            const el = renderCitation(p, i);
            return el;
          }
          if (skipGroup) {
            skipGroup = false;
          }
          return p;
        })}
      </p>
    </div>
  );
}
