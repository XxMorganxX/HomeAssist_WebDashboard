import { MessageSquare, Terminal, Settings, Zap, BarChart3 } from 'lucide-react'

interface SidebarProps {
  activeView: string
  onViewChange: (view: string) => void
  isConfigured?: boolean
}

export function Sidebar({ activeView, onViewChange, isConfigured = false }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <Zap className="logo-icon" />
          <span>Dashboard</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-section-title">Views</span>
          <button
            className={`nav-item ${activeView === 'conversations' ? 'active' : ''}`}
            onClick={() => onViewChange('conversations')}
          >
            <MessageSquare size={18} />
            <span>Conversations</span>
          </button>
          <button
            className={`nav-item ${activeView === 'console' ? 'active' : ''}`}
            onClick={() => onViewChange('console')}
          >
            <Terminal size={18} />
            <span>Console</span>
          </button>
          <button
            className={`nav-item ${activeView === 'usage' ? 'active' : ''}`}
            onClick={() => onViewChange('usage')}
          >
            <BarChart3 size={18} />
            <span>Usage</span>
          </button>
          <button
            className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => onViewChange('settings')}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className={`connection-status ${isConfigured ? 'connected' : ''}`}>
          <span className="status-dot" />
          <span>{isConfigured ? 'Connected' : 'Not Connected'}</span>
        </div>
      </div>
    </aside>
  )
}
