'use client'

import { useState, useEffect } from 'react'
import { Save, Check, AlertCircle, ExternalLink, RefreshCw, Copy, Key } from 'lucide-react'
import { isConfigured, reinitializeSupabase } from '@/lib/supabase'

interface SettingsProps {
  onConnectionChange?: () => void
}

export function Settings({ onConnectionChange }: SettingsProps) {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [consoleToken, setConsoleToken] = useState('')
  const [saved, setSaved] = useState(false)
  const [connected, setConnected] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [copiedCredentials, setCopiedCredentials] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)

  useEffect(() => {
    const savedUrl = localStorage.getItem('supabase_url') || ''
    const savedKey = localStorage.getItem('supabase_anon_key') || ''
    const savedToken = localStorage.getItem('console_token') || ''
    setUrl(savedUrl)
    setAnonKey(savedKey)
    setConsoleToken(savedToken)
    setConnected(isConfigured())
  }, [])

  const handleSave = async () => {
    localStorage.setItem('supabase_url', url)
    localStorage.setItem('supabase_anon_key', anonKey)
    localStorage.setItem('console_token', consoleToken)
    
    reinitializeSupabase()
    
    setSaved(true)
    setConnected(isConfigured())
    setTimeout(() => setSaved(false), 2000)
    
    await testConnection()
    onConnectionChange?.()
  }

  const testConnection = async () => {
    setTesting(true)
    setTestError(null)
    
    try {
      const client = reinitializeSupabase()
      
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

  const generateToken = () => {
    const newToken = crypto.randomUUID()
    setConsoleToken(newToken)
  }

  const copyCredentialsExample = () => {
    const example = `{
  "supabase_url": "${url}",
  "supabase_key": "${anonKey}",
  "console_token": "${consoleToken}",
  "user_id": "my-chatbot",
  "wake_word_model": "hey-assistant"
}`
    navigator.clipboard.writeText(example)
    setCopiedCredentials(true)
    setTimeout(() => setCopiedCredentials(false), 2000)
  }

  const copyToken = () => {
    navigator.clipboard.writeText(consoleToken)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 2000)
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Settings</h2>
        <p>Configure your database connection and console token</p>
      </div>

      <div className="settings-content">
        {/* Connection Status */}
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
                    {testError || 'Not connected - Enter your credentials below'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Supabase Credentials */}
        <div className="settings-card">
          <div className="card-header">
            <h3>Database Credentials</h3>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="external-link"
            >
              Open Supabase
              <ExternalLink size={14} />
            </a>
          </div>
          <div className="card-body">
            <p className="info-text">
              These credentials let you view conversation history from your database.
            </p>
            <div className="form-group">
              <label htmlFor="supabase-url">Project URL</label>
              <input
                id="supabase-url"
                type="text"
                placeholder="https://your-project.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
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
            </div>
          </div>
        </div>

        {/* Console Token */}
        <div className="settings-card">
          <div className="card-header">
            <h3>Console Token</h3>
            <Key size={18} />
          </div>
          <div className="card-body">
            <p className="info-text">
              This token filters which API events appear in the Realtime Events console. 
              Use the same token in your chatbot's API requests.
            </p>
            <div className="form-group">
              <label htmlFor="console-token">Token</label>
              <div className="token-input-row">
                <input
                  id="console-token"
                  type="text"
                  placeholder="Enter or generate a token"
                  value={consoleToken}
                  onChange={(e) => setConsoleToken(e.target.value)}
                />
                <button 
                  className="icon-btn" 
                  onClick={copyToken} 
                  title="Copy token"
                  disabled={!consoleToken}
                >
                  {copiedToken ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <button className="secondary-btn" onClick={generateToken}>
              Generate Random Token
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button 
          className="save-btn full-width" 
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
              Save Settings
            </>
          )}
        </button>

        {/* API Usage */}
        <div className="settings-card">
          <div className="card-header">
            <h3>API Usage</h3>
            <button 
              className="icon-btn"
              onClick={copyCredentialsExample}
              disabled={!url || !anonKey}
              title="Copy example"
            >
              {copiedCredentials ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <div className="card-body">
            <p className="info-text">
              Include credentials and console token in API requests:
            </p>
            <pre className="code-block">
{`POST /api/sessions
{
  "supabase_url": "${url || 'YOUR_URL'}",
  "supabase_key": "${anonKey ? '***' : 'YOUR_KEY'}",
  "console_token": "${consoleToken || 'YOUR_TOKEN'}",
  "user_id": "my-chatbot"
}`}
            </pre>
            <ul className="endpoint-list">
              <li><code>POST /api/sessions</code> - Create a session</li>
              <li><code>POST /api/messages</code> - Add a message</li>
              <li><code>POST /api/tool-calls</code> - Record a tool call</li>
              <li><code>POST /api/sessions/[id]/end</code> - End a session</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
