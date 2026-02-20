/**
 * SmartAssistantPanel - Displays RAG-powered tips and AI context
 * Focuses on Split Usage Strategy and General Explanations
 */
export default function SmartAssistantPanel({ insights }) {
    if (!insights) return null;

    const renderText = (text) => {
        if (!text) return null;
        return text.split('\n').map((line, i) => (
            <p key={i} className="mb-2 last:mb-0">
                {line.split(/\*\*(.*?)\*\*/g).map((part, index) =>
                    index % 2 === 1 ? <strong key={index} className="text-purple-700">{part}</strong> : part
                )}
            </p>
        ));
    };

    return (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-xl overflow-hidden mb-6">
            <h3 className="text-lg font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                My Smart Energy Assistant
            </h3>

            <div className="p-6 space-y-6">

                {/* 1. General Pricing Explanation */}
                {insights.pricing_explanation && (
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 relative">
                        <div className="absolute top-0 right-0 p-3 opacity-10 text-4xl transform rotate-12">💡</div>
                        <h4 className="font-bold text-purple-900 text-sm uppercase tracking-wide mb-2">Price Analysis</h4>
                        <div className="text-sm text-gray-700 leading-relaxed font-medium">
                            {renderText(insights.pricing_explanation)}
                        </div>
                    </div>
                )}

                {/* 2. Bill Forecast Explanation */}
                {insights.bill_explanation && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 relative">
                        <div className="absolute top-0 right-0 p-3 opacity-10 text-4xl transform -rotate-12">📉</div>
                        <h4 className="font-bold text-blue-900 text-sm uppercase tracking-wide mb-2">Bill Forecast</h4>
                        <div className="text-sm text-gray-700 leading-relaxed font-medium">
                            {renderText(insights.bill_explanation)}
                        </div>
                    </div>
                )}

                {/* 3. Energy Saving Tips */}
                {insights.energy_saving_tips && (
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 relative">
                        <div className="absolute top-0 right-0 p-3 opacity-10 text-4xl">🌱</div>
                        <h4 className="font-bold text-emerald-900 text-sm uppercase tracking-wide mb-2">Smart Saving Tips</h4>
                        <div className="text-sm text-gray-700 leading-relaxed font-medium">
                            {renderText(insights.energy_saving_tips)}
                        </div>
                    </div>
                )}

                {/* 4. Split Usage Recommendations (if any in detailed analysis) */}
                {/* This would be handled via ApplianceAnalysis mainly, but general tips here */}
            </div>
        </div>
    );
}
