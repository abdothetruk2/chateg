# Nexchat

Real-time chat app built with Next.js, MongoDB, and Socket.IO.

## Local Development

```bash
npm install
npm run dev
```

The custom server runs on `http://localhost:3000` by default.

## Environment

Create `.env.local` from `.env.example` and set `MONGODB_URI`.

## Production

```bash
npm run deploy:check
npm run start
```

This project uses a custom `server.js` for Socket.IO, so deploy to a Node.js host that supports long-running WebSocket connections. Static export is not suitable for this app.

## Performance Notes

- `next/image` remote patterns are locked to the avatar/media hosts used by the app.
- Next image output is configured for AVIF/WebP with a production cache TTL.
- The production build uses `output: "standalone"` for smaller Node deployments.
# chateg
