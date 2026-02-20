/**
 * SmartRecommendations Component - Matches Mockup Style
 * - Green/Emerald Theme
 * - Leaf Icon
 * - Checkmarks and Progress Bars
 */
export default function SmartRecommendations({ recommendations }) {
    if (!recommendations || recommendations.length === 0) return null;

    // Helper to extract savings amount for visual impact bar
    const getImpactLevel = (text) => {
        if (text.includes("HIGH") || text.includes("₹50") || text.includes("₹100")) return 100;
        if (text.includes("Medium") || text.includes("₹20")) return 70;
        return 40; // Default low impact
    };

    const formatText = (text) => {
        // Remove markdown chars for cleaner look
        return text.replace(/\*\*/g, '').replace(/🎯/g, '').replace(/⚠️/g, '').trim();
    };

    return (
        <div className="bg-emerald-50/50 backdrop-blur-sm border border-emerald-100/50 rounded-2xl p-6 mb-6 shadow-sm relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

            <h3 className="text-xl font-bold text-emerald-900 mb-6 flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-xl shadow-sm text-emerald-600">
                    🍃
                </div>
                <span>Smart Recommendations</span>
            </h3>

            <div className="flex flex-col gap-4 relative z-10">
                {recommendations.map((rec, index) => {
                    const impact = getImpactLevel(rec);
                    const cleanText = formatText(rec);

                    return (
                        <div key={index} className="flex items-center gap-4 group">
                            {/* Checkmark */}
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold border border-emerald-200 shadow-sm flex-shrink-0">
                                ✓
                            </div>

                            {/* Text */}
                            <div className="flex-1">
                                <span className="text-emerald-900 font-semibold text-sm leading-tight block">
                                    {cleanText}
                                </span>
                            </div>

                            {/* Simulated Impact Bar - Matches Mockup */}
                            <div className="hidden sm:flex items-center gap-2 w-24">
                                <div className="h-2 w-full bg-emerald-200/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${impact}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
