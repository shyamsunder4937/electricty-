import { useState } from 'react'

const RoomSelector = ({ isOpen, onClose, onSelect }) => {
  const [step, setStep] = useState(1) // 1: GROUP, 2: ENTITY, 3: CUSTOM INPUT
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedEntity, setSelectedEntity] = useState('')
  const [customName, setCustomName] = useState('')

  const groups = [
    { 
      value: 'heating', 
      label: 'HEATING',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      value: 'cleaning', 
      label: 'CLEANING',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      value: 'automations', 
      label: 'AUTOMATIONS',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      value: 'add', 
      label: 'ADD',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
      )
    }
  ]

  const entities = {
    heating: [
      { value: 'bedroom_heater', label: 'BEDROOM HEATER' },
      { value: 'living_room_ac', label: 'LIVING ROOM AC' },
      { value: 'thermostat', label: 'HOUSE THERMOSTAT' },
      { value: 'water_heater', label: 'WATER HEATER' }
    ],
    cleaning: [
      { value: 'robot_vacuum', label: 'ROBOT VACUUM' },
      { value: 'washing_machine', label: 'WASHING MACHINE' },
      { value: 'dishwasher', label: 'DISHWASHER' }
    ],
    automations: [
      { value: 'morning_routine', label: 'MORNING ROUTINE' },
      { value: 'night_routine', label: 'NIGHT ROUTINE' },
      { value: 'away_mode', label: 'AWAY MODE' }
    ],
    add: []
  }

  const handleGroupSelect = (group) => {
    setSelectedGroup(group)
    if (group === 'add') {
      // For ADD, skip to custom input
      setStep(3)
    } else {
      setStep(2)
    }
  }

  const handleEntitySelect = (entity) => {
    setSelectedEntity(entity)
  }

  const handleNext = () => {
    if (step === 3 && customName) {
      // Custom ADD input
      onSelect(customName.toLowerCase())
      handleClose()
    } else if (selectedEntity) {
      // Selected from entity list
      const entityLabel = entities[selectedGroup]?.find(e => e.value === selectedEntity)?.label || selectedEntity
      onSelect(entityLabel.toLowerCase())
      handleClose()
    }
  }

  const handleClose = () => {
    setStep(1)
    setSelectedGroup('')
    setSelectedEntity('')
    setCustomName('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="mb-6">
      {/* STEP 1: GROUP Selection */}
      {step === 1 && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-4 uppercase tracking-wider">Group</label>
          <div className="flex flex-wrap gap-3 mb-6">
            {groups.map(group => (
              <button
                key={group.value}
                type="button"
                onClick={() => handleGroupSelect(group.value)}
                className="flex items-center gap-3 px-6 py-4 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-500 hover:text-white transition font-medium uppercase text-sm"
              >
                {group.icon}
                <span>{group.label}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-8 py-3 border-2 border-blue-400 text-blue-500 rounded-lg hover:bg-blue-50 transition font-medium uppercase"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: ENTITY Selection */}
      {step === 2 && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-4 uppercase tracking-wider">Entity</label>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {entities[selectedGroup]?.map(entity => (
              <button
                key={entity.value}
                type="button"
                onClick={() => handleEntitySelect(entity.value)}
                className={`flex items-center gap-3 px-6 py-4 rounded-lg transition font-medium uppercase text-sm ${
                  selectedEntity === entity.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
                <span>{entity.label}</span>
              </button>
            ))}
          </div>

          <label className="block text-xs font-medium text-gray-400 mb-4 uppercase tracking-wider">Action</label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 text-center text-gray-400">
            {selectedEntity ? 'Entity selected - click Next to continue' : 'Select an entity first'}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-8 py-3 border-2 border-blue-400 text-blue-500 rounded-lg hover:bg-blue-50 transition font-medium uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!selectedEntity}
              className="px-8 py-3 bg-gray-300 text-gray-500 rounded-lg font-medium uppercase disabled:opacity-50 disabled:cursor-not-allowed enabled:bg-blue-500 enabled:text-white enabled:hover:bg-blue-600 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CUSTOM INPUT for ADD */}
      {step === 3 && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-4 uppercase tracking-wider">Custom Item Name</label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Enter custom item name..."
            className="w-full border-2 border-blue-300 rounded-lg px-4 py-3 mb-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg"
            autoFocus
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-8 py-3 border-2 border-blue-400 text-blue-500 rounded-lg hover:bg-blue-50 transition font-medium uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!customName.trim()}
              className="px-8 py-3 bg-gray-300 text-gray-500 rounded-lg font-medium uppercase disabled:opacity-50 disabled:cursor-not-allowed enabled:bg-blue-500 enabled:text-white enabled:hover:bg-blue-600 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoomSelector
