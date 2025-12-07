'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase'
import { 
  MessageSquare, 
  User, 
  Bot, 
  Wrench, 
  ChevronRight,
  RefreshCw,
  Search,
  Clock,
  ChevronDown,
  ChevronUp,
  Settings2,
  Mic
} from 'lucide-react'
import type { ConversationSession, ConversationMessage, ToolCall } from '@/types/database'

interface MessageWithTools extends ConversationMessage {
  tool_calls: ToolCall[]
}

export function ConversationViewer() {
  const [sessions, setSessions] = useState<ConversationSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageWithTools[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession)
    }
  }, [selectedSession])

  const fetchSessions = async () => {
    setLoading(true)
    setError(null)
    
    // Check if Supabase is configured
    const { isConfigured } = await import('@/lib/supabase')
    if (!isConfigured()) {
      setError('Supabase not configured. Please add your credentials in Settings.')
      setLoading(false)
      return
    }
    
    try {
      const supabase = getSupabase()
      const { data, error: fetchError } = await supabase
        .from('conversation_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100)

      if (fetchError) {
        console.error('Fetch error:', fetchError)
        const errorMsg = fetchError.message || fetchError.code || JSON.stringify(fetchError)
        setError(errorMsg || 'Failed to fetch sessions')
        return
      }
      
      setSessions(data || [])
      
      // Auto-select first session
      if (data && data.length > 0 && !selectedSession) {
        setSelectedSession(data[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (sessionId: string) => {
    setMessagesLoading(true)
    try {
      const supabase = getSupabase()
      
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true })

      if (messagesError) throw messagesError

      if (!messagesData || messagesData.length === 0) {
        setMessages([])
        return
      }

      // Get message IDs for assistant messages to fetch tool calls
      const assistantMessageIds = messagesData
        .filter(m => m.role === 'assistant')
        .map(m => m.id)

      let toolCallsMap: Record<number, ToolCall[]> = {}

      if (assistantMessageIds.length > 0) {
        const { data: toolCallsData, error: toolCallsError } = await supabase
          .from('tool_calls')
          .select('*')
          .in('message_id', assistantMessageIds)
          .order('executed_at', { ascending: true })

        if (toolCallsError) {
          console.error('Failed to fetch tool calls:', toolCallsError)
        } else if (toolCallsData) {
          // Group tool calls by message_id
          toolCallsMap = toolCallsData.reduce((acc, tc) => {
            if (!acc[tc.message_id]) acc[tc.message_id] = []
            acc[tc.message_id].push(tc)
            return acc
          }, {} as Record<number, ToolCall[]>)
        }
      }

      // Combine messages with their tool calls
      const messagesWithTools: MessageWithTools[] = messagesData.map(msg => ({
        ...msg,
        tool_calls: toolCallsMap[msg.id] || []
      }))

      setMessages(messagesWithTools)
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setMessagesLoading(false)
    }
  }

  const toggleToolExpanded = (toolId: number) => {
    setExpandedTools(prev => {
      const next = new Set(prev)
      if (next.has(toolId)) {
        next.delete(toolId)
      } else {
        next.add(toolId)
      }
      return next
    })
  }

  const filteredSessions = sessions.filter(session => {
    const searchLower = searchTerm.toLowerCase()
    return (
      session.id.toLowerCase().includes(searchLower) ||
      session.user_id?.toLowerCase().includes(searchLower) ||
      session.wake_word_model?.toLowerCase().includes(searchLower)
    )
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const formatDuration = (session: ConversationSession) => {
    if (!session.ended_at) return 'Active'
    const start = new Date(session.started_at).getTime()
    const end = new Date(session.ended_at).getTime()
    const durationMs = end - start
    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const renderToolCall = (toolCall: ToolCall) => {
    const isExpanded = expandedTools.has(toolCall.id)

    return (
      <div key={toolCall.id} className="tool-call">
        <button 
          className="tool-call-header"
          onClick={() => toggleToolExpanded(toolCall.id)}
        >
          <div className="tool-call-info">
            <Wrench size={14} />
            <span className="tool-name">{toolCall.tool_name}</span>
            {toolCall.duration_ms && (
              <span className="tool-duration">{toolCall.duration_ms.toFixed(0)}ms</span>
            )}
          </div>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        
        {isExpanded && (
          <div className="tool-call-details">
            <div className="tool-section">
              <span className="tool-section-label">Arguments</span>
              <pre className="tool-code">
                {JSON.stringify(toolCall.arguments, null, 2)}
              </pre>
            </div>
            {toolCall.result && (
              <div className="tool-section">
                <span className="tool-section-label">Result</span>
                <pre className="tool-code">{toolCall.result}</pre>
              </div>
            )}
            <div className="tool-meta">
              <span>Executed: {new Date(toolCall.executed_at).toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderMessage = (message: MessageWithTools) => {
    const isUser = message.role === 'user'
    const isAssistant = message.role === 'assistant'
    const isSystem = message.role === 'system'

    return (
      <div key={message.id} className={`message ${message.role}`}>
        <div className="message-avatar">
          {isUser && <User size={18} />}
          {isAssistant && <Bot size={18} />}
          {isSystem && <Settings2 size={18} />}
        </div>
        
        <div className="message-body">
          <div className="message-header">
            <span className="message-role">
              {isUser && 'User'}
              {isAssistant && 'Assistant'}
              {isSystem && 'System'}
            </span>
            <span className="message-time">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
            {message.confidence !== null && (
              <span className="message-confidence">
                {(message.confidence * 100).toFixed(0)}% confidence
              </span>
            )}
            {!message.is_final && (
              <span className="message-interim">interim</span>
            )}
          </div>
          
          <div className="message-content">
            {message.content}
          </div>
          
          {message.tool_calls && message.tool_calls.length > 0 && (
            <div className="tool-calls">
              <div className="tool-calls-header">
                <Wrench size={14} />
                <span>{message.tool_calls.length} tool call{message.tool_calls.length > 1 ? 's' : ''}</span>
              </div>
              {message.tool_calls.map(tc => renderToolCall(tc))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const getSessionPreview = (session: ConversationSession) => {
    // Find the first user message in this session from our current messages
    if (selectedSession === session.id && messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user')
      if (firstUserMsg) {
        return firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
      }
    }
    return null
  }

  if (error) {
    return (
      <div className="conversation-viewer">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h2>Connection Error</h2>
          <p>{error}</p>
          <button className="retry-btn" onClick={fetchSessions}>
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="conversation-viewer">
      <div className="conversations-sidebar">
        <div className="conversations-header">
          <h3>
            <MessageSquare size={18} />
            Sessions
          </h3>
          <button className="icon-btn" onClick={fetchSessions} title="Refresh">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
        </div>
        
        <div className="conversations-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="conversations-list">
          {loading ? (
            <div className="loading-state small">
              <div className="spinner" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="empty-conversations">
              <MessageSquare size={24} />
              <span>No sessions found</span>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <button
                key={session.id}
                className={`conversation-item ${selectedSession === session.id ? 'active' : ''}`}
                onClick={() => setSelectedSession(session.id)}
              >
                <div className="conversation-info">
                  <span className="conversation-title">
                    {session.wake_word_model ? (
                      <><Mic size={12} /> {session.wake_word_model}</>
                    ) : (
                      `Session ${session.id.slice(0, 8)}...`
                    )}
                  </span>
                  <span className="conversation-preview">
                    {getSessionPreview(session) || `User: ${session.user_id}`}
                  </span>
                  <div className="session-meta-row">
                    <span className={`session-status ${session.ended_at ? 'ended' : 'active'}`}>
                      {session.ended_at ? 'Ended' : 'Active'}
                    </span>
                    <span className="session-duration">{formatDuration(session)}</span>
                  </div>
                </div>
                <div className="conversation-meta">
                  <Clock size={12} />
                  <span>{formatDate(session.started_at)}</span>
                </div>
                <ChevronRight size={14} className="conversation-arrow" />
              </button>
            ))
          )}
        </div>
      </div>

      <div className="messages-panel">
        {!selectedSession ? (
          <div className="no-conversation">
            <MessageSquare size={48} />
            <h2>Select a Session</h2>
            <p>Choose a conversation session from the sidebar to view its messages</p>
          </div>
        ) : messagesLoading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="no-messages">
            <MessageSquare size={32} />
            <p>No messages in this session</p>
          </div>
        ) : (
          <div className="messages-container">
            <div className="messages-header">
              <div className="messages-header-info">
                <h2>
                  {sessions.find(s => s.id === selectedSession)?.wake_word_model || 
                   `Session ${selectedSession.slice(0, 8)}...`}
                </h2>
                <span className="session-id">{selectedSession}</span>
              </div>
              <div className="messages-header-meta">
                <span className="message-count">{messages.length} messages</span>
                <span className="tool-count">
                  {messages.reduce((acc, m) => acc + (m.tool_calls?.length || 0), 0)} tool calls
                </span>
              </div>
            </div>
            <div className="messages-list">
              {messages.map(renderMessage)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
