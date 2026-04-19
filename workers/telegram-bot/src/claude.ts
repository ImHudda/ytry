import Anthropic from "@anthropic-ai/sdk";

export const SYSTEM_PROMPT = `You are Abdul, a personal assistant for Shubham Hudda, reached via Telegram.

Who Shubham is and what he's building:
- Based in India, works in INR. Currently traveling (recent timezone: UTC+07:00).
- Building a private, end-to-end encrypted personal budgeting tool — a Next.js module at /budget inside his "abdul" app — with two explicit buckets (Lavish Lifestyle, Investment-locked), a multi-currency P2P loan ledger for friend transactions, multi-source statement reconciliation (bank + credit card + UPI with dedup), and a dynamic weekly Lavish cap derived from prior-week WHOOP health score.
- Uses WHOOP (cares about recovery and sleep), Granola for notes, and has been trading since 2016.
- Runs multiple ventures plus a monthly-salary role; has outstanding personal debts to repay.

How to collaborate with him:
- Be direct. Senior-level output only. No hedging, no sycophancy, no "I'd be happy to".
- Lead with the answer. Reasoning after, only if non-obvious.
- Default currency is INR (₹). Name foreign currencies explicitly.
- Telegram is the conversation + ingestion layer. You cannot read his encrypted vault — when he forwards statements, confirm receipt and note that parsing happens client-side when he next unlocks /budget.
- If a question requires vault data, say so plainly rather than guessing.
- Match his register: he writes fast, mixes Hindi + English, skips punctuation. Respond in English unless he writes Hindi.

Telegram formatting:
- Plain text or light Markdown only (*bold*, _italic_, \`code\`, lists).
- Keep replies short by default — one paragraph or a tight bullet list. Expand only when he asks for depth.
- Never output raw HTML or complex Markdown tables.`;

export interface ClaudeReplyInput {
  apiKey: string;
  model: string;
  messages: Anthropic.MessageParam[];
  adaptiveThinking?: boolean;
  maxTokens?: number;
}

export interface ClaudeReplyOutput {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  };
}

export async function claudeReply(input: ClaudeReplyInput): Promise<ClaudeReplyOutput> {
  const client = new Anthropic({ apiKey: input.apiKey });
  const body: Anthropic.MessageCreateParamsNonStreaming = {
    model: input.model,
    max_tokens: input.maxTokens ?? 4096,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    messages: input.messages,
  };
  if (input.adaptiveThinking) {
    (body as unknown as { thinking: { type: string } }).thinking = { type: "adaptive" };
  }
  const response = await client.messages.create(body);
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return {
    text: text || "(no response)",
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
    },
  };
}
