import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Comparison API
export const comparisonAPI = {
  compareEndpoint: async (endpoint, method, payload = null, params = null, v1Version = 'v1', v2Version = 'v2') => {
    const response = await api.post('/api/comparison/compare', {
      endpoint,
      method,
      payload,
      params,
      v1_version: v1Version,
      v2_version: v2Version,
    })
    return response.data
  },

  runTest: async (testCase, role = 'user', v1Version = 'v1', v2Version = 'v2') => {
    const response = await api.post('/api/comparison/run-test', {
      test_case: testCase,
      role,
      v1_version: v1Version,
      v2_version: v2Version
    })
    return response.data
  },

  compareAll: async () => {
    const response = await api.post('/api/comparison/compare-all')
    return response.data
  },

  getHistory: async () => {
    const response = await api.get('/api/comparison/history')
    return response.data
  },

  saveTest: async (reportData) => {
    const response = await api.post('/api/comparison/save-test', reportData)
    return response.data
  },

  updateTest: async (reportId, reportData) => {
    const response = await api.put(`/api/comparison/update-test/${reportId}`, reportData)
    return response.data
  },

  createFolder: async (folderData) => {
    const response = await api.post('/api/comparison/create-folder', folderData)
    return response.data
  },

  getFolders: async () => {
    const response = await api.get('/api/comparison/folders')
    return response.data
  },
  
  deleteTest: async (reportId) => {
    const response = await api.delete(`/api/comparison/delete-test/${reportId}`)
    return response.data
  },

  deleteFolder: async (folderId) => {
    const response = await api.delete(`/api/comparison/delete-folder/${folderId}`)
    return response.data
  },

  getAnalysisByReport: async (reportId) => {
    const response = await api.get(`/api/comparison/analysis/${reportId}`)
    return response.data
  },

  getAllAnalyses: async () => {
    const response = await api.get('/api/comparison/analysis')
    return response.data
  },
}

// AI API
export const aiAPI = {
  planWorkflow: async (endpoints) => {
    const response = await api.post('/api/ai/workflow/plan', { endpoints })
    return response.data
  },

  explainRegression: async (comparisonResult, userQuestion = null) => {
    const response = await api.post('/api/ai/explain', {
      comparison_result: comparisonResult,
      user_question: userQuestion,
    })
    return response.data
  },

  chat: async (question, context = null) => {
    const response = await api.post('/api/ai/chat', {
      question,
      context,
    })
    return response.data
  },

  generateTestCases: async (serviceDescription, numTestCases = 5) => {
    const response = await api.post('/api/ai/generate-test-cases', {
      service_description: serviceDescription,
      num_test_cases: numTestCases,
    })
    return response.data
  },

  analyzeReport: async (report) => {
    const response = await api.post('/api/ai/analyze-report', {
      report: report
    })
    return response.data
  },
}

// Auth API
export const authAPI = {
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me')
    return response.data
  },

  login: async () => {
    const response = await api.get('/api/auth/login')
    return response.data
  },

  logout: async () => {
    const response = await api.post('/api/auth/logout')
    return response.data
  },
}

export default api

