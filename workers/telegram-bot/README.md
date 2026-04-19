# abdul-telegram-bot

A private Telegram bot that talks to Claude, hosted on your Cloudflare account. Bot identity: `@abdul420bot`.

## What it does (now)
- Chat with Claude (Sonnet 4.6 default; Opus 4.7 with adaptive thinking via `/deepthink`).
- Persistent per-chat conversation history in Cloudflare KV (last ~20 turns).
- Allowlisted by Telegram user ID — strangers are silently ignored.
- Knows context about your `abdul` project and workflow (see `src/claude.ts` system prompt).

## What it doesn't do (yet)
- Read your encrypted `/budget` vault (can't — that's the whole point of E2EE).
- Parse statements / receipts / WHOOP CSVs (planned; lands with /budget M2 + M3).
- Voice notes / transcription (planned).

## Prerequisites
- Cloudflare account + `wrangler` CLI logged in (`wrangler login`)
- Anthropic API key
- Your Telegram user ID (numeric — DM `@userinfobot` on Telegram to get it)

## Deploy

```bash
cd workers/telegram-bot
npm install

# Create the KV namespace for conversation memory
wrangler kv namespace create CONVO
# Copy the returned `id = "..."` into wrangler.toml under [[kv_namespaces]]

# Fill your Telegram user ID (from @userinfobot) into wrangler.toml ALLOWED_USER_IDS
# Comma-separated if multiple.

# Set secrets (you'll be prompted for each value — never committed)
wrangler secret put TELEGRAM_BOT_TOKEN        # the token from @BotFather
wrangler secret put ANTHROPIC_API_KEY         # from console.anthropic.com
wrangler secret put WEBHOOK_SECRET            # any random string ≥32 chars, becomes the webhook URL path

# Deploy
npm run deploy
# Note the deployed URL, e.g. https://abdul-telegram-bot.<your-subdomain>.workers.dev

# Register the webhook with Telegram
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://abdul-telegram-bot.<your-subdomain>.workers.dev/webhook/<WEBHOOK_SECRET>",
    "allowed_updates": ["message", "edited_message"]
  }'
```

Verify:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

Tail logs while testing:

```bash
npm run tail
```

## Commands (send to the bot)
- `/start` — welcome
- `/help` — command list
- `/deepthink <msg>` or `/dt <msg>` — route to Opus 4.7 with adaptive thinking
- `/reset` — clear conversation history for this chat
- `/whoami` — show your Telegram user ID + chat ID (useful for setting up allowlist)

## Secrets & operations
- Rotate the bot token via `@BotFather` → `/revoke` and `wrangler secret put TELEGRAM_BOT_TOKEN`, then re-run `setWebhook`.
- Rotate the Anthropic key via `console.anthropic.com` and `wrangler secret put ANTHROPIC_API_KEY`.
- Revoke everyone's access fast: set `ALLOWED_USER_IDS=""` in `wrangler.toml` and `npm run deploy`.

## Security notes
- `WEBHOOK_SECRET` is a path segment, not a header — rotate it (and the webhook URL) if it's ever exposed.
- The bot refuses messages from any user not in `ALLOWED_USER_IDS` silently — no error reply. This avoids leaking bot existence.
- Privacy mode for the bot is OFF (so it can read group messages). If you add untrusted people to the group, they can see what you send but the bot will not respond to them.
- Conversation history is stored in Cloudflare KV under key `convo:<chat_id>`, TTL 30 days since last write. Deletable via `wrangler kv key delete --binding=CONVO "convo:<chat_id>"`.

## File structure
```
src/
  index.ts      — Worker entry + webhook handler + command router
  telegram.ts   — Telegram Bot API helpers (sendMessage with split, sendChatAction, setWebhook)
  memory.ts     — KV-backed conversation history with trim-to-N-turns
  claude.ts     — Anthropic SDK wrapper with frozen system prompt + top-level prompt caching (1h TTL)
```

## Future work (reference)
- `/forward` → bot saves inbound PDFs/photos to R2 for browser-side parse when /budget unlocks
- Voice memo → transcribe with Whisper → append as user message
- Daily check-in cron — scheduled trigger sends "what did you spend today?" and logs the response
- End-to-end encrypted ingestion with a browser-generated public key (libsodium sealed box) so R2 never sees plaintext
