import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

// Create a new conversation session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    let supabase
    try {
      supabase = createServerSupabase()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.' },
        { status: 500 }
      )
    }
    
    const { data, error } = await supabase
      .from('conversation_sessions')
      .insert({
        wake_word_model: body.wake_word_model ?? null,
        user_id: body.user_id ?? 'default',
        metadata: body.metadata ?? {}
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
export async function GET() {
  try {
    let supabase
    try {
      supabase = createServerSupabase()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.' },
        { status: 500 }
      )
    }
    
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
