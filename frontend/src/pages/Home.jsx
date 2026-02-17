import { useState } from 'react'
import ScheduleListItem from '../components/ScheduleListItem'
import SchedulerCard from '../components/SchedulerCard'

const Home = () => {
  const [schedules, setSchedules] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [isAddingNew, setIsAddingNew] = useState(false)

  const handleToggle = (id) => {
    setSchedules(schedules.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ))
  }

  const handleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const handleUpdate = (id, updatedData) => {
    setSchedules(schedules.map(s => 
      s.id === id ? { ...s, ...updatedData } : s
    ))
    setExpandedId(null) // Collapse after save
  }

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      setSchedules(schedules.filter(s => s.id !== id))
      setExpandedId(null)
    }
  }

  const handleAdd = (newSchedule) => {
    const id = Math.max(...schedules.map(s => s.id), 0) + 1
    setSchedules([...schedules, { ...newSchedule, id, enabled: true }])
    setIsAddingNew(false)
  }

  const handleCancelAdd = () => {
    setIsAddingNew(false)
  }

  const newScheduleTemplate = {
    id: 'new',
    name: '',
    type: '',
    action: '',
    schedule: 'every day',
    scheduleType: 'every day',
    selectedDays: [],
    time: '20:00',
    watt: 50,
    duration: 0.1,
    cost: 0,
    enabled: true
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-gray-800 leading-tight">Energy AI</h1>
                <p className="text-sm text-gray-500 leading-tight mt-0.5">Smart Scheduler</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-8 py-8 flex-1">
        {/* Page Title & Stats */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Appliance Scheduler</h2>
              <p className="text-gray-600">Schedule your appliances to save on electricity costs</p>
            </div>
            {schedules.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{schedules.length}</p>
                    <p className="text-xs text-gray-500">Active Schedules</p>
                  </div>
                  <div className="h-10 w-px bg-gray-200"></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      ₹{schedules.reduce((sum, s) => sum + (s.cost || 0), 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Est. Daily Cost</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Schedules List */}
        <div className="space-y-4">
          {/* Show new schedule form if adding */}
          {isAddingNew && (
            <SchedulerCard
              schedule={newScheduleTemplate}
              onUpdate={(id, data) => handleAdd(data)}
              onDelete={handleCancelAdd}
              onCancel={handleCancelAdd}
            />
          )}

          {/* Show existing schedules */}
          {schedules.map(schedule => (
            expandedId === schedule.id ? (
              <SchedulerCard
                key={schedule.id}
                schedule={schedule}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onCancel={() => setExpandedId(null)}
              />
            ) : (
              <ScheduleListItem
                key={schedule.id}
                schedule={schedule}
                onToggle={handleToggle}
                onExpand={handleExpand}
              />
            )
          ))}

          {/* Empty State */}
          {schedules.length === 0 && !isAddingNew && (
            <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-blue-100 p-4 rounded-full">
                  <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No schedules yet</h3>
                  <p className="text-gray-600 mb-4">Start saving on electricity by scheduling your appliances</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Button */}
        {!isAddingNew && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setIsAddingNew(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Schedule
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>© 2026 Smart Energy Scheduler. Powered by AI & LSTM predictions.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                System Active
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home
