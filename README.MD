# Invite Chat

A real-time chat application where friends can discuss in groups or directly - no login required! Join rooms using simple invite codes.

## Features

- **No login required** - Just pick a nickname and join with an invite code
- **Group chats** - Create rooms for multiple people
- **Direct messages** - 1-on-1 private conversations
- **Invite codes** - Share 6-character codes to invite friends (e.g., `ABC123`)
- **Real-time messaging** - WebSocket-powered instant communication
- **Message history** - Last 100 messages stored per room
- **User presence** - See when users join or leave

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

Then open `http://localhost:4545` in your browser.

### Docker

```bash
# Using Docker Compose
docker-compose up --build

# Or build manually
docker build -t invite-chat .
docker run -p 4545:4545 invite-chat
```

## How It Works

1. **Create a room** - Enter your nickname and room name, get an invite code
2. **Share the code** - Send the 6-character code to your friends
3. **Friends join** - They enter the code + their nickname
4. **Start chatting!**

## Deploy to Coolify

1. In Coolify, create a new **Application** with **Docker**
2. Connect your Git repository
3. Coolify will auto-detect the Dockerfile
4. Set the exposed port to `4545`
5. Deploy!

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4545` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `NODE_ENV` | `production` | Environment mode |

## Project Structure

```
├── src/
│   ├── server/
│   │   ├── index.ts      # Express + WebSocket server
│   │   ├── rooms.ts      # Room management
│   │   └── invite.ts     # Invite code generation
│   ├── client/
│   │   └── index.ts      # Frontend logic
│   └── shared/
│       └── types.ts      # Shared TypeScript types
├── public/
│   ├── index.html        # Main page
│   └── css/styles.css    # Styling
├── Dockerfile            # Docker configuration
└── docker-compose.yml    # Docker Compose config
```

## Tech Stack

- **Backend**: Node.js, Express, WebSocket (ws)
- **Frontend**: Vanilla TypeScript, HTML, CSS
- **Build**: TypeScript, esbuild
- **Deployment**: Docker
