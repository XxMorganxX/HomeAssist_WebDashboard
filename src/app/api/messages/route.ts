import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseFromCredentials } from '@/lib/supabase'

// Add a message to a session
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
    
    if (!body.session_id || !body.role || !body.content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: session_id, role, content' },
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
      .from('conversation_messages')
      .insert({
        session_id: body.session_id,
        role: body.role,
        content: body.content,
        is_final: body.is_final ?? true,
        confidence: body.confidence ?? null,
        metadata
      })
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    console.log('Message added:', data.id, 'to session:', body.session_id)
    return NextResponse.json({ success: true, message: data })
    
  } catch (error) {
    console.error('Message creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add message' },
      { status: 400 }
    )
  }
}
