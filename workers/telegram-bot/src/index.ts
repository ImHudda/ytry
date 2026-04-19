import type Anthropic from "@anthropic-ai/sdk";
import { TelegramClient, type TgUpdate, type TgMessage } from "./telegram";
import { KvConvoStore } from "./memory";
import { claudeReply } from "./claude";

interface Env {
  CONVO: KVNamespace;
  TELEGRAM_BOT_TOKEN: string;
  ANTHROPIC_API_KEY: string;
  WEBHOOK_SECRET: string;
  ALLOWED_USER_IDS: string;
  CHAT_MODEL: string;
  DEEPTHINK_MODEL: string;
  MAX_HISTORY_TURNS: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("abdul-bot ok", { status: 200 });
    }

    if (request.method !== "POST") {
      return new Response("method not allowed", { status: 405 });
    }

    if (!url.pathname.startsWith(`/webhook/${env.WEBHOOK_SECRET}`)) {
      return new Response("not found", { status: 404 });
    }

    let update: TgUpdate;
    try {
      update = await request.json<TgUpdate>();
    } catch {
      return new Response("bad body", { status: 400 });
    }

    ctx.waitUntil(handleUpdate(update, env).catch((e) => console.error("handler error:", e)));
    return new Response("ok", { status: 200 });
  },
};

async function handleUpdate(update: TgUpdate, env: Env): Promise<void> {
  const msg = update.message ?? update.edited_message;
  if (!msg || !msg.from) return;
  if (!isAllowed(msg.from.id, env.ALLOWED_USER_IDS)) {
    console.log(`ignored message from non-allowlisted user ${msg.from.id}`);
    return;
  }

  const tg = new TelegramClient(env.TELEGRAM_BOT_TOKEN);
  const maxTurns = parseInt(env.MAX_HISTORY_TURNS, 10) || 20;
  const store = new KvConvoStore(env.CONVO, maxTurns);

  const text = (msg.text ?? msg.caption ?? "").trim();
  if (!text && !msg.document && !msg.photo) return;

  if (text.startsWith("/")) {
    await handleCommand(text, msg, tg, store, env);
    return;
  }

  if (msg.document || (msg.photo && msg.photo.length > 0)) {
    await tg.sendMessage(
      msg.chat.id,
      "got it — file ingestion isn't wired yet. forward when you're ready; when the parser lands i'll pick these up automatically. for now, tell me in text what it is (bank/CC/UPI, issuer, date range) and i'll track it.",
      msg.message_id
    );
    return;
  }

  await tg.sendChatAction(msg.chat.id, "typing");

  const useDeepthink = text.startsWith("/deepthink ") || text.startsWith("/dt ");
  const userText = useDeepthink ? text.replace(/^\/(deepthink|dt)\s+/, "") : text;
  const model = useDeepthink ? env.DEEPTHINK_MODEL : env.CHAT_MODEL;

  const history = await store.load(msg.chat.id);
  const next: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userText },
  ];

  try {
    const { text: reply, usage } = await claudeReply({
      apiKey: env.ANTHROPIC_API_KEY,
      model,
      messages: next,
      adaptiveThinking: useDeepthink,
      maxTokens: useDeepthink ? 8000 : 4000,
    });
    console.log(
      `usage chat=${msg.chat.id} model=${model} in=${usage.inputTokens} out=${usage.outputTokens} cache_r=${usage.cacheReadTokens} cache_w=${usage.cacheCreationTokens}`
    );
    const updated: Anthropic.MessageParam[] = [
      ...next,
      { role: "assistant", content: reply },
    ];
    await store.save(msg.chat.id, updated);
    await tg.sendMessage(msg.chat.id, reply, msg.message_id);
  } catch (e) {
    const emsg = e instanceof Error ? e.message : String(e);
    console.error("claude error:", emsg);
    await tg.sendMessage(msg.chat.id, `claude error: ${emsg}`, msg.message_id);
  }
}

async function handleCommand(
  text: string,
  msg: TgMessage,
  tg: TelegramClient,
  store: KvConvoStore,
  _env: Env
): Promise<void> {
  const cmd = text.split(/\s+/)[0].toLowerCase().replace(/@\w+$/, "");
  switch (cmd) {
    case "/start":
      await tg.sendMessage(
        msg.chat.id,
        "abdul bot live. i keep conversation history per chat (last ~20 turns). talk normally; prefix with `/deepthink` for opus-adaptive-thinking on hard problems. `/reset` clears history. `/help` lists commands.",
        msg.message_id
      );
      return;
    case "/help":
      await tg.sendMessage(
        msg.chat.id,
        "*commands*\n" +
          "`/deepthink <msg>` or `/dt <msg>` — opus 4.7 with adaptive thinking\n" +
          "`/reset` — wipe this chat's history\n" +
          "`/whoami` — show allowlisted user info\n" +
          "\n_file uploads are acknowledged but not yet parsed — parser lands with /budget M2._",
        msg.message_id
      );
      return;
    case "/reset":
      await store.reset(msg.chat.id);
      await tg.sendMessage(msg.chat.id, "history cleared.", msg.message_id);
      return;
    case "/whoami":
      await tg.sendMessage(
        msg.chat.id,
        `tg user id: \`${msg.from?.id}\`\nchat id: \`${msg.chat.id}\`\nchat type: ${msg.chat.type}`,
        msg.message_id
      );
      return;
    case "/deepthink":
    case "/dt":
      if (text.trim() === cmd) {
        await tg.sendMessage(
          msg.chat.id,
          "usage: `/deepthink <your hard question>`",
          msg.message_id
        );
        return;
      }
      return;
    default:
      await tg.sendMessage(msg.chat.id, `unknown command \`${cmd}\`. try \`/help\`.`, msg.message_id);
  }
}

function isAllowed(userId: number, allowlist: string): boolean {
  if (!allowlist.trim()) return false;
  const allowed = allowlist
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));
  return allowed.includes(userId);
}
