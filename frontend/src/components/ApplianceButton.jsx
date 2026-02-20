/**
 * ApplianceButton Component - Using Tailwind CSS
 */
export default function ApplianceButton({ icon, name, wattage, selected, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 px-3.5 py-4 border-2 rounded-2xl bg-white cursor-pointer transition-all text-xs text-center min-h-[110px] ${selected
                    ? 'border-purple-500 bg-purple-50 shadow-md shadow-purple-200'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:shadow-sm hover:-translate-y-0.5'
                }`}
        >
            <span className="text-4xl mb-1">{icon}</span>
            <span className="font-semibold text-gray-900 text-[13px] mb-0.5">{name}</span>
            <span className="text-[11px] text-gray-600">({wattage})</span>
        </button>
    );
}
