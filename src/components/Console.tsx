'use client'

import { useState, useEffect, useRef } from 'react'
import { Terminal, Trash2, User, Bot, Zap, RefreshCw } from 'lucide-react'
import type { ConsoleLog } from '@/types/database'

const POLL_INTERVAL = 1000 // Poll every second

export function Console() {
  const [logs, setLogs] = useState<ConsoleLog[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const savedToken = localStorage.getItem('console_token')
    setToken(savedToken)
  }, [])

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const fetchLogs = async () => {
    if (!token) return

    try {
      const params = new URLSearchParams({ token })
      if (lastTimestamp) {
        params.append('since', lastTimestamp)
      }

      const res = await fetch(`/api/console/log?${params}`)
      const data = await res.json()

      if (data.success && data.logs.length > 0) {
        setLogs(prev => {
          // Merge new logs, avoiding duplicates
          const existingIds = new Set(prev.map(l => l.id))
          const newLogs = data.logs.filter((l: ConsoleLog) => !existingIds.has(l.id))
          return [...prev, ...newLogs]
        })
        
        // Update last timestamp
        const latestLog = data.logs[data.logs.length - 1]
        setLastTimestamp(latestLog.timestamp)
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    }
  }

  // Auto-start polling when token is available
  useEffect(() => {
    if (!token) return

    setIsPolling(true)
    fetchLogs() // Fetch immediately
    
    // Start polling
    pollIntervalRef.current = setInterval(fetchLogs, POLL_INTERVAL)

    return () => {
      // Cleanup on unmount or token change
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      setIsPolling(false)
    }
  }, [token])

  const clearLogs = async () => {
    if (!token) return
    
    try {
      await fetch(`/api/console/log?token=${token}`, { method: 'DELETE' })
      setLogs([])
      setLastTimestamp(null)
    } catch (err) {
      console.error('Failed to clear logs:', err)
    }
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User size={16} />
      case 'agent':
        return <Bot size={16} />
      case 'command':
      default:
        return <Zap size={16} />
    }
  }

  const getMessageLabel = (type: string) => {
    switch (type) {
      case 'user':
        return 'User'
      case 'agent':
        return 'Agent'
      case 'command':
      default:
        return 'System'
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // No token configured
  if (!token) {
    return (
      <div className="console-container">
        <div className="console-empty">
          <Terminal size={48} />
          <h2>No Console Token</h2>
          <p>Go to Settings and set a Console Token to start receiving logs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="console-container">
      <div className="console-header">
        <div className="console-title">
          <Terminal size={20} />
          <h2>Live Console</h2>
          <span className="live-badge">
            <RefreshCw size={12} className={isPolling ? 'spinning' : ''} />
            LIVE
          </span>
        </div>
        <div className="console-meta">
          <span className="token-badge">Token: {token.slice(0, 12)}...</span>
        </div>
        <div className="console-actions">
          <button
            className="icon-btn"
            onClick={clearLogs}
            disabled={logs.length === 0}
            title="Clear console"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="console-body">
        {logs.length === 0 ? (
          <div className="console-empty-logs">
            <Terminal size={32} className="pulse" />
            <p>Waiting for messages...</p>
            <span>POST to /api/console/log with token: {token.slice(0, 8)}...</span>
          </div>
        ) : (
          <div className="chat-messages">
            {logs.map((log) => {
              const messageType = log.type || 'command'
              return (
                <div 
                  key={log.id} 
                  className={`chat-message ${messageType}`}
                >
                  <div className={`chat-avatar ${messageType}`}>
                    {getMessageIcon(messageType)}
                  </div>
                  
                  <div className="chat-content">
                    <div className="chat-header">
                      <span className={`chat-sender ${messageType}`}>
                        {getMessageLabel(messageType)}
                      </span>
                      <span className="chat-time">
                        {formatTime(log.timestamp)}
                      </span>
                      {log.is_positive !== undefined && (
                        <span className={`chat-status ${log.is_positive ? 'success' : 'error'}`}>
                          {log.is_positive ? '✓' : '✗'}
                        </span>
                      )}
                    </div>
                    <div className="chat-text">
                      {log.text}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="console-footer">
        <span>{logs.length} message{logs.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}
