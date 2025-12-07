import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseFromCredentials } from '@/lib/supabase'

// Create a new conversation session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { supabase_url, supabase_key, console_token } = body
    
    if (!supabase_url || !supabase_key) {
      return NextResponse.json(
        { success: false, error: 'Missing supabase_url or supabase_key in request body' },
        { status: 400 }
      )
    }
    
    const supabase = createSupabaseFromCredentials(supabase_url, supabase_key)
    
    // Store console_token in metadata for realtime filtering
    const metadata = {
      ...(body.metadata ?? {}),
      console_token: console_token ?? null
    }
    
    const { data, error } = await supabase
      .from('conversation_sessions')
      .insert({
        wake_word_model: body.wake_word_model ?? null,
        user_id: body.user_id ?? 'default',
        metadata
      })
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    console.log('Session created:', data.id)
    return NextResponse.json({ success: true, session: data })
    
  } catch (error) {
    console.error('Session creation error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create session'
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}

// Get all sessions
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('supabase_url')
    const key = request.nextUrl.searchParams.get('supabase_key')
    
    if (!url || !key) {
      return NextResponse.json(
        { success: false, error: 'Missing supabase_url or supabase_key query parameters' },
        { status: 400 }
      )
    }
    
    const supabase = createSupabaseFromCredentials(url, key)
    
    const { data, error } = await supabase
      .from('conversation_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100)
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, sessions: data })
    
  } catch (error) {
    console.error('Session fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}
