'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { ConversationViewer } from '@/components/ConversationViewer'
import { Console } from '@/components/Console'
import { Usage } from '@/components/Usage'
import { Settings } from '@/components/Settings'
import { isConfigured } from '@/lib/supabase'

export default function Home() {
  const [activeView, setActiveView] = useState('console')
  const [configured, setConfigured] = useState(false)
  const [key, setKey] = useState(0)

  const checkConfiguration = useCallback(() => {
    setConfigured(isConfigured())
  }, [])

  useEffect(() => {
    checkConfiguration()
  }, [checkConfiguration])

  const handleConnectionChange = () => {
    checkConfiguration()
    setKey(prev => prev + 1)
  }

  const renderContent = () => {
    switch (activeView) {
      case 'conversations':
        return <ConversationViewer key={key} />
      case 'console':
        return <Console key={key} />
      case 'usage':
        return <Usage key={key} />
      case 'settings':
        return <Settings onConnectionChange={handleConnectionChange} />
      default:
        return <Console key={key} />
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
