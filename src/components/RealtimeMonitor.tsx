'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { Activity, Play, Square, Trash2, Filter, MessageSquare, Wrench, Radio } from 'lucide-react'
import type { RealtimeEvent } from '@/types/database'

const MONITORED_TABLES = ['conversation_sessions', 'conversation_messages', 'tool_calls']

export function RealtimeMonitor() {
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  const [isListening, setIsListening] = useState(false)
  const [selectedTables, setSelectedTables] = useState<string[]>(MONITORED_TABLES)
  const [filterType, setFilterType] = useState<string>('all')
  const channelRef = useRef<RealtimeChannel | null>(null)
  const eventsEndRef = useRef<HTMLDivElement>(null)

  const startListening = () => {
    if (selectedTables.length === 0) return

    const supabase = getSupabase()
    const channel = supabase.channel('realtime-monitor')

    selectedTables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          const event: RealtimeEvent = {
            id: `${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            table,
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            payload: payload.new || payload.old || {}
          }
          setEvents((prev) => [event, ...prev].slice(0, 200))
        }
      )
    })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsListening(true)
      }
    })

    channelRef.current = channel
  }

  const stopListening = () => {
    if (channelRef.current) {
      const supabase = getSupabase()
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setIsListening(false)
  }

  const toggleTable = (table: string) => {
    setSelectedTables((prev) =>
      prev.includes(table)
        ? prev.filter((t) => t !== table)
        : [...prev, table]
    )
  }

  const clearEvents = () => {
    setEvents([])
  }

  const filteredEvents = events.filter((event) =>
    filterType === 'all' ? true : event.eventType === filterType
  )

  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [])

  useEffect(() => {
    if (events.length > 0) {
      eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [events.length])

  const getEventColor = (type: string) => {
    switch (type) {
      case 'INSERT':
        return 'event-insert'
      case 'UPDATE':
        return 'event-update'
      case 'DELETE':
        return 'event-delete'
      default:
        return ''
    }
  }

  const getTableIcon = (table: string) => {
    if (table === 'conversation_messages') return <MessageSquare size={14} />
    if (table === 'tool_calls') return <Wrench size={14} />
    if (table === 'conversation_sessions') return <Radio size={14} />
    return <Activity size={14} />
  }

  const getTableLabel = (table: string) => {
    switch (table) {
      case 'conversation_sessions': return 'Sessions'
      case 'conversation_messages': return 'Messages'
      case 'tool_calls': return 'Tool Calls'
      default: return table
    }
  }

  const renderEventPreview = (event: RealtimeEvent) => {
    const payload = event.payload
    const role = payload.role as string | undefined
    const content = payload.content as string | undefined
    const wakeWordModel = payload.wake_word_model as string | undefined
    const endedAt = payload.ended_at as string | undefined
    const userId = payload.user_id as string | undefined
    const toolName = payload.tool_name as string | undefined
    const durationMs = payload.duration_ms as number | undefined
    const result = payload.result as string | undefined
    
    if (event.table === 'conversation_messages') {
      return (
        <div className="event-preview">
          {role && <span className="preview-role">{role}</span>}
          {content && (
            <span className="preview-content">
              {content.slice(0, 100)}
              {content.length > 100 ? '...' : ''}
            </span>
          )}
        </div>
      )
    }

    if (event.table === 'conversation_sessions') {
      return (
        <div className="event-preview">
          {wakeWordModel && (
            <span className="preview-title">Wake word: {wakeWordModel}</span>
          )}
          <span className="preview-id">
            {endedAt ? 'Session ended' : 'Session started'}
            {userId && ` • User: ${userId}`}
          </span>
        </div>
      )
    }

    if (event.table === 'tool_calls') {
      return (
        <div className="event-preview">
          {toolName && (
            <span className="preview-tool">
              <Wrench size={12} />
              {toolName}
            </span>
          )}
          {durationMs !== undefined && (
            <span className="preview-duration">{durationMs.toFixed(0)}ms</span>
          )}
          {result && (
            <span className="preview-content">
              {result.slice(0, 80)}
              {result.length > 80 ? '...' : ''}
            </span>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <div className="realtime-monitor">
      <div className="monitor-header">
        <div className="monitor-title">
          <Activity size={20} className={isListening ? 'pulse' : ''} />
          <h2>Realtime Events</h2>
          {isListening && <span className="live-badge">LIVE</span>}
        </div>
        <div className="monitor-actions">
          {!isListening ? (
            <button
              className="action-btn start"
              onClick={startListening}
              disabled={selectedTables.length === 0}
            >
              <Play size={16} />
              Start Listening
            </button>
          ) : (
            <button className="action-btn stop" onClick={stopListening}>
              <Square size={16} />
              Stop
            </button>
          )}
          <button
            className="icon-btn"
            onClick={clearEvents}
            disabled={events.length === 0}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="monitor-body">
        <div className="monitor-sidebar">
          <div className="sidebar-section">
            <h4>Monitor Tables</h4>
            <div className="table-checkboxes">
              {MONITORED_TABLES.map((table) => (
                <label key={table} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedTables.includes(table)}
                    onChange={() => toggleTable(table)}
                    disabled={isListening}
                  />
                  <span>{getTableLabel(table)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h4>
              <Filter size={14} />
              Filter Events
            </h4>
            <div className="filter-buttons">
              {['all', 'INSERT', 'UPDATE', 'DELETE'].map((type) => (
                <button
                  key={type}
                  className={`filter-btn ${filterType === type ? 'active' : ''}`}
                  onClick={() => setFilterType(type)}
                >
                  {type === 'all' ? 'All' : type}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section stats">
            <h4>Statistics</h4>
            <div className="stat-item">
              <span>Total Events</span>
              <strong>{events.length}</strong>
            </div>
            <div className="stat-item">
              <span>Inserts</span>
              <strong className="text-green">
                {events.filter((e) => e.eventType === 'INSERT').length}
              </strong>
            </div>
            <div className="stat-item">
              <span>Updates</span>
              <strong className="text-yellow">
                {events.filter((e) => e.eventType === 'UPDATE').length}
              </strong>
            </div>
            <div className="stat-item">
              <span>Deletes</span>
              <strong className="text-red">
                {events.filter((e) => e.eventType === 'DELETE').length}
              </strong>
            </div>
          </div>

          <div className="sidebar-section stats">
            <h4>By Table</h4>
            <div className="stat-item">
              <span>Sessions</span>
              <strong>{events.filter(e => e.table === 'conversation_sessions').length}</strong>
            </div>
            <div className="stat-item">
              <span>Messages</span>
              <strong>{events.filter(e => e.table === 'conversation_messages').length}</strong>
            </div>
            <div className="stat-item">
              <span>Tool Calls</span>
              <strong>{events.filter(e => e.table === 'tool_calls').length}</strong>
            </div>
          </div>
        </div>

        <div className="events-panel">
          {filteredEvents.length === 0 ? (
            <div className="empty-events">
              {isListening ? (
                <>
                  <Activity size={32} className="pulse" />
                  <p>Waiting for events...</p>
                  <span>Database changes will appear here in real-time</span>
                </>
              ) : (
                <>
                  <Activity size={32} />
                  <p>Not listening</p>
                  <span>Click "Start Listening" to monitor database changes</span>
                </>
              )}
            </div>
          ) : (
            <div className="events-list">
              {filteredEvents.map((event) => (
                <div key={event.id} className={`event-item ${getEventColor(event.eventType)}`}>
                  <div className="event-header">
                    <span className={`event-type ${event.eventType.toLowerCase()}`}>
                      {event.eventType}
                    </span>
                    <span className="event-table">
                      {getTableIcon(event.table)}
                      {getTableLabel(event.table)}
                    </span>
                    <span className="event-time">
                      {event.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {renderEventPreview(event)}
                  <details className="event-details">
                    <summary>Raw payload</summary>
                    <pre className="event-payload">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
              <div ref={eventsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
