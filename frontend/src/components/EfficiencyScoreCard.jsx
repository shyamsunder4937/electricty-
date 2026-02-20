/**
 * EfficiencyScoreCard Component - Matches Mockup Style
 * - Gauge/Arc Chart
 * - Blue Gradient
 * - Score Text
 */
export default function EfficiencyScoreCard({ score, potentialSavings }) {
    // Score 0-100
    const safeScore = Math.min(100, Math.max(0, score || 0));

    // SVG Arc Params
    const radius = 36;
    const stroke = 8;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * Math.PI; // Half circle (PI * r) ? No, full circle is 2*PI*r
    // Wait, for a half-circle gauge from 90deg to -90deg (180deg total).
    // Let's use a standard full circle path but only dash array for half?
    // Easier: Path 'M 10,50 A 40,40 0 0,1 90,50'. ViewBox 0 0 100 60.
    // Length approx 126 (PI * 40).
    const arcLength = Math.PI * 40;
    const strokeDashoffset = arcLength - (safeScore / 100) * arcLength;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-full relative">
            <h3 className="text-gray-900 font-bold mb-2">Efficiency Score:</h3>

            <div className="flex flex-col items-center">
                <div className="relative w-48 h-24 overflow-hidden mb-2">
                    <svg viewBox="0 0 100 55" className="w-full h-full transform translate-y-1">
                        {/* Background Track (Gray) */}
                        <path
                            d="M 10,50 A 40,40 0 0,1 90,50"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="8"
                            strokeLinecap="round"
                        />
                        {/* Defined Gradient */}
                        <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#2563eb" />
                            </linearGradient>
                        </defs>
                        {/* Progress Arc */}
                        <path
                            d="M 10,50 A 40,40 0 0,1 90,50"
                            fill="none"
                            stroke="url(#scoreGradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${arcLength} ${arcLength}`}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-1000 ease-out"
                        />
                        {/* Score Text */}
                        <text x="50" y="45" textAnchor="middle" className="text-[16px] font-bold fill-gray-900">
                            {Math.round(safeScore)}/100
                        </text>
                    </svg>
                </div>

                <div className="text-center mt-[-10px]">
                    <div className="text-sm font-medium text-emerald-600">
                        {safeScore >= 80 ? 'Excellent' : safeScore >= 50 ? 'Good' : 'Needs Optimization'}
                    </div>
                    {potentialSavings > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                            Potential Savings of ₹{potentialSavings.toFixed(2)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
