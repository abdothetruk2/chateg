# Egchat

Real-time chat app built with Next.js, MongoDB, and Socket.IO.

## Highlights

- Public landing page with hero copy, screenshots, GitHub link, and recruiter project info.
- Demo login that seeds a recruiter account and demo room.
- Google OAuth login with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Realtime messages, rooms, groups, stories, posts, media, voice notes, tasks extensions, and calls.
- AI chat tab with assistant modes for chat, summaries, replies, translation, code help, and tool calls.
- New local passwords are stored with a `scrypt` hash.

## Local Development

```bash
npm install
npm run dev
```

The custom server runs on `http://localhost:3000` by default.

## Environment

Create `.env.local` from `.env.example` and set `MONGODB_URI`.

Optional:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.example
CLIENT_URL=https://your-domain.example
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openai/gpt-4o
ASSEMBLYAI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Twilio phone calls are optional. Browser calling uses the Twilio Voice SDK and
needs these server-only variables:

```bash
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_API_KEY=...
TWILIO_API_SECRET=...
TWILIO_TWIML_APP_SID=...
TWILIO_FROM_NUMBER=+15551234567
NEXT_PUBLIC_APP_URL=https://your-domain.example
NEXT_PUBLIC_ENABLE_LOCATION_SHARING=false
```

Create a Twilio API Key/Secret and a TwiML App in the Twilio Console. Set the
TwiML App voice request URL to `https://your-domain.example/api/twilio-voice`.
For local testing, expose the app with a public HTTPS tunnel and use that URL.

Chat phone tools use:

- `POST /api/twilio/sms` for authenticated SMS sends.
- `POST /api/twilio/call` for authenticated Twilio voice notifications.
- `POST /api/twilio/lookup` for country, carrier, line type, and validity.
- Optional location sharing is disabled by default. Set
  `NEXT_PUBLIC_ENABLE_LOCATION_SHARING=true` to show the Share Location controls.
  Twilio lookup cannot provide live GPS from a phone number.

## Production

```bash
npm run deploy:check
npm run start
```

This project uses a custom `server.js` for Socket.IO, so deploy to a Node.js host that supports long-running WebSocket connections. Static export is not suitable for this app.

## Performance Notes

- `next/image` remote patterns are locked to the avatar/media hosts used by the app.
- Next image output is configured for AVIF/WebP with a production cache TTL.
- Production uses the custom `server.js` so Socket.IO keeps working with `npm run start`.
- `/api/health` is available for host health checks and `render.yaml` points Render to it.
- Render Free web services still spin down when idle. For a live portfolio demo, use a paid always-on instance or a Node host with no idle spin-down.
