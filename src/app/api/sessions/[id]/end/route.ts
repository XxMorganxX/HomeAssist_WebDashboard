import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseFromCredentials } from '@/lib/supabase'

// End a conversation session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const { supabase_url, supabase_key } = body
    
    if (!supabase_url || !supabase_key) {
      return NextResponse.json(
        { success: false, error: 'Missing supabase_url or supabase_key in request body' },
        { status: 400 }
      )
    }
    
    const supabase = createSupabaseFromCredentials(supabase_url, supabase_key)
    
    const { data, error } = await supabase
      .from('conversation_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    console.log('Session ended:', id)
    return NextResponse.json({ success: true, session: data })
    
  } catch (error) {
    console.error('Session end error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to end session' },
      { status: 400 }
    )
  }
}
