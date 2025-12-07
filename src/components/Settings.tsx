'use client'

import { useState, useEffect } from 'react'
import { Save, Check, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { isConfigured, reinitializeSupabase } from '@/lib/supabase'

interface SettingsProps {
  onConnectionChange?: () => void
}

export function Settings({ onConnectionChange }: SettingsProps) {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [connected, setConnected] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  useEffect(() => {
    // Load from localStorage if available
    const savedUrl = localStorage.getItem('supabase_url') || ''
    const savedKey = localStorage.getItem('supabase_anon_key') || ''
    setUrl(savedUrl)
    setAnonKey(savedKey)
    setConnected(isConfigured())
  }, [])

  const handleSave = async () => {
    localStorage.setItem('supabase_url', url)
    localStorage.setItem('supabase_anon_key', anonKey)
    
    // Reinitialize the Supabase client with new credentials
    reinitializeSupabase()
    
    setSaved(true)
    setConnected(isConfigured())
    setTimeout(() => setSaved(false), 2000)
    
    // Test the connection
    await testConnection()
    
    // Notify parent component
    onConnectionChange?.()
  }

  const testConnection = async () => {
    setTesting(true)
    setTestError(null)
    
    try {
      const client = reinitializeSupabase()
      
      // Try to fetch sessions to test the connection
      const { error } = await client
        .from('conversation_sessions')
        .select('id')
        .limit(1)
      
      if (error) {
        setTestError(error.message)
        setConnected(false)
      } else {
        setConnected(true)
        setTestError(null)
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Connection failed')
      setConnected(false)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Settings</h2>
        <p>Configure your Supabase connection</p>
      </div>

      <div className="settings-content">
        <div className="settings-card">
          <div className="card-header">
            <h3>Connection Status</h3>
            <button 
              className="icon-btn" 
              onClick={testConnection}
              disabled={testing || !url || !anonKey}
              title="Test connection"
            >
              <RefreshCw size={16} className={testing ? 'spinning' : ''} />
            </button>
          </div>
          <div className="card-body">
            <div className={`status-indicator ${connected && !testError ? 'connected' : 'disconnected'}`}>
              {connected && !testError ? (
                <>
                  <Check size={20} />
                  <span>Connected to Supabase</span>
                </>
              ) : (
                <>
                  <AlertCircle size={20} />
                  <span>
                    {testError || 'Not configured - Add your credentials below'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <h3>Supabase Credentials</h3>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="external-link"
            >
              Open Supabase Dashboard
              <ExternalLink size={14} />
            </a>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="supabase-url">Project URL</label>
              <input
                id="supabase-url"
                type="text"
                placeholder="https://your-project.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <span className="help-text">
                Find this in your Supabase project settings under API
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="anon-key">Anon/Public Key</label>
              <input
                id="anon-key"
                type="password"
                placeholder="your-anon-key"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
              />
              <span className="help-text">
                The anon key is safe to use in the browser
              </span>
            </div>

            <button 
              className="save-btn" 
              onClick={handleSave}
              disabled={!url || !anonKey}
            >
              {testing ? (
                <>
                  <RefreshCw size={16} className="spinning" />
                  Testing...
                </>
              ) : saved ? (
                <>
                  <Check size={16} />
                  Saved!
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save & Connect
                </>
              )}
            </button>
          </div>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <h3>Environment Variables</h3>
          </div>
          <div className="card-body">
            <p className="info-text">
              Alternatively, create a <code>.env</code> file in your project root:
            </p>
            <pre className="code-block">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
            </pre>
          </div>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <h3>Required Tables</h3>
          </div>
          <div className="card-body">
            <p className="info-text">
              This dashboard expects the following tables in your Supabase database:
            </p>
            <ul className="table-list">
              <li><code>conversation_sessions</code> - Chat session metadata</li>
              <li><code>conversation_messages</code> - Messages within sessions</li>
              <li><code>tool_calls</code> - Tool call records linked to messages</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
