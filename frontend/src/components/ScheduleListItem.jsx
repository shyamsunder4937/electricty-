/**
 * ScheduleListItem Component - Using Tailwind CSS
 */
export default function ScheduleListItem({ appliance, onDelete }) {
    const getApplianceIcon = (name) => {
        const icons = {
            'AC': '❄️',
            'Heater': '🔥',
            'Washing Machine': '🧺',
            'Dishwasher': '🍽️',
            'Refrigerator': '🧊',
            'Microwave': '📡',
            'Oven': '🍳',
            'Lighting': '💡',
        };

        const matched = Object.keys(icons).find(key =>
            name.toLowerCase().includes(key.toLowerCase())
        );
        return icons[matched] || '⚡';
    };

    const energyKwh = (parseFloat(appliance.wattage) * parseFloat(appliance.duration) / 1000).toFixed(1);

    return (
        <div className="bg-white rounded-xl p-4 mb-3 border border-gray-200">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                    <span className="text-xl">{getApplianceIcon(appliance.name)}</span>
                    <div>
                        <div className="font-semibold text-gray-900 text-sm">
                            {appliance.name} (Living Room)
                        </div>
                        <div className="text-xs text-gray-600">
                            {appliance.duration} Hours, {energyKwh} kWh
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => onDelete(appliance.id)}
                    className="bg-transparent border-none cursor-pointer text-lg opacity-60 hover:opacity-100 p-1 transition-opacity"
                >
                    🗑️
                </button>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                <div className="h-full w-2/3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded" />
            </div>
        </div>
    );
}
