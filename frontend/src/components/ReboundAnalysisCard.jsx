/**
 * ReboundAnalysisCard - Detailed analysis of Rebound Peaks
 * Shows the load pattern (Before -> Current -> After)
 */
export default function ReboundAnalysisCard({ reboundData }) {
    if (!reboundData) return null;

    return (
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200 shadow-lg mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">📉</div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-orange-100 p-2 rounded-lg text-2xl">⚠️</div>
                    <div>
                        <h3 className="text-lg font-bold text-orange-900">Rebound Peak Detected</h3>
                        <div className="text-xs font-semibold text-orange-700 uppercase tracking-widest">
                            Severity: {reboundData.severity || 'MODERATE'}
                        </div>
                    </div>
                </div>

                <p className="text-sm text-gray-800 mb-4 font-medium leading-relaxed">
                    {reboundData.why_this_causes_rebound}
                </p>

                {/* Load Pattern Visualization */}
                {reboundData.load_pattern && (
                    <div className="bg-white/60 p-4 rounded-xl border border-orange-100 mb-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 text-center">Load Transition Pattern</h4>
                        <div className="flex items-center justify-between text-xs text-center relative">
                            {/* Connectors */}
                            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10 transform -translate-y-1/2"></div>

                            {/* Before */}
                            <div className="bg-white p-2 rounded shadow-sm z-10">
                                <span className="block text-gray-400 mb-1">Before</span>
                                <span className={`font-bold px-2 py-0.5 rounded ${reboundData.load_pattern.hour_before.includes('off-peak') ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                                    {reboundData.load_pattern.hour_before.split('-')[1].trim()}
                                </span>
                            </div>

                            {/* Current (The Peak) */}
                            <div className="bg-red-50 p-2 rounded shadow-md border border-red-100 z-10 transform scale-110">
                                <span className="block text-red-500 font-bold mb-1">Now</span>
                                <span className="font-bold bg-red-600 text-white px-3 py-1 rounded shadow-sm">
                                    {reboundData.load_pattern.current_hour.split('-')[1].trim()}
                                </span>
                            </div>

                            {/* After */}
                            <div className="bg-white p-2 rounded shadow-sm z-10">
                                <span className="block text-gray-400 mb-1">After</span>
                                <span className={`font-bold px-2 py-0.5 rounded ${reboundData.load_pattern.hour_after.includes('off-peak') ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                                    {reboundData.load_pattern.hour_after.split('-')[1].trim()}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* How to Avoid */}
                {reboundData.how_to_avoid && (
                    <div>
                        <h4 className="text-xs font-bold text-orange-800 uppercase mb-2">How to Avoid</h4>
                        <ul className="space-y-1">
                            {reboundData.how_to_avoid.map((tip, i) => (
                                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                    <span className="text-orange-500 mt-0.5">•</span>
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
