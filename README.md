# BoldSync — WhatsApp Automation Platform

> AI-powered WhatsApp automation platform — shared inbox, AI assistant,
> broadcast campaigns, and no-code workflows. Powered by BoldFlow Labs.

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](./LICENSE)
[![CI](https://github.com/boldflowlabs/boldsync/actions/workflows/ci.yml/badge.svg)](https://github.com/boldflowlabs/boldsync/actions/workflows/ci.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e?logo=supabase)](https://supabase.com)
[![Powered by BoldFlow Labs](https://img.shields.io/badge/Powered_by-BoldFlow_Labs-6366f1?style=flat)](https://boldflowlabs.com)

## What you get out of the box

- **Shared inbox** on the official WhatsApp Business API — multiple
  agents working one number, per-conversation assignment, status, and
  notes.
- **Contacts + tags + custom fields**, CSV import, deduplication.
- **Sales pipelines** (Kanban) with deals linked to conversations.
- **Broadcasts** with Meta-approved templates, delivery + read
  tracking, per-recipient variable substitution.
- **No-code automations** — triggers on inbound messages, new
  contacts, keywords, or schedule; conditional branches, waits,
  tags, webhooks. Visual builder.
- **AI assistant** — trained on your own docs, FAQs, and product
  content. Answers customer questions in your voice, 24/7, without
  going off-script.
- **Knowledge base** — upload PDFs, paste FAQs, or add product info.
  BoldSync reads it all and uses it to power every AI reply.
- **Real-time dashboard** — response times, daily volume, pipeline
  value, cross-module activity feed.
- **Account management** — email, password, avatar, global sign-out.

## Quick start

```bash
# Fork on GitHub first: https://github.com/boldflowlabs/boldsync → Fork
git clone https://github.com/<your-username>/boldsync.git
cd boldsync
npm install
cp .env.local.example .env.local   # fill in Supabase + Meta + AI creds
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login` (or
`/dashboard` if already signed in).

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `META_APP_ID` | Meta app ID |
| `META_APP_SECRET` | Meta app secret |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verify token |
| `ENCRYPTION_KEY` | AES-256-GCM key for token encryption |
| `ANTHROPIC_API_KEY` | Claude API key — powers the AI assistant |

## Stack

- **App** — Next.js 16 (App Router), React 19, TypeScript, Tailwind v4.
- **Data** — Supabase (Postgres + Auth + Storage + RLS + pgvector).
- **WhatsApp** — Meta Cloud API (official WhatsApp Business API).
- **AI** — Anthropic Claude API with RAG via Supabase pgvector.

## Documentation

Full setup documentation — Supabase migrations, WhatsApp Business API
config, AI assistant setup, and production deploy — lives in [`docs/`](./docs).

Key pages:
- [Getting started](./docs/getting-started.md)
- [Supabase setup](./docs/supabase-setup.md)
- [WhatsApp setup](./docs/whatsapp-setup.md)
- [AI assistant setup](./docs/ai-assistant.md)
- [Environment variables](./docs/environment-variables.md)
- [Deploy on Hostinger](./docs/deployment-hostinger.md)
- [Architecture](./docs/architecture.md)
- [Troubleshooting](./docs/troubleshooting.md)

## Contributing

Bug reports and security issues are welcome. Feature PRs and major
changes should be discussed in an issue first. Details in
[`CONTRIBUTING.md`](./CONTRIBUTING.md) and
[`.github/SECURITY.md`](./.github/SECURITY.md).

## License

[MIT](./LICENSE). Fork it, brand it, host it.

---

Built by [BoldFlow Labs](https://boldflowlabs.com) — AI automation agency
specialising in AI Voice Agents, AI Chatbots, and WhatsApp Automation.