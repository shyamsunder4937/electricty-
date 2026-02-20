import React from 'react';

// Format hour helper
const formatHour = (h) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:00 ${ampm}`;
};

export default function AnalysisComfortAlternatives({ alternatives }) {
    if (!alternatives || alternatives.length === 0) return null;

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider bg-gray-50 px-4 py-3 flex items-center gap-2 border-b border-gray-100">
                <span>📊</span> Comfort-Friendly Alternatives
            </h4>
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                        <tr>
                            <th className="px-4 py-2">Time</th>
                            <th className="px-4 py-2">Cost</th>
                            <th className="px-4 py-2">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {alternatives.map((alt, idx) => (
                            <tr key={idx} className="hover:bg-purple-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-700">
                                    {formatHour(alt.hour)}
                                    {alt.time_difference !== 0 && (
                                        <span className="text-gray-400 ml-1">
                                            ({alt.time_difference > 0 ? '+' : ''}{alt.time_difference}h)
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 font-bold text-gray-900">
                                    ₹{alt.total_cost.toFixed(2)}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${alt.load_category === 'off-peak' ? 'bg-emerald-100 text-emerald-700' :
                                            alt.load_category === 'peak' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                        }`}>
                                        {alt.load_category}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
