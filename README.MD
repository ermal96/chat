# Invite Chat

A modern real-time chat application where friends can discuss in groups or directly - no login required! Join rooms using simple invite codes.

## Features

### Core
- **No login required** - Just pick a nickname and join with an invite code
- **Group chats** - Create rooms for multiple people
- **Direct messages** - 1-on-1 private conversations
- **Invite codes** - Share 6-character codes to invite friends (e.g., `ABC123`)
- **Persistent sessions** - Your nickname is saved in localStorage

### Real-time Features
- **Typing indicators** - See when others are typing with animated dots
- **Online status** - Track who's currently online in your rooms
- **Instant messaging** - WebSocket-powered real-time communication
- **User presence** - Notifications when users join or leave

### Message Features
- **Reply to messages** - Respond to specific messages with preview
- **Edit messages** - Edit your own messages (shows "edited" badge)
- **Delete messages** - Remove your own messages
- **Emoji reactions** - React to any message with emojis
- **Message history** - Last 100 messages stored per room with SQLite

### Modern UI
- **Dark theme** - Beautiful purple-accented dark mode
- **Colored avatars** - Auto-generated colors based on user ID
- **Smooth animations** - Fade-in messages and bouncing typing dots
- **Mobile responsive** - Slide-out sidebar on mobile devices
- **Emoji picker** - Easy emoji selection for reactions and messages
- **Context menu** - Right-click messages for quick actions

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

### Development Mode

```bash
# Run server in watch mode
npm run dev

# In another terminal, run client dev server
npm run dev:client
```

### Docker

```bash
# Using Docker Compose
docker-compose up --build

# Or build manually
docker build -t invite-chat .
docker run -p 4545:4545 -v chat-data:/app/data invite-chat
```

## How It Works

1. **Create a room** - Enter your nickname and room name, get an invite code
2. **Share the code** - Send the 6-character code to your friends
3. **Friends join** - They enter the code + their nickname
4. **Start chatting!** - Send messages, react with emojis, reply to messages

## Deploy to Coolify

1. In Coolify, create a new **Application** with **Docker**
2. Connect your Git repository
3. Coolify will auto-detect the Dockerfile
4. Set the exposed port to `4545`
5. Add a persistent volume for `/app/data` (SQLite database)
6. Deploy!

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4545` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `NODE_ENV` | `production` | Environment mode |
| `DB_PATH` | `./data/chat.db` | SQLite database path |

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ChatScreen.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── EmojiPicker.tsx
│   │   │   └── ...
│   │   ├── hooks/          # Custom React hooks
│   │   ├── styles/         # CSS styles
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   └── index.html
├── server/                 # Express backend
│   ├── index.ts            # Express + WebSocket server
│   └── db.ts               # SQLite database operations
├── shared/                 # Shared code
│   └── types.ts            # TypeScript types
├── Dockerfile              # Docker configuration
└── docker-compose.yml      # Docker Compose config
```

## Tech Stack

- **Backend**: Node.js, Express, WebSocket (ws), SQLite (better-sqlite3)
- **Frontend**: React 18, TypeScript, Vite
- **Database**: SQLite with persistent storage
- **Styling**: Custom CSS with CSS variables
- **Deployment**: Docker with multi-stage builds

## WebSocket Events

### Client to Server
- `create_room` - Create a new chat room
- `join_room` - Join an existing room with invite code
- `leave_room` - Leave a room
- `send_message` - Send a message (with optional reply)
- `edit_message` - Edit your own message
- `delete_message` - Delete your own message
- `add_reaction` - Add emoji reaction to a message
- `remove_reaction` - Remove your reaction
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `reconnect` - Reconnect with saved user data

### Server to Client
- `room_created` / `room_joined` - Room join confirmation
- `new_message` - New message received
- `message_edited` / `message_deleted` - Message updates
- `reaction_added` / `reaction_removed` - Reaction updates
- `typing` - Typing users list
- `user_joined` / `user_left` - User presence
- `user_online` / `user_offline` - Online status changes

## License

MIT
