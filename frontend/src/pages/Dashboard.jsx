import { useState, useRef, useEffect } from 'react'

const AskAI = () => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const quickActions = [
    {
      id: 'bill',
      title: '💰 Explain My Bill',
      description: 'Understand your electricity bill',
      icon: '📊',
      color: 'from-blue-500 to-blue-600',
      prompt: 'How is my electricity bill calculated? Explain the tariff structure and billing components.'
    },
    {
      id: 'peak',
      title: '⚡ Peak Hours',
      description: 'Learn about time-of-day pricing',
      icon: '🕐',
      color: 'from-orange-500 to-orange-600',
      prompt: 'What are peak hours for electricity and how does time-of-day pricing work?'
    },
    {
      id: 'tips',
      title: '💡 Energy Saving Tips',
      description: 'Get practical advice',
      icon: '✨',
      color: 'from-green-500 to-green-600',
      prompt: 'What are the best practices for reducing electricity consumption in my home?'
    },
    {
      id: 'tariff',
      title: '📋 Tariff Rates',
      description: 'Current pricing structure',
      icon: '💵',
      color: 'from-purple-500 to-purple-600',
      prompt: 'What are the residential electricity tariff rates and pricing structure in India?'
    },
    {
      id: 'demand',
      title: '🔄 Demand Response',
      description: 'DR programs info',
      icon: '🔌',
      color: 'from-pink-500 to-pink-600',
      prompt: 'What is demand response and how can I participate in demand response programs?'
    },
    {
      id: 'policy',
      title: '📜 Smart Grid Policies',
      description: 'Regulations & guidelines',
      icon: '⚙️',
      color: 'from-indigo-500 to-indigo-600',
      prompt: 'What are the smart grid regulations and policies in India?'
    }
  ]

  const handleSendMessage = async (message) => {
    if (!message.trim()) return

    const userMessage = { role: 'user', content: message, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: message, k: 5 })
      })

      const data = await response.json()

      if (data.status === 'success') {
        const aiMessage = {
          role: 'assistant',
          content: data.answer,
          images: data.images || [],
          sources: data.sources || [],
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        throw new Error(data.message || 'Failed to get response')
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        error: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = (prompt) => {
    handleSendMessage(prompt)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    handleSendMessage(inputValue)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Ask AI Assistant</h1>
              <p className="text-sm text-gray-600">Powered by RAG & LSTM</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Actions */}
        {messages.length === 0 && (
          <div className="mb-6 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 text-left border border-gray-200 hover:border-blue-300 group"
                >
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} text-white text-xl mb-2 group-hover:scale-110 transition-transform`}>
                    {action.icon}
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm mb-0.5">{action.title}</h3>
                  <p className="text-xs text-gray-600">{action.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Messages */}
          <div className="h-[600px] overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-8 rounded-full mb-4 shadow-inner">
                  <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">How can I help you today?</h3>
                <p className="text-gray-600 max-w-md text-sm">
                  Ask me anything about electricity tariffs, energy saving tips, billing, policies, or smart grid regulations in India.
                </p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div
                      className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-4 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                          : message.error
                          ? 'bg-red-50 border-2 border-red-200 text-red-800'
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {message.role === 'assistant' && (
                          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg shrink-0 shadow-md">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div 
                            className="text-[15px] leading-relaxed break-words"
                            style={{
                              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                              lineHeight: '1.8',
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                              hyphens: 'auto'
                            }}
                          >
                            {message.content}
                          </div>
                          
                          {/* Display Images */}
                          {message.images && message.images.length > 0 && (
                            <div className="mt-4 space-y-3">
                              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Related Visuals
                              </div>
                              <div className="grid grid-cols-1 gap-3">
                                {message.images.map((image, imgIndex) => (
                                  <div key={imgIndex} className="bg-gray-50 rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <img
                                      src={`http://localhost:5000/api/rag/images/${image}`}
                                      alt={`Reference ${imgIndex + 1}`}
                                      className="w-full h-auto object-contain max-h-96"
                                      loading="lazy"
                                      onError={(e) => {
                                        e.target.style.display = 'none'
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Display Sources */}
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                Sources
                              </div>
                              <div className="space-y-1">
                                {message.sources.map((source, srcIndex) => (
                                  <p key={srcIndex} className="text-xs text-gray-600 pl-1">
                                    • {source.document} (Page {source.page})
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <p className={`text-[10px] mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}

            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything about electricity, tariffs, or energy saving..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AskAI
