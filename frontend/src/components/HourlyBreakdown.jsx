/**
 * HourlyBreakdown Component - Using Tailwind CSS
 */
export default function HourlyBreakdown({ hourly }) {
    // Generate mock data for 24 hours if no data provided
    const mockData = Array.from({ length: 24 }, (_, i) => {
        const hour = i + 1;
        const isPeak = hour >= 17 && hour <= 21;
        const baseLoad = isPeak ? 50 : 30;
        const load = baseLoad + Math.random() * 30;
        const price = isPeak ? 7 + Math.random() * 2 : 4 + Math.random() * 2;

        return {
            hour: hour,
            load_forecast: load,
            price: price,
            is_peak: isPeak
        };
    });

    const data = hourly && hourly.length > 0 ? hourly.slice(0, 24) : mockData;
    const maxLoad = Math.max(...data.map(h => h.load_forecast));

    return (
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-6">
                Hourly Price & Usage Breakdown
            </h3>

            <div className="flex items-end gap-1 h-48 px-2">
                {data.map((item, index) => {
                    const barHeight = (item.load_forecast / maxLoad) * 140;
                    const barColor = item.is_peak ? 'bg-red-500' : 'bg-emerald-500';

                    return (
                        <div
                            key={index}
                            className="flex-1 flex flex-col items-center gap-1"
                        >
                            {/* Price label */}
                            <div className="text-[10px] text-gray-500 font-medium min-h-[14px]">
                                {item.price ? `₹${item.price.toFixed(1)}` : ''}
                            </div>

                            {/* Bar */}
                            <div
                                className={`w-full ${barColor} rounded-t transition-all min-h-[20px]`}
                                style={{ height: `${barHeight}px` }}
                            />

                            {/* Hour label */}
                            <div className="text-[10px] text-gray-400 font-medium">
                                {item.hour}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
