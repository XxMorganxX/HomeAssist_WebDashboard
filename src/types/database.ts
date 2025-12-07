export interface ConversationSession {
  id: string
  started_at: string
  ended_at: string | null
  wake_word_model: string | null
  user_id: string
  metadata: Record<string, unknown>
}

export interface ConversationMessage {
  id: number
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  is_final: boolean
  confidence: number | null
  metadata: Record<string, unknown>
}

export interface ToolCall {
  id: number
  message_id: number
  tool_name: string
  arguments: Record<string, unknown>
  result: string | null
  executed_at: string
  duration_ms: number | null
}

export interface MessageWithToolCalls extends ConversationMessage {
  tool_calls?: ToolCall[]
}

export interface RealtimeEvent {
  id: string
  timestamp: Date
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: Record<string, unknown>
}
