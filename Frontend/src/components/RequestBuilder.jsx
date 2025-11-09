import React, { useState } from 'react'
import { motion } from 'framer-motion'

const RequestBuilder = ({
  baseUrl,
  setBaseUrl,
  endpoint,
  setEndpoint,
  method,
  setMethod,
  headers,
  setHeaders,
  body,
  setBody,
  onFileUpload,
  fileInputRef,
  onSend,
  loading
}) => {
  const [activeTab, setActiveTab] = useState('body')
  const [jsonError, setJsonError] = useState(null)

  const validateJSON = (text) => {
    try {
      JSON.parse(text)
      setJsonError(null)
      return true
    } catch (e) {
      setJsonError(e.message)
      return false
    }
  }

  const handleBodyChange = (value) => {
    setBody(value)
    if (value.trim()) {
      validateJSON(value)
    } else {
      setJsonError(null)
    }
  }

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }])
  }

  const updateHeader = (index, field, value) => {
    const newHeaders = [...headers]
    newHeaders[index][field] = value
    setHeaders(newHeaders)
  }

  const removeHeader = (index) => {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(body)
      setBody(JSON.stringify(parsed, null, 2))
      setJsonError(null)
    } catch (e) {
      setJsonError('Invalid JSON')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-dark-border rounded-xl"
    >
      {/* Request URL Bar */}
      <div className="p-4 border-b border-dark-border bg-dark-bg">
        <div className="flex items-center space-x-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white font-semibold focus:outline-none focus:border-neon-cyan"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
          
          <div className="flex-1 flex items-center space-x-2">
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="Base URL"
              className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
            />
            <span className="text-gray-400">/</span>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="/api/v1/endpoint"
              className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
            />
          </div>

          <button
            onClick={onSend}
            disabled={loading || (method !== 'GET' && jsonError)}
            className="px-6 py-2 bg-gradient-cyber rounded-lg text-white font-semibold hover:shadow-neon-cyan transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Sending...' : '▶️ Send'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-border">
        <button
          onClick={() => setActiveTab('params')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'params'
              ? 'text-neon-cyan border-b-2 border-neon-cyan'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Params
        </button>
        <button
          onClick={() => setActiveTab('headers')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'headers'
              ? 'text-neon-cyan border-b-2 border-neon-cyan'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Headers ({headers.length})
        </button>
        <button
          onClick={() => setActiveTab('body')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'body'
              ? 'text-neon-cyan border-b-2 border-neon-cyan'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Body
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'params' && (
          <div className="text-gray-400 text-sm">
            Query parameters will be added here
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="space-y-2">
            {headers.map((header, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={header.key}
                  onChange={(e) => updateHeader(index, 'key', e.target.value)}
                  placeholder="Header name"
                  className="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
                />
                <input
                  type="text"
                  value={header.value}
                  onChange={(e) => updateHeader(index, 'value', e.target.value)}
                  placeholder="Header value"
                  className="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
                />
                <button
                  onClick={() => removeHeader(index)}
                  className="px-3 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={addHeader}
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-neon-cyan hover:border-neon-cyan transition-colors text-sm"
            >
              + Add Header
            </button>
          </div>
        )}

        {activeTab === 'body' && (
          <div className="space-y-2 h-[570px]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={formatJSON}
                  className="px-3 py-1 bg-dark-bg border border-dark-border rounded text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Format JSON
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-dark-bg border border-dark-border rounded text-xs text-gray-400 hover:text-white transition-colors"
                >
                  📁 Import File
                </button>
              </div>
              {jsonError && (
                <span className="text-xs text-red-400">{jsonError}</span>
              )}
            </div>
              <textarea
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
                className="w-full min-h-[500px] px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white font-mono text-sm focus:outline-none focus:border-neon-cyan resize-none"
                placeholder='{\n  "key": "value"\n}'
                spellCheck={false}
              />
            <div className="text-xs text-gray-500 mt-2">
              Tip: Paste JSON directly or import from a file
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default RequestBuilder



