# Chat Dashboard

A Next.js dashboard for viewing conversation history and realtime events from a Supabase database. Built for tool-enabled chatbots.

## Features

- **Conversation Viewer** - Browse chat sessions with messages and tool calls
- **Realtime Events** - Monitor database changes in real-time
- **API Endpoints** - POST messages, sessions, and tool calls from your chatbot

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: For server-side API routes with elevated permissions
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API Endpoints

All endpoints accept JSON and return JSON.

### `POST /api/sessions`
Create a new conversation session.

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "wake_word_model": "hey-assistant",
    "metadata": {}
  }'
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "started_at": "2024-01-01T00:00:00Z",
    "user_id": "user123",
    ...
  }
}
```

### `POST /api/sessions/[id]/end`
End a conversation session.

```bash
curl -X POST http://localhost:3000/api/sessions/SESSION_ID/end
```

### `POST /api/messages`
Add a message to a session.

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "uuid",
    "role": "user",
    "content": "Hello, assistant!",
    "is_final": true,
    "confidence": 0.95
  }'
```

### `POST /api/tool-calls`
Record a tool call for a message.

```bash
curl -X POST http://localhost:3000/api/tool-calls \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": 123,
    "tool_name": "get_weather",
    "arguments": {"location": "New York"},
    "result": "72°F, Sunny",
    "duration_ms": 150
  }'
```

### `POST /api/webhook`
Generic webhook endpoint for any data.

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"any": "data"}'
```

## Database Schema

The dashboard expects these tables in your Supabase database:

```sql
-- Sessions
CREATE TABLE conversation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    wake_word_model TEXT,
    user_id TEXT DEFAULT 'default',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Messages
CREATE TABLE conversation_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_final BOOLEAN DEFAULT TRUE,
    confidence REAL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tool calls
CREATE TABLE tool_calls (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    arguments JSONB DEFAULT '{}'::jsonb,
    result TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms REAL
);
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repo
3. Add your environment variables in Vercel's dashboard
4. Deploy!

Your API endpoints will be available at `https://your-app.vercel.app/api/...`

## License

MIT
