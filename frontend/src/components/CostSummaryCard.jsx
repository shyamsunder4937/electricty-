/**
 * CostSummaryCard Component - Matches User Mockup
 * - Purple Gradient
 * - Total Cost (Large)
 * - Energy badge with icon
 */
export default function CostSummaryCard({ billSummary, totalEnergy }) {
    // Determine values
    const cost = billSummary ? billSummary.current_daily_cost : 0;
    const energy = totalEnergy || 0;

    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 to-indigo-600 p-8 text-white shadow-2xl mb-6">
            <div className="flex justify-between items-center relative z-10">

                {/* Left: Cost */}
                <div>
                    <h2 className="text-5xl font-bold tracking-tight">
                        ₹{cost.toFixed(2)}
                    </h2>
                    <p className="text-purple-200 text-sm mt-1 font-medium tracking-wide">
                        Total Estimated Cost
                    </p>
                </div>

                {/* Right: Energy Badge */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-2xl font-bold text-white leading-none">
                            {energy.toFixed(1)} <span className="text-sm font-normal text-purple-200">kWh</span>
                        </div>
                        <div className="text-[10px] text-purple-200 uppercase tracking-wider font-semibold">
                            Energy Consumption
                        </div>
                    </div>
                    <div className="text-3xl opacity-80">
                        🔋
                    </div>
                </div>
            </div>

            {/* Decorative Overlay */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>
    );
}
