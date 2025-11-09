import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { aiAPI, comparisonAPI } from '../services/api'
import JsonDiff from '../components/JsonDiff'

const Analysis = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { reportId } = useParams()
  const [report, setReport] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [loadingFromDb, setLoadingFromDb] = useState(false)

  useEffect(() => {
    // Check if we have a reportId in URL params (for loading saved analysis)
    if (reportId) {
      // Reset state for single analysis view
      setAnalysis(null)
      setReport(null)
      setError(null)
      loadSavedAnalysis(reportId)
    } else {
      // Get report data from location state (passed from History page)
      const reportData = location.state?.report
      if (reportData) {
        // Reset state for report analysis
        setAnalysis(null)
        setError(null)
        setReport(reportData)
        // Try to load existing analysis first, then generate if not found
        if (reportData.id) {
          loadExistingAnalysis(reportData.id)
        } else {
          // No report ID, show option to generate
          setError(null)
        }
      } else {
        // No report data - show list of all analyses
        // Always load the list when there's no reportId and no reportData
        setAnalysis(null)
        setReport(null)
        setError(null)
        loadAllAnalyses()
      }
    }
  }, [location.state, reportId])

  const loadAllAnalyses = async () => {
    setLoadingFromDb(true)
    setError(null)
    try {
      const response = await comparisonAPI.getAllAnalyses()
      console.log('All analyses response:', response)
      if (response.success) {
        // Store analyses for list view (even if empty array)
        setAnalysis({ _list: response.analyses || [] })
      } else {
        setError(response.error || 'Failed to load analyses')
        setAnalysis({ _list: [] })
      }
    } catch (error) {
      console.error('Failed to load analyses:', error)
      setError('Failed to load analyses: ' + (error.message || 'Unknown error'))
      setAnalysis({ _list: [] })
    } finally {
      setLoadingFromDb(false)
    }
  }

  const loadSavedAnalysis = async (id) => {
    setLoadingFromDb(true)
    setError(null)
    try {
      const response = await comparisonAPI.getAnalysisByReport(id)
      if (response.success && response.analysis) {
        // Convert saved analysis to ReportAnalysis format
        setAnalysis({
          developer_perspective: response.analysis.developer,
          user_perspective: response.analysis.user,
          business_perspective: response.analysis.business,
          regression_analysis: response.analysis.changes,
          predicted_failures: response.analysis.prediction,
          ethical_concerns: response.analysis.ethical || 'Ethical analysis not available'
        })
        // Try to load the report data too
        const reportResponse = await comparisonAPI.getHistory()
        if (reportResponse.success && reportResponse.history) {
          const foundReport = reportResponse.history.find(r => r.id === id)
          if (foundReport) {
            setReport(foundReport)
          }
        }
      } else {
        // Analysis not found, but we have report data - allow generating
        if (location.state?.report) {
          setReport(location.state.report)
          setError(null) // Clear error, will show generate button instead
        } else {
          setError('Analysis not found. Please select a report from History to generate analysis.')
        }
      }
    } catch (error) {
      console.error('Failed to load saved analysis:', error)
      setError('Failed to load saved analysis: ' + (error.message || 'Unknown error'))
    } finally {
      setLoadingFromDb(false)
    }
  }

  const loadExistingAnalysis = async (reportId) => {
    if (!reportId) {
      // No report ID, generate new analysis
      runAnalysis(location.state?.report)
      return
    }

    setLoadingFromDb(true)
    try {
      const response = await comparisonAPI.getAnalysisByReport(reportId)
      if (response.success && response.analysis) {
        // Load existing analysis
        setAnalysis({
          developer_perspective: response.analysis.developer,
          user_perspective: response.analysis.user,
          business_perspective: response.analysis.business,
          regression_analysis: response.analysis.changes,
          predicted_failures: response.analysis.prediction,
          ethical_concerns: response.analysis.ethical || 'Ethical analysis not available'
        })
        setLoadingFromDb(false)
      } else {
        // No existing analysis, generate new one
        setLoadingFromDb(false)
        runAnalysis(location.state?.report)
      }
    } catch (error) {
      console.error('Failed to load existing analysis:', error)
      // Continue to generate new analysis
      setLoadingFromDb(false)
      runAnalysis(location.state?.report)
    }
  }

  const runAnalysis = async (reportData) => {
    if (!reportData) return

    setLoading(true)
    setError(null)
    try {
      console.log('🔬 Generating analysis for report:', {
        id: reportData.id,
        title: reportData.title,
        hasId: !!reportData.id
      })
      const response = await aiAPI.analyzeReport(reportData) // Automatically saves to DB
      setAnalysis(response)
      console.log('✅ Analysis generated and saved')
    } catch (error) {
      console.error('Analysis failed:', error)
      setError(error.response?.data?.detail || error.message || 'Failed to analyze report')
    } finally {
      setLoading(false)
    }
  }

  if (error && !report && !analysis) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="bg-red-500/20 border border-red-500 rounded-xl p-8 text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/history')}
              className="px-6 py-2 bg-neon-cyan rounded-lg text-white font-semibold hover:shadow-neon-cyan transition-all"
            >
              Go to History
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-5xl font-bold gradient-text mb-10">
              🔬 Deep Analysis
            </h1>
            <p className="text-gray-400 text-lg">
              Comprehensive regression analysis from multiple perspectives
            </p>
          </div>
          <div className="flex gap-2">
            {report && (
              <button
                onClick={() => navigate('/history')}
                className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white hover:border-neon-cyan transition-all"
              >
                ← Back to History
              </button>
            )}
            {!reportId && !report && (
              <button
                onClick={() => navigate('/history')}
                className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white hover:border-neon-cyan transition-all"
              >
                📜 Go to History
              </button>
            )}
          </div>
        </div>

        {report && (
          <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-bold text-white">{report.title}</h2>
                <span className="px-3 py-1 bg-neon-purple/20 text-neon-purple rounded text-sm">
                  {report.test_type === 'all_tests' ? 'All Tests' : 'Single Test'}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(report.saved_at).toLocaleString()}
                </span>
              </div>
              {!analysis && report && (
                <button
                  onClick={() => runAnalysis(report)}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-cyber rounded-lg text-white font-semibold hover:shadow-neon-cyan transition-all disabled:opacity-50"
                >
                  {loading ? 'Generating...' : '🔬 Generate Analysis'}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {(loading || loadingFromDb) ? (
        <div className="bg-dark-card border border-dark-border rounded-xl p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">
            {loadingFromDb ? 'Loading saved analysis...' : 'Analyzing report with Gemini AI...'}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {loadingFromDb ? 'Fetching from database...' : 'This may take a few moments'}
          </p>
        </div>
      ) : analysis && !analysis._list ? (
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex justify-between items-center mb-4">
            <div>
              {report && report.id && (
                <button
                  onClick={async () => {
                    // Analysis is automatically saved when generated, but show confirmation
                    alert('Analysis is automatically saved to the database when generated!')
                  }}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition-all flex items-center space-x-2"
                >
                  <span>💾</span>
                  <span>Analysis Saved</span>
                </button>
              )}
            </div>
            <button
              onClick={() => {
                // Generate comprehensive PDF with all content
                const printWindow = window.open('', '_blank')
                const reportTitle = report?.title || 'Analysis Report'
                const date = new Date().toLocaleString()
                const reportNotes = report?.notes || 'No notes provided'
                const reportAinotes = report?.ainotes || 'No AI summary available'
                
                // Escape HTML
                const escapeHtml = (text) => {
                  if (!text) return ''
                  return String(text)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;')
                }
                
                const formatText = (text) => {
                  if (!text) return ''
                  return escapeHtml(text).replace(/\n/g, '<br>')
                }
                
                const htmlContent = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>${escapeHtml(reportTitle)} - Deep Analysis Report</title>
                    <style>
                      @media print {
                        body { margin: 0; padding: 20px; }
                        .page-break { page-break-after: always; }
                      }
                      body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        padding: 40px;
                        background: white;
                        color: #1a1a1a;
                        line-height: 1.6;
                        max-width: 900px;
                        margin: 0 auto;
                      }
                      .header {
                        border-bottom: 3px solid #00f0ff;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                      }
                      h1 { 
                        color: #00f0ff; 
                        font-size: 32px;
                        margin: 0 0 10px 0;
                      }
                      h2 { 
                        color: #00f0ff; 
                        margin-top: 40px;
                        margin-bottom: 15px;
                        font-size: 24px;
                        border-bottom: 2px solid #e0e0e0;
                        padding-bottom: 8px;
                      }
                      h3 { 
                        color: #666; 
                        margin-top: 20px;
                        font-size: 18px;
                        font-weight: normal;
                      }
                      .section { 
                        margin: 30px 0; 
                        padding: 20px; 
                        border-left: 5px solid #00f0ff; 
                        background: #f9f9f9;
                        border-radius: 4px;
                      }
                      .section.user {
                        border-left-color: #ff00ff;
                        background: #fff5ff;
                      }
                      .section.business {
                        border-left-color: #ffaa00;
                        background: #fffaf0;
                      }
                      .meta { 
                        color: #666; 
                        font-size: 14px; 
                        margin-bottom: 30px;
                        padding: 15px;
                        background: #f5f5f5;
                        border-radius: 4px;
                      }
                      .meta p {
                        margin: 5px 0;
                      }
                      .content {
                        color: #333;
                        font-size: 15px;
                        line-height: 1.8;
                        text-align: justify;
                      }
                      .emphasis {
                        font-weight: bold;
                        color: #ff00ff;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <h1>🔬 Deep Analysis Report</h1>
                      <div class="meta">
                        <p><strong>Report Title:</strong> ${escapeHtml(reportTitle)}</p>
                        <p><strong>Generated:</strong> ${date}</p>
                        <p><strong>Test Type:</strong> ${report?.test_type || 'Unknown'}</p>
                        <p><strong>Report Notes:</strong> ${formatText(reportNotes)}</p>
                      </div>
                    </div>
                    
                    ${reportAinotes ? `
                      <div class="section">
                        <h2>🤖 Gemini AI Summary</h2>
                        <div class="content">${formatText(reportAinotes)}</div>
                      </div>
                    ` : ''}
                    
                    ${analysis.developer_perspective ? `
                      <div class="section">
                        <h2>👨‍💻 Developer Perspective</h2>
                        <div class="content">${formatText(analysis.developer_perspective)}</div>
                      </div>
                    ` : ''}
                    
                    ${analysis.user_perspective ? `
                      <div class="section user">
                        <h2>👤 User Perspective <span class="emphasis">(MOST IMPORTANT)</span></h2>
                        <div class="content">${formatText(analysis.user_perspective)}</div>
                      </div>
                    ` : ''}
                    
                    ${analysis.business_perspective ? `
                      <div class="section business">
                        <h2>💼 Business Perspective</h2>
                        <div class="content">${formatText(analysis.business_perspective)}</div>
                      </div>
                    ` : ''}
                    
                    ${analysis.predicted_failures ? `
                      <div class="section" style="border-left-color: #ff8800;">
                        <h2>🔮 Predictions (Future Failures & Issues)</h2>
                        <div class="content">${formatText(analysis.predicted_failures)}</div>
                        <div style="margin-top: 15px; padding: 10px; background: #fff5e6; border-left: 3px solid #ff8800; border-radius: 4px;">
                          <p style="font-weight: bold; color: #ff8800; margin-bottom: 5px;">⚠️ What to Watch For:</p>
                          <p style="font-size: 13px; color: #666;">These predictions identify potential issues that may occur when switching to v2, related endpoints that might fail, and patterns that could cause problems.</p>
                        </div>
                      </div>
                    ` : ''}
                    
                    ${analysis.regression_analysis ? `
                      <div class="section" style="border-left-color: #ff4444;">
                        <h2>🔧 Changes (What Needs to Be Fixed)</h2>
                        <div class="content">${formatText(analysis.regression_analysis)}</div>
                        <div style="margin-top: 15px; padding: 10px; background: #ffe6e6; border-left: 3px solid #ff4444; border-radius: 4px;">
                          <p style="font-weight: bold; color: #ff4444; margin-bottom: 5px;">🚨 Action Required:</p>
                          <p style="font-size: 13px; color: #666;">These changes must be implemented before switching to v2 or to fix issues in either version. Review each change carefully and prioritize based on severity.</p>
                        </div>
                      </div>
                    ` : ''}
                    
                    ${analysis.ethical_concerns ? `
                      <div class="section" style="border-left-color: #9b59b6;">
                        <h2>⚖️ Ethical Concerns</h2>
                        <div class="content">${formatText(analysis.ethical_concerns)}</div>
                        <div style="margin-top: 15px; padding: 10px; background: #f3e5f5; border-left: 3px solid #9b59b6; border-radius: 4px;">
                          <p style="font-weight: bold; color: #9b59b6; margin-bottom: 5px;">⚠️ Ethical Considerations:</p>
                          <p style="font-size: 13px; color: #666;">These ethical implications should be carefully reviewed to ensure compliance with ethical guidelines, user rights, and responsible AI practices.</p>
                        </div>
                      </div>
                    ` : ''}
                    
                    <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; text-align: center;">
                      <p>Generated by SentinelTwin AI Digital Twin Platform</p>
                      <p>${date}</p>
                    </div>
                  </body>
                  </html>
                `
                
                printWindow.document.write(htmlContent)
                printWindow.document.close()
                setTimeout(() => {
                  printWindow.print()
                }, 250)
              }}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-all flex items-center space-x-2"
            >
              <span>📄</span>
              <span>Export as PDF</span>
            </button>
          </div>

          {/* Developer Perspective - Component 1 */}
          {analysis.developer_perspective && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-card border-2 border-neon-cyan/50 rounded-xl p-8 shadow-lg"
            >
              <h3 className="text-3xl font-bold text-neon-cyan mb-6 flex items-center">
                <span className="mr-3 text-4xl">👨‍💻</span>
                Developer Perspective
              </h3>
              <div className="bg-dark-bg rounded-lg p-6">
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-lg">
                  {analysis.developer_perspective}
                </p>
              </div>
            </motion.div>
          )}

          {/* User Perspective - Component 2 (MOST IMPORTANT) */}
          {analysis.user_perspective && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-card border-2 border-neon-pink/50 rounded-xl p-8 shadow-lg"
            >
              <h3 className="text-3xl font-bold text-neon-pink mb-6 flex items-center">
                <span className="mr-3 text-4xl">👤</span>
                User Perspective
                <span className="ml-4 text-xl bg-red-600 px-3 py-1 rounded-full">MOST IMPORTANT</span>
              </h3>
              <div className="bg-dark-bg rounded-lg p-6">
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-lg">
                  {analysis.user_perspective}
                </p>
              </div>
            </motion.div>
          )}

          {/* Business Perspective - Component 3 */}
          {analysis.business_perspective && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-dark-card border-2 border-yellow-400/50 rounded-xl p-8 shadow-lg"
            >
              <h3 className="text-3xl font-bold text-yellow-400 mb-6 flex items-center">
                <span className="mr-3 text-4xl">💼</span>
                Business Perspective
              </h3>
              <div className="bg-dark-bg rounded-lg p-6">
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-lg">
                  {analysis.business_perspective}
                </p>
              </div>
            </motion.div>
          )}

          {/* Predictions - Component 4 */}
          {analysis.predicted_failures && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-dark-card border-2 border-orange-500/50 rounded-xl p-8 shadow-lg"
            >
              <h3 className="text-3xl font-bold text-orange-400 mb-6 flex items-center">
                <span className="mr-3 text-4xl">🔮</span>
                Predictions (Future Failures & Issues)
              </h3>
              <div className="bg-dark-bg rounded-lg p-6">
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-lg">
                  {analysis.predicted_failures}
                </p>
                <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <p className="text-sm text-orange-300 font-semibold mb-2">⚠️ What to Watch For:</p>
                  <p className="text-sm text-gray-300">
                    These predictions identify potential issues that may occur when switching to v2, 
                    related endpoints that might fail, and patterns that could cause problems.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Changes - Component 5 */}
          {analysis.regression_analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-dark-card border-2 border-red-500/50 rounded-xl p-8 shadow-lg"
            >
              <h3 className="text-3xl font-bold text-red-400 mb-6 flex items-center">
                <span className="mr-3 text-4xl">🔧</span>
                Changes (What Needs to Be Fixed)
              </h3>
              <div className="bg-dark-bg rounded-lg p-6">
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-lg">
                  {analysis.regression_analysis}
                </p>
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-300 font-semibold mb-2">🚨 Action Required:</p>
                  <p className="text-sm text-gray-300">
                    These changes must be implemented before switching to v2 or to fix issues in either version. 
                    Review each change carefully and prioritize based on severity.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Ethical Concerns - Component 6 */}
          {analysis.ethical_concerns && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-dark-card border-2 border-purple-500/50 rounded-xl p-8 shadow-lg"
            >
              <h3 className="text-3xl font-bold text-purple-400 mb-6 flex items-center">
                <span className="mr-3 text-4xl">⚖️</span>
                Ethical Concerns
              </h3>
              <div className="bg-dark-bg rounded-lg p-6">
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-lg">
                  {analysis.ethical_concerns}
                </p>
                <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <p className="text-sm text-purple-300 font-semibold mb-2">⚠️ Ethical Considerations:</p>
                  <p className="text-sm text-gray-300">
                    These ethical implications should be carefully reviewed to ensure compliance with ethical guidelines, 
                    user rights, and responsible AI practices.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      ) : analysis?._list ? (
        // List view of all analyses
        <div className="space-y-4">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">All Saved Analyses</h2>
            <p className="text-gray-400">
              {analysis._list.length === 0 
                ? 'No analyses found. Go to History to generate a new analysis report.'
                : `Found ${analysis._list.length} saved ${analysis._list.length === 1 ? 'analysis' : 'analyses'}`}
            </p>
          </div>
          
          {analysis._list.length === 0 ? (
            <div className="bg-dark-card border border-dark-border rounded-xl p-12 text-center">
              <p className="text-gray-400 mb-4">No analysis reports found</p>
              <button
                onClick={() => navigate('/history')}
                className="px-6 py-3 bg-gradient-cyber rounded-lg text-white font-semibold hover:shadow-neon-cyan transition-all"
              >
                Go to History to Generate Analysis
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysis._list.map((item) => {
                const reportTitle = item.saved_test_reports?.title || 'Untitled Report'
                const reportDate = item.saved_test_reports?.saved_at || item.created_at
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-dark-card border border-dark-border rounded-xl p-6 hover:border-neon-cyan transition-all cursor-pointer"
                    onClick={() => navigate(`/analysis/${item.report_id}`, { 
                      state: { report: { id: item.report_id, title: reportTitle } } 
                    })}
                  >
                    <h3 className="text-lg font-bold text-white mb-2 truncate">{reportTitle}</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      {new Date(reportDate).toLocaleString()}
                    </p>
                    <div className="space-y-2">
                      <div className="text-xs text-gray-500">
                        <span className="text-neon-cyan">Developer:</span> {item.developer.substring(0, 50)}...
                      </div>
                      <div className="text-xs text-gray-500">
                        <span className="text-neon-pink">User:</span> {item.user.substring(0, 50)}...
                      </div>
                      <div className="text-xs text-gray-500">
                        <span className="text-yellow-400">Business:</span> {item.business.substring(0, 50)}...
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/analysis/${item.report_id}`, { 
                          state: { report: { id: item.report_id, title: reportTitle } } 
                        })
                      }}
                      className="mt-4 w-full px-4 py-2 bg-gradient-cyber rounded-lg text-white text-sm font-semibold hover:shadow-neon-cyan transition-all"
                    >
                      View Analysis
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-dark-card border border-dark-border rounded-xl p-12 text-center">
          <p className="text-gray-400 mb-4">
            {report ? 'No analysis available. Click "Generate Analysis" to create one.' : 'No analysis available'}
          </p>
          {report && (
            <button
              onClick={() => runAnalysis(report)}
              disabled={loading}
              className="px-6 py-3 bg-gradient-cyber rounded-lg text-white font-semibold hover:shadow-neon-cyan transition-all disabled:opacity-50"
            >
              {loading ? 'Generating...' : '🔬 Generate Analysis'}
            </button>
          )}
          {!report && (
            <button
              onClick={() => navigate('/history')}
              className="px-6 py-3 bg-gradient-cyber rounded-lg text-white font-semibold hover:shadow-neon-cyan transition-all"
            >
              Go to History
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Analysis

