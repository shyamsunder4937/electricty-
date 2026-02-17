import { useState } from 'react'
import RoomSelector from './RoomSelector'

const SchedulerCard = ({ schedule, onUpdate, onDelete, onCancel }) => {
  const [formData, setFormData] = useState({
    name: schedule.name,
    action: schedule.action,
    scheduleType: schedule.scheduleType || 'every day',
    selectedDays: schedule.selectedDays || [],
    time: schedule.time,
    watt: schedule.watt || 50,
    duration: schedule.duration || 0.1,
    autoAdjust: false
  })
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [showRoomSelector, setShowRoomSelector] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showExplanations, setShowExplanations] = useState(false)

  const dayOptions = [
    { value: 'every day', label: 'EVERY DAY' },
    { value: 'weekdays', label: 'WEEKDAYS' },
    { value: 'custom', label: 'OTHER' }
  ]

  const weekDays = [
    { value: 'monday', label: 'Mon' },
    { value: 'tuesday', label: 'Tue' },
    { value: 'wednesday', label: 'Wed' },
    { value: 'thursday', label: 'Thu' },
    { value: 'friday', label: 'Fri' },
    { value: 'saturday', label: 'Sat' },
    { value: 'sunday', label: 'Sun' }
  ]

  const handleScheduleTypeChange = (type) => {
    setFormData({ ...formData, scheduleType: type })
    if (type === 'custom') {
      setShowDayPicker(true)
    } else {
      setShowDayPicker(false)
      setFormData({ ...formData, scheduleType: type, selectedDays: [] })
    }
  }

  const toggleDay = (day) => {
    const days = formData.selectedDays.includes(day)
      ? formData.selectedDays.filter(d => d !== day)
      : [...formData.selectedDays, day]
    setFormData({ ...formData, selectedDays: days })
  }

  const incrementHour = () => {
    const [h, m] = formData.time.split(':').map(Number)
    const newH = (h + 1) % 24
    setFormData({ ...formData, time: `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}` })
  }

  const decrementHour = () => {
    const [h, m] = formData.time.split(':').map(Number)
    const newH = (h - 1 + 24) % 24
    setFormData({ ...formData, time: `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}` })
  }

  const incrementMinute = () => {
    const [h, m] = formData.time.split(':').map(Number)
    const newM = (m + 1) % 60
    setFormData({ ...formData, time: `${String(h).padStart(2, '0')}:${String(newM).padStart(2, '0')}` })
  }

  const decrementMinute = () => {
    const [h, m] = formData.time.split(':').map(Number)
    const newM = (m - 1 + 60) % 60
    setFormData({ ...formData, time: `${String(h).padStart(2, '0')}:${String(newM).padStart(2, '0')}` })
  }

  const getPrediction = async () => {
    if (!formData.name) {
      alert('Please select an appliance first')
      return
    }
    
    setLoading(true)
    try {
      const [hours] = formData.time.split(':')
      const response = await fetch('http://localhost:5000/api/scheduling/schedule_appliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watt: formData.watt,
          duration_hours: formData.duration,
          time_of_day: parseInt(hours),
          schedule_type: formData.scheduleType,
          selected_days: formData.selectedDays,
          appliance_name: formData.name,
          include_explanations: true
        })
      })
      const data = await response.json()
      if (data.status === 'success') {
        setPrediction(data)
        setShowExplanations(true)
      } else {
        alert('Error getting prediction: ' + data.message)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to get prediction')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name) {
      alert('Please select an appliance')
      return
    }
    
    if (formData.scheduleType === 'custom' && formData.selectedDays.length === 0) {
      alert('Please select at least one day')
      return
    }

    if (onUpdate) {
      onUpdate(schedule.id, { ...formData, prediction })
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(schedule.id)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-4">
      {/* Show RoomSelector inline when open, otherwise show normal form */}
      {showRoomSelector ? (
        <RoomSelector
          isOpen={showRoomSelector}
          onClose={() => setShowRoomSelector(false)}
          onSelect={(name) => {
            setFormData({ ...formData, name })
            setShowRoomSelector(false)
          }}
        />
      ) : (
        <>
          {/* ACTION Section */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Action</label>
            <button
              type="button"
              onClick={() => setShowRoomSelector(true)}
              className="w-full bg-blue-500 rounded-lg p-4 flex items-center gap-3 hover:bg-blue-600 transition shadow-sm cursor-pointer"
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              <span className="text-white font-medium">{formData.name || 'Select appliance'}</span>
            </button>
          </div>

          {/* APPLIANCE DETAILS Section */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Appliance Details</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Power (Watts)</label>
                <input
                  type="number"
                  value={formData.watt}
                  onChange={(e) => setFormData({ ...formData, watt: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Hours)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* DAYS Section */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-gray-400 mb-3 uppercase">Days</label>
        <div className="flex gap-2 mb-3">
          {dayOptions.map(day => (
            <button
              key={day.value}
              type="button"
              onClick={() => handleScheduleTypeChange(day.value)}
              className={`px-6 py-2 rounded text-sm font-medium transition ${
                formData.scheduleType === day.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>

        {(formData.scheduleType === 'custom' || showDayPicker) && (
          <div className="bg-gray-50 rounded p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-3">Select specific days:</p>
            <div className="flex flex-wrap gap-2">
              {weekDays.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-4 py-2 rounded text-sm font-medium transition ${
                    formData.selectedDays.includes(day.value)
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            {formData.selectedDays.length > 0 && (
              <p className="text-sm text-green-600 mt-2">
                Selected: {formData.selectedDays.join(', ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* TIME Section */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-gray-400 mb-3 uppercase">Time</label>
        <div className="flex items-center justify-start gap-6">
          <div className="text-center">
            <button 
              type="button"
              onClick={incrementHour}
              className="text-blue-500 text-3xl hover:text-blue-600 transition"
            >
              ▲
            </button>
            <div className="text-6xl font-light my-3">{formData.time.split(':')[0]}</div>
            <button 
              type="button"
              onClick={decrementHour}
              className="text-blue-500 text-3xl hover:text-blue-600 transition"
            >
              ▼
            </button>
          </div>
          <div className="text-6xl font-light">:</div>
          <div className="text-center">
            <button 
              type="button"
              onClick={incrementMinute}
              className="text-blue-500 text-3xl hover:text-blue-600 transition"
            >
              ▲
            </button>
            <div className="text-6xl font-light my-3">{formData.time.split(':')[1]}</div>
            <button 
              type="button"
              onClick={decrementMinute}
              className="text-blue-500 text-3xl hover:text-blue-600 transition"
            >
              ▼
            </button>
          </div>
        </div>
      </div>

      {/* Get Prediction Button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={getPrediction}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-blue-600 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Calculate Cost & Insights
        </button>
      </div>

      {/* Loading Animation */}
      {loading && (
        <div className="mb-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-200 rounded-xl p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2 animate-pulse" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
                Analyzing Your Schedule...
              </h3>
              <p className="text-sm text-gray-600" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
                Our AI is calculating optimal costs and energy predictions
              </p>
            </div>
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        </div>
      )}

      {/* Prediction Results */}
      {prediction && !loading && (
        <div className="mb-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-300 rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-gray-800" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>Cost Analysis</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-xl p-4 shadow-md border border-blue-100 hover:shadow-lg transition">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>Energy</div>
              </div>
              <div className="text-2xl font-bold text-gray-800" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>{prediction.energy_kwh?.toFixed(2)}</div>
              <div className="text-xs text-gray-500 font-medium">kWh</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-md border border-green-100 hover:shadow-lg transition">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>Total Cost</div>
              </div>
              <div className="text-2xl font-bold text-green-600" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>₹{prediction.total_cost?.toFixed(2)}</div>
              <div className="text-xs text-gray-500 font-medium">Estimated</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-md border border-orange-100 hover:shadow-lg transition">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>Rate</div>
              </div>
              <div className="text-2xl font-bold text-orange-600" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>₹{prediction.price_per_kwh?.toFixed(2)}</div>
              <div className="text-xs text-gray-500 font-medium">per kWh</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-md border border-purple-100 hover:shadow-lg transition">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>Grid Load</div>
              </div>
              <div className="text-2xl font-bold text-purple-600" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>{ prediction.predicted_grid_load?.toFixed(2)}</div>
              <div className="text-xs text-gray-500 font-medium">kWh</div>
            </div>
          </div>
          
          {prediction.peak_time && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-700 text-sm font-medium">Peak Time - Higher electricity rates apply</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowExplanations(!showExplanations)}
            className="text-blue-600 hover:text-blue-700 font-semibold text-base flex items-center gap-2 transition-all hover:gap-3"
            style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}
          >
            <svg className={`w-5 h-5 transition-transform ${showExplanations ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            {showExplanations ? 'Hide' : 'View'} AI Insights
          </button>

          {showExplanations && prediction.explanations && (
            <div className="mt-4 space-y-3">
              {prediction.explanations.pricing_explanation && (
                <div className="bg-white border-l-4 border-yellow-400 rounded-r-xl p-4 shadow-md hover:shadow-lg transition">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-yellow-100 p-1.5 rounded-lg">
                      <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-lg font-bold text-gray-800" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>💰 Pricing Insight</div>
                  </div>
                  <div className="text-[15px] text-gray-700 leading-relaxed" style={{fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.6', whiteSpace: 'normal'}}>{prediction.explanations.pricing_explanation}</div>
                  {prediction.explanations.pricing_images && prediction.explanations.pricing_images.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {prediction.explanations.pricing_images.map((img, idx) => (
                        <img 
                          key={idx}
                          src={`http://localhost:5000/api/scheduling/images/${img}`}
                          alt="Pricing chart"
                          className="max-w-full h-auto rounded border border-gray-200"
                          style={{maxHeight: '200px'}}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {prediction.explanations.bill_explanation && (
                <div className="bg-white border-l-4 border-blue-400 rounded-r-xl p-4 shadow-md hover:shadow-lg transition">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-100 p-1.5 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-lg font-bold text-gray-800" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>📊 Bill Breakdown</div>
                  </div>
                  <div className="text-[15px] text-gray-700 leading-relaxed" style={{fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.6', whiteSpace: 'normal'}}>{prediction.explanations.bill_explanation}</div>
                  {prediction.explanations.bill_images && prediction.explanations.bill_images.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {prediction.explanations.bill_images.map((img, idx) => (
                        <img 
                          key={idx}
                          src={`http://localhost:5000/api/scheduling/images/${img}`}
                          alt="Bill chart"
                          className="max-w-full h-auto rounded border border-gray-200"
                          style={{maxHeight: '200px'}}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {prediction.explanations.energy_saving_tips && (
                <div className="bg-white border-l-4 border-green-400 rounded-r-xl p-4 shadow-md hover:shadow-lg transition">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-green-100 p-1.5 rounded-lg">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-lg font-bold text-gray-800" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>💡 Energy Saving Tips</div>
                  </div>
                  <div className="text-[15px] text-gray-700 leading-relaxed" style={{fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.6', whiteSpace: 'normal'}}>{prediction.explanations.energy_saving_tips}</div>
                  {prediction.explanations.tips_images && prediction.explanations.tips_images.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {prediction.explanations.tips_images.map((img, idx) => (
                        <img 
                          key={idx}
                          src={`http://localhost:5000/api/scheduling/images/${img}`}
                          alt="Energy saving chart"
                          className="max-w-full h-auto rounded border border-gray-200"
                          style={{maxHeight: '200px'}}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button 
              type="button"
              onClick={handleCancel}
              className="flex-1 px-6 py-3 border-2 border-blue-400 text-blue-500 rounded-lg hover:bg-blue-50 transition font-medium uppercase"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleDelete}
              className="flex-1 px-6 py-3 border-2 border-blue-400 text-blue-500 rounded-lg hover:bg-blue-50 transition font-medium uppercase"
            >
              Delete
            </button>
            <button 
              type="button"
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium uppercase shadow-md"
            >
              Save
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default SchedulerCard
