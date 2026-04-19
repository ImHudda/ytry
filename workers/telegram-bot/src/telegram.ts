export interface TgUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export interface TgChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
  caption?: string;
  reply_to_message?: TgMessage;
  document?: { file_id: string; file_name?: string; mime_type?: string };
  photo?: Array<{ file_id: string }>;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  edited_message?: TgMessage;
  channel_post?: TgMessage;
}

export class TelegramClient {
  constructor(private token: string) {}

  private url(method: string): string {
    return `https://api.telegram.org/bot${this.token}/${method}`;
  }

  async sendMessage(chatId: number, text: string, replyToMessageId?: number): Promise<void> {
    const chunks = splitForTelegram(text);
    for (const chunk of chunks) {
      const body = {
        chat_id: chatId,
        text: chunk,
        parse_mode: "Markdown",
        reply_to_message_id: replyToMessageId,
      };
      const r = await fetch(this.url("sendMessage"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const retryBody = { ...body, parse_mode: undefined };
        await fetch(this.url("sendMessage"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(retryBody),
        });
      }
      replyToMessageId = undefined;
    }
  }

  async sendChatAction(chatId: number, action: "typing"): Promise<void> {
    await fetch(this.url("sendChatAction"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  }

  async setWebhook(webhookUrl: string, secretPath: string): Promise<unknown> {
    const r = await fetch(this.url("setWebhook"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `${webhookUrl}/webhook/${secretPath}`,
        allowed_updates: ["message", "edited_message"],
      }),
    });
    return r.json();
  }
}

function splitForTelegram(text: string, limit = 4000): string[] {
  if (text.length <= limit) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf("\n\n", limit);
    if (cut < limit / 2) cut = remaining.lastIndexOf("\n", limit);
    if (cut < limit / 2) cut = remaining.lastIndexOf(" ", limit);
    if (cut < 0) cut = limit;
    parts.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) parts.push(remaining);
  return parts;
}
