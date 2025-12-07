import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

// Record a tool call
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.message_id || !body.tool_name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: message_id, tool_name' },
        { status: 400 }
      )
    }
    
    const supabase = createServerSupabase()
    
    const { data, error } = await supabase
      .from('tool_calls')
      .insert({
        message_id: body.message_id,
        tool_name: body.tool_name,
        arguments: body.arguments ?? {},
        result: body.result ?? null,
        duration_ms: body.duration_ms ?? null
      })
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    console.log('Tool call recorded:', data.id, 'tool:', body.tool_name)
    return NextResponse.json({ success: true, tool_call: data })
    
  } catch (error) {
    console.error('Tool call error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record tool call' },
      { status: 400 }
    )
  }
}

