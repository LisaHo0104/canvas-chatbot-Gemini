export type SimplePart = { type: 'text'; text: string };
export type SimpleMessage = { role: 'system' | 'user' | 'assistant'; parts: SimplePart[] };

function approximateTokens(text: string): number {
  const len = text.trim().length;
  return Math.ceil(len / 4);
}

function messageTokens(msg: SimpleMessage): number {
  return msg.parts.reduce((sum, p) => sum + approximateTokens(p.text), 0) + 6;
}

export function assembleContext({
  systemPrompt,
  summaryText,
  messages,
  maxTokens,
  maxTurns,
}: {
  systemPrompt: string;
  summaryText?: string;
  messages: SimpleMessage[];
  maxTokens: number;
  maxTurns: number;
}): SimpleMessage[] {
  const context: SimpleMessage[] = [];
  const systemMsg: SimpleMessage = {
    role: 'system',
    parts: [{ type: 'text', text: systemPrompt }],
  };
  context.push(systemMsg);

  if (summaryText && summaryText.trim().length > 0) {
    context.push({ role: 'system', parts: [{ type: 'text', text: summaryText }] });
  }

  const cleaned = messages.filter((m) => {
    const t = m.parts.map((p) => p.text).join(' ').trim();
    if (!t) return false;
    const shortAck = /^(ok|okay|thanks|thank you|got it|sure)$/i;
    return !shortAck.test(t);
  });

  const turns: SimpleMessage[] = [];
  for (let i = cleaned.length - 1; i >= 0 && turns.length < maxTurns; i--) {
    turns.unshift(cleaned[i]);
  }

  let budget = maxTokens - messageTokens(systemMsg) - (summaryText ? approximateTokens(summaryText) + 6 : 0);
  const final: SimpleMessage[] = [...context];
  for (let i = 0; i < turns.length; i++) {
    const cost = messageTokens(turns[i]);
    if (budget - cost <= 0) break;
    final.push(turns[i]);
    budget -= cost;
  }
  return final;
}

export function trimParts(parts: any[], maxPartChars: number): SimplePart[] {
  const safe: SimplePart[] = [];
  for (const p of Array.isArray(parts) ? parts : []) {
    if (p?.type !== 'text') continue;
    const txt = String(p.text || '');
    const clipped = txt.length > maxPartChars ? txt.substring(0, maxPartChars) : txt;
    safe.push({ type: 'text', text: clipped });
  }
  return safe;
}
