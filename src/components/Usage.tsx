'use client'

import { useState, useEffect } from 'react'
import { getSupabase, isConfigured } from '@/lib/supabase'
import { BarChart3, RefreshCw, TrendingUp, MessageSquare, Zap, LineChart } from 'lucide-react'

interface SessionUsage {
  id: string
  started_at: string
  total_input_tokens: number | null
  total_output_tokens: number | null
}

interface DailyUsage {
  date: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  sessions: number
}

interface IntervalUsage {
  startTime: number
  endTime: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
  label: string
}

type ChartType = 'bar' | 'line'

export function Usage() {
  const [sessions, setSessions] = useState<SessionUsage[]>([])
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([])
  const [intervalUsage, setIntervalUsage] = useState<IntervalUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalInput, setTotalInput] = useState(0)
  const [totalOutput, setTotalOutput] = useState(0)
  const [configured, setConfigured] = useState(false)
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [tooltip, setTooltip] = useState<{ x: number, y: number, content: string } | null>(null)
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null)

  useEffect(() => {
    const isReady = isConfigured()
    setConfigured(isReady)
    if (isReady) {
      fetchUsage()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUsage = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabase()
      const { data, error: fetchError } = await supabase
        .from('conversation_sessions')
        .select('id, started_at, total_input_tokens, total_output_tokens')
        .order('started_at', { ascending: false })
        .limit(500)

      if (fetchError) throw fetchError

      setSessions(data || [])

      // Calculate totals
      let inputSum = 0
      let outputSum = 0
      
      // Group by day
      const dailyMap = new Map<string, DailyUsage>()
      
      for (const session of data || []) {
        const input = session.total_input_tokens || 0
        const output = session.total_output_tokens || 0
        inputSum += input
        outputSum += output

        const date = new Date(session.started_at).toLocaleDateString('en-CA') // YYYY-MM-DD format
        
        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            date,
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            sessions: 0
          })
        }
        
        const day = dailyMap.get(date)!
        day.input_tokens += input
        day.output_tokens += output
        day.total_tokens += input + output
        day.sessions += 1
      }

      setTotalInput(inputSum)
      setTotalOutput(outputSum)

      // Sort by date and get last 14 days
      const sortedDaily = Array.from(dailyMap.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14)
      
      setDailyUsage(sortedDaily)

      // Generate 12 intervals for line chart
      if (data && data.length > 0) {
        const timestamps = data.map(s => new Date(s.started_at).getTime())
        const minTime = Math.min(...timestamps)
        const maxTime = Math.max(...timestamps)
        const timeRange = maxTime - minTime || 1 // Avoid division by zero
        const intervalSize = timeRange / 12
        
        const intervals: IntervalUsage[] = []
        
        for (let i = 0; i < 12; i++) {
          const startTime = minTime + (i * intervalSize)
          const endTime = minTime + ((i + 1) * intervalSize)
          
          // Sum tokens for sessions in this interval
          let input = 0
          let output = 0
          
          for (const session of data) {
            const sessionTime = new Date(session.started_at).getTime()
            if (sessionTime >= startTime && sessionTime < endTime) {
              input += session.total_input_tokens || 0
              output += session.total_output_tokens || 0
            }
          }
          
          // Format label based on time range
          const startDate = new Date(startTime)
          const endDate = new Date(endTime)
          let label: string
          
          if (timeRange < 24 * 60 * 60 * 1000) {
            // Less than a day - show hours
            label = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          } else if (timeRange < 7 * 24 * 60 * 60 * 1000) {
            // Less than a week - show day and time
            label = startDate.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric' })
          } else {
            // More than a week - show date
            label = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }
          
          intervals.push({
            startTime,
            endTime,
            input_tokens: input,
            output_tokens: output,
            total_tokens: input + output,
            label
          })
        }
        
        setIntervalUsage(intervals)
      } else {
        setIntervalUsage([])
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const estimateCost = (input: number, output: number): string => {
    // Rough estimate based on GPT-4 pricing ($0.03/1K input, $0.06/1K output)
    const cost = (input / 1000) * 0.03 + (output / 1000) * 0.06
    return cost.toFixed(2)
  }

  const getMaxTokens = (): number => {
    if (dailyUsage.length === 0) return 1
    return Math.max(...dailyUsage.map(d => d.total_tokens), 1)
  }

  const getMaxIntervalTokens = (): number => {
    if (intervalUsage.length === 0) return 1
    return Math.max(...intervalUsage.map(d => d.total_tokens), 1)
  }

  // Generate SVG path for line chart (viewBox is 100x50) using intervals
  const generateIntervalLinePath = (data: IntervalUsage[], key: 'input_tokens' | 'output_tokens' | 'total_tokens'): string => {
    if (data.length === 0) return ''
    
    const maxTokens = getMaxIntervalTokens()
    const width = data.length > 1 ? 100 / (data.length - 1) : 0
    
    return data.map((d, i) => {
      const x = data.length === 1 ? 50 : i * width
      const y = 50 - (d[key] / maxTokens) * 45 // Scale to fit in 0-50 range with padding
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }

  // Generate data points as percentage positions for HTML overlay using intervals
  const generateIntervalDataPoints = (data: IntervalUsage[], key: 'input_tokens' | 'output_tokens'): { xPercent: number, yPercent: number, value: number }[] => {
    if (data.length === 0) return []
    
    const maxTokens = getMaxIntervalTokens()
    
    return data.map((d, i) => {
      const xPercent = data.length === 1 ? 50 : (i / (data.length - 1)) * 100
      const yPercent = 100 - ((d[key] / maxTokens) * 90) // 90% of height, with some padding
      return { xPercent, yPercent, value: d[key] }
    })
  }


  if (!configured) {
    return (
      <div className="usage-container">
        <div className="usage-empty">
          <BarChart3 size={48} />
          <h2>Not Configured</h2>
          <p>Add your Supabase credentials in Settings to view token usage.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="usage-container">
        <div className="usage-empty">
          <div className="spinner" />
          <p>Loading usage data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="usage-container">
        <div className="usage-empty">
          <div className="error-icon">⚠️</div>
          <h2>Error</h2>
          <p>{error}</p>
          <button className="retry-btn" onClick={fetchUsage}>
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    )
  }

  const maxTokens = getMaxTokens()
  const totalTokens = totalInput + totalOutput
  const inputDataPoints = generateIntervalDataPoints(intervalUsage, 'input_tokens')
  const outputDataPoints = generateIntervalDataPoints(intervalUsage, 'output_tokens')

  return (
    <>
    <div className="usage-container">
      <div className="usage-header">
        <div className="usage-title">
          <BarChart3 size={24} />
          <h2>Token Usage</h2>
        </div>
        <button className="icon-btn" onClick={fetchUsage} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="usage-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <Zap size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatNumber(totalTokens)}</span>
            <span className="stat-label">Total Tokens</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon input">
            <TrendingUp size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatNumber(totalInput)}</span>
            <span className="stat-label">Input Tokens</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon output">
            <TrendingUp size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatNumber(totalOutput)}</span>
            <span className="stat-label">Output Tokens</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cost">
            <MessageSquare size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">${estimateCost(totalInput, totalOutput)}</span>
            <span className="stat-label">Est. Cost (GPT-4)</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="usage-chart-container">
        <div className="chart-header">
          <h3>{chartType === 'bar' ? 'Daily Usage (Last 14 Days)' : 'Usage Over Time (12 Intervals)'}</h3>
          <div className="chart-type-selector">
            <button 
              className={`chart-type-btn ${chartType === 'bar' ? 'active' : ''}`}
              onClick={() => setChartType('bar')}
              title="Bar Chart"
            >
              <BarChart3 size={16} />
            </button>
            <button 
              className={`chart-type-btn ${chartType === 'line' ? 'active' : ''}`}
              onClick={() => setChartType('line')}
              title="Line Chart"
            >
              <LineChart size={16} />
            </button>
          </div>
        </div>

        {dailyUsage.length === 0 ? (
          <div className="chart-empty">
            <p>No usage data available</p>
          </div>
        ) : (
          <div className="usage-chart">
            {chartType === 'bar' ? (
              /* Bar Chart */
              <div className="chart-bars">
                {dailyUsage.map((day) => (
                  <div 
                    key={day.date} 
                    className="chart-bar-group"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTooltip({
                        x: rect.left + rect.width / 2,
                        y: rect.top - 10,
                        content: `${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}\nInput: ${formatNumber(day.input_tokens)}\nOutput: ${formatNumber(day.output_tokens)}\nTotal: ${formatNumber(day.total_tokens)}`
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <div className="chart-bar-wrapper">
                      <div 
                        className="chart-bar output"
                        style={{ height: `${(day.output_tokens / maxTokens) * 100}%` }}
                      />
                      <div 
                        className="chart-bar input"
                        style={{ height: `${(day.input_tokens / maxTokens) * 100}%` }}
                      />
                    </div>
                    <span className="chart-label">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="chart-value">{formatNumber(day.total_tokens)}</span>
                  </div>
                ))}
              </div>
            ) : (
              /* Line Chart */
              <div className="chart-line-container">
                <div className="chart-line-wrapper">
                  <svg 
                    className="chart-line-svg" 
                    viewBox="0 0 100 50" 
                    preserveAspectRatio="none"
                  >
                    {/* Grid lines */}
                    <line x1="0" y1="12.5" x2="100" y2="12.5" className="chart-grid-line" />
                    <line x1="0" y1="25" x2="100" y2="25" className="chart-grid-line" />
                    <line x1="0" y1="37.5" x2="100" y2="37.5" className="chart-grid-line" />
                    
                    {/* Area fills */}
                    <path 
                      d={`${generateIntervalLinePath(intervalUsage, 'output_tokens')} L 100 50 L 0 50 Z`}
                      className="chart-area output"
                    />
                    <path 
                      d={`${generateIntervalLinePath(intervalUsage, 'input_tokens')} L 100 50 L 0 50 Z`}
                      className="chart-area input"
                    />
                    
                    {/* Lines */}
                    <path 
                      d={generateIntervalLinePath(intervalUsage, 'output_tokens')}
                      className="chart-line output"
                    />
                    <path 
                      d={generateIntervalLinePath(intervalUsage, 'input_tokens')}
                      className="chart-line input"
                    />
                  </svg>
                  
                  {/* Data points as HTML elements to avoid stretching */}
                  <div className="chart-points-overlay">
                    {intervalUsage.map((interval, i) => {
                      const xPercent = intervalUsage.length === 1 ? 50 : (i / (intervalUsage.length - 1)) * 100
                      return (
                        <div
                          key={`hover-${i}`}
                          className="chart-point-hitarea"
                          style={{ left: `${xPercent}%` }}
                          onMouseEnter={(e) => {
                            setHoveredPointIndex(i)
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltip({
                              x: rect.left + rect.width / 2,
                              y: rect.top - 10,
                              content: `${interval.label}\nInput: ${formatNumber(interval.input_tokens)}\nOutput: ${formatNumber(interval.output_tokens)}\nTotal: ${formatNumber(interval.total_tokens)}`
                            })
                          }}
                          onMouseLeave={() => {
                            setHoveredPointIndex(null)
                            setTooltip(null)
                          }}
                        />
                      )
                    })}
                    {outputDataPoints.map((point, i) => (
                      <div
                        key={`output-${i}`}
                        className={`chart-point output ${hoveredPointIndex === i ? 'hovered' : ''}`}
                        style={{ left: `${point.xPercent}%`, top: `${point.yPercent}%` }}
                      />
                    ))}
                    {inputDataPoints.map((point, i) => (
                      <div
                        key={`input-${i}`}
                        className={`chart-point input ${hoveredPointIndex === i ? 'hovered' : ''}`}
                        style={{ left: `${point.xPercent}%`, top: `${point.yPercent}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="chart-line-labels">
                  {intervalUsage.filter((_, i) => i === 0 || i === 5 || i === 11).map((interval, i) => (
                    <span 
                      key={interval.startTime} 
                      className="chart-line-label"
                    >
                      {interval.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color input" />
                <span>Input Tokens</span>
              </div>
              <div className="legend-item">
                <span className="legend-color output" />
                <span>Output Tokens</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Sessions Table */}
      <div className="usage-table-container">
        <h3>Recent Sessions</h3>
        <div className="usage-table-wrapper">
          <table className="usage-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Input</th>
                <th>Output</th>
                <th>Total</th>
                <th>Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 20).map((session) => {
                const input = session.total_input_tokens || 0
                const output = session.total_output_tokens || 0
                return (
                  <tr key={session.id}>
                    <td>{new Date(session.started_at).toLocaleString()}</td>
                    <td>{formatNumber(input)}</td>
                    <td>{formatNumber(output)}</td>
                    <td>{formatNumber(input + output)}</td>
                    <td>${estimateCost(input, output)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Tooltip - rendered outside container */}
    {tooltip && (
      <div 
        className="chart-tooltip"
        style={{ 
          left: tooltip.x,
          top: tooltip.y
        }}
      >
        {tooltip.content.split('\n').map((line, i) => (
          <div key={i} className={i === 0 ? 'tooltip-title' : 'tooltip-line'}>
            {line}
          </div>
        ))}
      </div>
    )}
    </>
  )
}
