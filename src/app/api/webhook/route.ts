import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log the incoming webhook data
    console.log('Webhook received:', JSON.stringify(body, null, 2))
    
    // Example: If the webhook contains a message, save it to Supabase
    if (body.session_id && body.role && body.content) {
      const supabase = createServerSupabase()
      
      const { data, error } = await supabase
        .from('conversation_messages')
        .insert({
          session_id: body.session_id,
          role: body.role,
          content: body.content,
          is_final: body.is_final ?? true,
          confidence: body.confidence ?? null,
          metadata: body.metadata ?? {}
        })
        .select()
        .single()
      
      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      
      return NextResponse.json({ success: true, message: data })
    }
    
    // Generic success response for other webhook types
    return NextResponse.json({ 
      success: true, 
      received: body,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    endpoint: '/api/webhook',
    methods: ['POST'],
    timestamp: new Date().toISOString()
  })
}

