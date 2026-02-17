const ScheduleItem = ({ appliance, onToggle, onDelete }) => {
  const getIcon = (type) => {
    const icons = {
      light: '💡',
      vacuum: '🤖',
      curtain: '🪟',
      thermostat: '🌡️',
      washer: '🧺',
      ac: '❄️',
      heater: '🔥',
      tv: '📺',
      default: '⚡'
    }
    return icons[type] || icons.default
  }

  return (
    <div className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition">
      <div className="flex items-center gap-4 flex-1">
        <div className="text-3xl">{getIcon(appliance.type)}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{appliance.name}</h3>
          <p className="text-sm text-gray-600">{appliance.action}</p>
          <p className="text-xs text-gray-500">{appliance.schedule}</p>
          <p className="text-xs text-gray-500">at {appliance.time}</p>
          {appliance.cost && (
            <p className="text-xs text-blue-600 font-semibold mt-1">
              Est. Cost: ₹{appliance.cost.toFixed(2)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={appliance.enabled}
            onChange={() => onToggle(appliance.id)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
        </label>
        <button
          onClick={() => onDelete(appliance.id)}
          className="text-red-500 hover:text-red-700 text-xl"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default ScheduleItem
