import { NextRequest, NextResponse } from 'next/server'

// In-memory store for console logs (per-instance, will reset on cold starts)
// For production, use Redis/Vercel KV or a database
const logStore = new Map<string, Array<{
  id: string
  timestamp: string
  text: string
  is_positive: boolean
}>>()

// Keep only last 100 logs per token, and clean up old entries
const MAX_LOGS_PER_TOKEN = 100
const LOG_TTL_MS = 60 * 60 * 1000 // 1 hour

// POST: Add a console log
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { token, text, is_positive } = body
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: token' },
        { status: 400 }
      )
    }
    
    if (text === undefined || text === null) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: text' },
        { status: 400 }
      )
    }
    
    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: body.timestamp || new Date().toISOString(),
      text: String(text),
      is_positive: Boolean(is_positive)
    }
    
    // Get or create log array for this token
    if (!logStore.has(token)) {
      logStore.set(token, [])
    }
    
    const logs = logStore.get(token)!
    logs.push(logEntry)
    
    // Keep only last N logs
    if (logs.length > MAX_LOGS_PER_TOKEN) {
      logs.shift()
    }
    
    console.log(`Console log added for token ${token.slice(0, 8)}...:`, logEntry.text.slice(0, 50))
    
    return NextResponse.json({ 
      success: true, 
      log: logEntry 
    })
    
  } catch (error) {
    console.error('Console log error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add log' },
      { status: 400 }
    )
  }
}

// GET: Fetch console logs for a token
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    const since = request.nextUrl.searchParams.get('since') // ISO timestamp
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: token' },
        { status: 400 }
      )
    }
    
    let logs = logStore.get(token) || []
    
    // Filter by timestamp if provided
    if (since) {
      const sinceTime = new Date(since).getTime()
      logs = logs.filter(log => new Date(log.timestamp).getTime() > sinceTime)
    }
    
    // Clean up old logs
    const cutoffTime = Date.now() - LOG_TTL_MS
    if (logStore.has(token)) {
      const allLogs = logStore.get(token)!
      const freshLogs = allLogs.filter(log => new Date(log.timestamp).getTime() > cutoffTime)
      logStore.set(token, freshLogs)
    }
    
    return NextResponse.json({ 
      success: true, 
      logs,
      count: logs.length
    })
    
  } catch (error) {
    console.error('Console fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}

// DELETE: Clear logs for a token
export async function DELETE(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: token' },
        { status: 400 }
      )
    }
    
    logStore.delete(token)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Logs cleared'
    })
    
  } catch (error) {
    console.error('Console clear error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clear logs' },
      { status: 500 }
    )
  }
}

