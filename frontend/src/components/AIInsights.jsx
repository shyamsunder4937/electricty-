/**
 * AIInsights Component - Using Tailwind CSS
 */
export default function AIInsights({ insights }) {
    if (!insights) return null;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900">
                🤖 AI Insights
            </h3>
            <div className="text-base leading-relaxed text-gray-700 whitespace-pre-wrap">
                {insights}
            </div>
        </div>
    );
}
