import { useState } from 'react'

const AddScheduleModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: 'bedroom curtains',
    type: 'curtain',
    action: 'close',
    schedule: 'every day',
    time: '20:00',
    watt: 50,
    duration: 0.1,
    autoAdjust: false
  })
  const [loading, setLoading] = useState(false)
  const [costEstimate, setCostEstimate] = useState(null)

  const dayOptions = [
    { value: 'every day', label: 'EVERY DAY' },
    { value: 'weekdays', label: 'WEEKDAYS' },
    { value: 'other', label: 'OTHER' }
  ]

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

  const calculateCost = async () => {
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
          include_explanations: false
        })
      })
      const data = await response.json()
      if (data.status === 'success') {
        setCostEstimate(data.total_cost)
      }
    } catch (error) {
      console.error('Error calculating cost:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd({ 
      ...formData, 
      cost: costEstimate, 
      enabled: true, 
      id: Date.now() 
    })
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setFormData({
      name: 'bedroom curtains',
      type: 'curtain',
      action: 'close',
      schedule: 'every day',
      time: '20:00',
      watt: 50,
      duration: 0.1,
      autoAdjust: false
    })
    setCostEstimate(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        <div className="p-8">
          <h2 className="text-3xl font-normal text-gray-700 mb-8">Scheduler</h2>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* ACTION Section */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-3 uppercase">Action</label>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-blue-100 rounded p-4 flex items-center gap-3">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                  <span className="text-blue-600 font-medium">bedroom curtains</span>
                </div>
                <span className="text-gray-400 text-2xl">→</span>
                <div className="flex-1 bg-blue-100 rounded p-4 flex items-center gap-3">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-blue-600 font-medium">close</span>
                </div>
              </div>
            </div>

            {/* DAYS Section */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-3 uppercase">Days</label>
              <div className="flex gap-2">
                {dayOptions.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, schedule: day.value })}
                    className={`px-6 py-2 rounded text-sm font-medium transition ${
                      formData.schedule === day.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TIME Section */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-3 uppercase">Time</label>
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <button 
                    type="button" 
                    onClick={incrementHour}
                    className="text-blue-500 text-3xl hover:text-blue-600"
                  >
                    ▲
                  </button>
                  <div className="text-6xl font-light my-3">{formData.time.split(':')[0]}</div>
                  <button 
                    type="button" 
                    onClick={decrementHour}
                    className="text-blue-500 text-3xl hover:text-blue-600"
                  >
                    ▼
                  </button>
                </div>
                <div className="text-6xl font-light">:</div>
                <div className="text-center">
                  <button 
                    type="button" 
                    onClick={incrementMinute}
                    className="text-blue-500 text-3xl hover:text-blue-600"
                  >
                    ▲
                  </button>
                  <div className="text-6xl font-light my-3">{formData.time.split(':')[1]}</div>
                  <button 
                    type="button" 
                    onClick={decrementMinute}
                    className="text-blue-500 text-3xl hover:text-blue-600"
                  >
                    ▼
                  </button>
                </div>
              </div>
            </div>

            {/* OPTIONS Section */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-3 uppercase">Options</label>
              <label className="flex items-center gap-3 text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoAdjust}
                  onChange={(e) => setFormData({ ...formData, autoAdjust: e.target.checked })}
                  className="w-5 h-5 text-blue-500"
                />
                <span>automatically adjust time to sunrise/sunset</span>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-8 py-2 border-2 border-blue-400 text-blue-500 rounded hover:bg-blue-50 transition font-medium uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={calculateCost}
                disabled={loading}
                className="px-8 py-2 border-2 border-blue-400 text-blue-500 rounded hover:bg-blue-50 transition font-medium uppercase"
              >
                {loading ? 'Calculating...' : 'Delete'}
              </button>
              <button
                type="submit"
                className="px-8 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition font-medium uppercase"
              >
                Save
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}

export default AddScheduleModal
