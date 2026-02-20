/**
 * FinancialProjectionCard - Shows projected costs (Daily, Monthly, Yearly)
 * Compares current vs optimized costs.
 */
export default function FinancialProjectionCard({ billSummary }) {
    if (!billSummary) return null;

    const formatCurrency = (amount) => `₹${parseFloat(amount).toFixed(2)}`;

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-200 shadow-sm relative overflow-hidden mb-6">
            <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                <span className="text-xl">💰</span>
                Financial Projection
            </h3>

            {/* Savings Badge */}
            <div className="absolute top-4 right-4 bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-xs shadow-sm flex items-center gap-1">
                Save {formatCurrency(billSummary.monthly_savings)} / Month
            </div>

            <div className="grid grid-cols-3 gap-4">
                {/* Daily */}
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col items-center">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Daily</span>
                    <span className="text-xl font-bold text-gray-900">{formatCurrency(billSummary.current_daily_cost)}</span>
                    <span className="text-xs text-green-600 font-semibold mt-1">
                        Optimize: {formatCurrency(billSummary.optimized_daily_cost)}
                    </span>
                </div>

                {/* Monthly */}
                <div className="bg-indigo-600 p-4 rounded-xl border border-indigo-500 shadow-md flex flex-col items-center text-white transform scale-105">
                    <span className="text-xs text-indigo-200 font-bold uppercase tracking-wider mb-1">Monthly</span>
                    <span className="text-2xl font-bold">{formatCurrency(billSummary.current_monthly_cost)}</span>
                    <span className="text-xs text-green-300 font-semibold mt-1 bg-white/10 px-2 py-0.5 rounded">
                        Save {formatCurrency(billSummary.monthly_savings)}
                    </span>
                </div>

                {/* Yearly */}
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col items-center">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Yearly</span>
                    <span className="text-xl font-bold text-gray-900">{formatCurrency(billSummary.current_yearly_cost)}</span>
                    <span className="text-xs text-green-600 font-semibold mt-1">
                        Optimize: {formatCurrency(billSummary.optimized_yearly_cost)}
                    </span>
                </div>
            </div>

            {/* Total Yearly Savings */}
            <div className="mt-4 text-center">
                <p className="text-xs text-indigo-800 font-medium">
                    Total Yearly Savings Potential: <span className="font-bold text-indigo-900 text-sm">{formatCurrency(billSummary.yearly_savings)}</span>
                </p>
            </div>
        </div>
    );
}
