'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { ConversationViewer } from '@/components/ConversationViewer'
import { RealtimeMonitor } from '@/components/RealtimeMonitor'
import { Settings } from '@/components/Settings'
import { isConfigured } from '@/lib/supabase'

export default function Home() {
  const [activeView, setActiveView] = useState('conversations')
  const [configured, setConfigured] = useState(false)
  const [key, setKey] = useState(0)

  const checkConfiguration = useCallback(() => {
    const isReady = isConfigured()
    setConfigured(isReady)
    if (!isReady) {
      setActiveView('settings')
    }
  }, [])

  useEffect(() => {
    checkConfiguration()
  }, [checkConfiguration])

  const handleConnectionChange = () => {
    checkConfiguration()
    setKey(prev => prev + 1)
    if (isConfigured()) {
      setActiveView('conversations')
    }
  }

  const renderContent = () => {
    switch (activeView) {
      case 'conversations':
        return <ConversationViewer key={key} />
      case 'realtime':
        return <RealtimeMonitor key={key} />
      case 'settings':
        return <Settings onConnectionChange={handleConnectionChange} />
      default:
        return <ConversationViewer key={key} />
    }
  }

  return (
    <div className="app">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isConfigured={configured}
      />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  )
}

