import { useState, useEffect } from 'react'

const Analytics = () => {
  const [dailyPattern, setDailyPattern] = useState(null)
  const [bestTime, setBestTime] = useState(null)
  const [loading, setLoading] = useState(false)
  const [applianceWatt, setApplianceWatt] = useState(1500)
  const [applianceDuration, setApplianceDuration] = useState(2)

  useEffect(() => {
    fetchDailyPattern()
  }, [])

  const fetchDailyPattern = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/prediction/predict_daily_pattern')
      const data = await response.json()
      if (data.status === 'success') {
        setDailyPattern(data)
      }
    } catch (error) {
      console.error('Error fetching daily pattern:', error)
    }
  }

  const findBestTime = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/prediction/predict_best_time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours: 24,
          duration_hours: applianceDuration,
          watt: applianceWatt
        })
      })
      const data = await response.json()
      if (data.status === 'success') {
        setBestTime(data)
      }
    } catch (error) {
      console.error('Error finding best time:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatHour = (hour) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:00 ${period}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Analytics</h1>
              <p className="text-gray-600">AI-powered load predictions and cost optimization</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Statistics Cards */}
        {dailyPattern && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800">Average Load</h3>
              </div>
              <p className="text-3xl font-bold text-blue-600">{dailyPattern.statistics.avg_load.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">kWh</p>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800">Average Price</h3>
              </div>
              <p className="text-3xl font-bold text-green-600">₹{dailyPattern.statistics.avg_price.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">per kWh</p>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800">Peak Load</h3>
              </div>
              <p className="text-3xl font-bold text-orange-600">{dailyPattern.statistics.max_load.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">kWh</p>
            </div>
          </div>
        )}

        {/* Best Time Optimizer */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Find Best Time to Run Appliance
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Appliance Power (Watts)</label>
              <input
                type="number"
                value={applianceWatt}
                onChange={(e) => setApplianceWatt(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Hours)</label>
              <input
                type="number"
                step="0.5"
                value={applianceDuration}
                onChange={(e) => setApplianceDuration(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={findBestTime}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 font-medium"
              >
                {loading ? 'Analyzing...' : 'Find Best Time'}
              </button>
            </div>
          </div>

          {bestTime && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h3 className="font-bold text-green-800">Best Time</h3>
                </div>
                <p className="text-3xl font-bold text-green-700 mb-2">{formatHour(bestTime.best_time.hour)}</p>
                <div className="space-y-1 text-sm">
                  <p className="text-green-700">Cost: <span className="font-bold">₹{bestTime.best_time.total_cost.toFixed(2)}</span></p>
                  <p className="text-green-700">Rate: ₹{bestTime.best_time.price_per_kwh}/kWh</p>
                  <p className="text-green-700">Load: {bestTime.best_time.predicted_load.toFixed(2)} kWh</p>
                </div>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <h3 className="font-bold text-red-800">Worst Time</h3>
                </div>
                <p className="text-3xl font-bold text-red-700 mb-2">{formatHour(bestTime.worst_time.hour)}</p>
                <div className="space-y-1 text-sm">
                  <p className="text-red-700">Cost: <span className="font-bold">₹{bestTime.worst_time.total_cost.toFixed(2)}</span></p>
                  <p className="text-red-700">Rate: ₹{bestTime.worst_time.price_per_kwh}/kWh</p>
                  <p className="text-red-700">Load: {bestTime.worst_time.predicted_load.toFixed(2)} kWh</p>
                </div>
              </div>

              <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Potential Savings</p>
                    <p className="text-2xl font-bold text-blue-800">₹{bestTime.potential_savings.amount.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-700 font-medium">Savings Percentage</p>
                    <p className="text-2xl font-bold text-blue-800">{bestTime.potential_savings.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 24-Hour Pattern */}
        {dailyPattern && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              24-Hour Load & Price Pattern
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {dailyPattern.hourly_pattern.map((hour) => {
                // Determine color based on category
                let bgColor, borderColor, textColor, badgeColor, badgeText;
                
                if (hour.load_category === 'off-peak' || hour.pricing_category === 'off-peak') {
                  bgColor = 'bg-green-50';
                  borderColor = 'border-green-300';
                  textColor = 'text-green-700';
                  badgeColor = 'bg-green-200 text-green-800';
                  badgeText = 'Off-Peak';
                } else if (hour.load_category === 'moderate' || hour.pricing_category === 'moderate') {
                  bgColor = 'bg-yellow-50';
                  borderColor = 'border-yellow-300';
                  textColor = 'text-yellow-700';
                  badgeColor = 'bg-yellow-200 text-yellow-800';
                  badgeText = 'Moderate';
                } else {
                  bgColor = 'bg-red-50';
                  borderColor = 'border-red-300';
                  textColor = 'text-red-700';
                  badgeColor = 'bg-red-200 text-red-800';
                  badgeText = 'Peak';
                }
                
                return (
                  <div
                    key={hour.hour}
                    className={`rounded-lg p-3 border-2 transition-all hover:scale-105 ${bgColor} ${borderColor}`}
                  >
                    <p className="text-xs font-semibold text-gray-600 mb-1">{formatHour(hour.hour)}</p>
                    <p className={`text-lg font-bold ${textColor}`}>
                      ₹{hour.price_per_kwh}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{hour.predicted_load.toFixed(2)} kWh</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Analytics
