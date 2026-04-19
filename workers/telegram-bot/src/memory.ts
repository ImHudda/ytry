import type Anthropic from "@anthropic-ai/sdk";

export interface ConvoStore {
  load(chatId: number): Promise<Anthropic.MessageParam[]>;
  save(chatId: number, messages: Anthropic.MessageParam[]): Promise<void>;
  reset(chatId: number): Promise<void>;
}

export class KvConvoStore implements ConvoStore {
  constructor(private kv: KVNamespace, private maxTurns: number) {}

  private key(chatId: number): string {
    return `convo:${chatId}`;
  }

  async load(chatId: number): Promise<Anthropic.MessageParam[]> {
    const raw = await this.kv.get(this.key(chatId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as Anthropic.MessageParam[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async save(chatId: number, messages: Anthropic.MessageParam[]): Promise<void> {
    const trimmed = trimToMaxTurns(messages, this.maxTurns);
    await this.kv.put(this.key(chatId), JSON.stringify(trimmed), {
      expirationTtl: 60 * 60 * 24 * 30,
    });
  }

  async reset(chatId: number): Promise<void> {
    await this.kv.delete(this.key(chatId));
  }
}

function trimToMaxTurns(messages: Anthropic.MessageParam[], maxTurns: number): Anthropic.MessageParam[] {
  if (messages.length <= maxTurns) return messages;
  const dropped = messages.length - maxTurns;
  const kept = messages.slice(dropped);
  if (kept.length > 0 && kept[0].role !== "user") {
    return kept.slice(1);
  }
  return kept;
}
