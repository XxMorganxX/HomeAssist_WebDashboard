'use client'

import { useState, useEffect } from 'react'
import { Save, Check, AlertCircle, Key, Copy } from 'lucide-react'

interface SettingsProps {
  onConnectionChange?: () => void
}

export function Settings({ onConnectionChange }: SettingsProps) {
  const [token, setToken] = useState('')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const savedToken = localStorage.getItem('dashboard_token') || ''
    setToken(savedToken)
  }, [])

  const handleSave = () => {
    localStorage.setItem('dashboard_token', token)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onConnectionChange?.()
  }

  const generateToken = () => {
    const newToken = crypto.randomUUID()
    setToken(newToken)
  }

  const copyToken = () => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isConfigured = Boolean(token)

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Settings</h2>
        <p>Configure your viewing token to see your chatbot's conversations</p>
      </div>

      <div className="settings-content">
        <div className="settings-card">
          <div className="card-header">
            <h3>Connection Status</h3>
          </div>
          <div className="card-body">
            <div className={`status-indicator ${isConfigured ? 'connected' : 'disconnected'}`}>
              {isConfigured ? (
                <>
                  <Check size={20} />
                  <span>Token configured - Ready to view conversations</span>
                </>
              ) : (
                <>
                  <AlertCircle size={20} />
                  <span>No token set - Enter or generate a token below</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <h3>Viewing Token</h3>
          </div>
          <div className="card-body">
            <p className="info-text">
              This token links your chatbot's API calls to this dashboard. 
              Use the same token in your chatbot's API requests.
            </p>

            <div className="form-group">
              <label htmlFor="token">
                <Key size={14} />
                Token
              </label>
              <div className="token-input-row">
                <input
                  id="token"
                  type="text"
                  placeholder="Enter or generate a token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <button 
                  className="icon-btn" 
                  onClick={copyToken} 
                  title="Copy token"
                  disabled={!token}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <span className="help-text">
                Use any string as your token, or generate a random one
              </span>
            </div>

            <div className="button-row">
              <button className="secondary-btn" onClick={generateToken}>
                Generate Random Token
              </button>
              <button 
                className="save-btn" 
                onClick={handleSave}
                disabled={!token}
              >
                {saved ? <Check size={16} /> : <Save size={16} />}
                {saved ? 'Saved!' : 'Save Token'}
              </button>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <h3>API Usage</h3>
          </div>
          <div className="card-body">
            <p className="info-text">
              Include your token as <code>user_id</code> in API requests:
            </p>
            <pre className="code-block">
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/sessions \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "${token || 'YOUR_TOKEN'}",
    "wake_word_model": "hey-assistant"
  }'`}
            </pre>

            <p className="info-text" style={{ marginTop: '16px' }}>
              All API endpoints use the same <code>user_id</code> to link data:
            </p>
            <ul className="endpoint-list">
              <li><code>POST /api/sessions</code> - Create session with <code>user_id</code></li>
              <li><code>POST /api/messages</code> - Messages inherit session's user_id</li>
              <li><code>POST /api/tool-calls</code> - Tool calls inherit message's session</li>
              <li><code>POST /api/sessions/[id]/end</code> - End a session</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
