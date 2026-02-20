/**
 * AppliancePieChart Component - Matches Mockup Style
 * - Donut Chart using Conic Gradient
 * - Legend with percentages
 */
export default function AppliancePieChart({ appliances }) {
    if (!appliances || appliances.length === 0) return null;

    // Calculate totals
    const totalCost = appliances.reduce((sum, app) => sum + (app.scheduled_time?.total_cost || 0), 0);

    // Process data for segments
    let currentAngle = 0;
    const colors = ['#8b5cf6', '#f97316', '#64748b', '#10b981', '#3b82f6']; // Purple, Orange, Gray, Emerald, Blue

    const segments = appliances.map((app, index) => {
        const cost = app.scheduled_time?.total_cost || 0;
        const percent = (cost / totalCost) * 100;
        const angle = (percent / 100) * 360;
        const color = colors[index % colors.length];

        const segment = {
            ...app,
            percent,
            startAngle: currentAngle,
            endAngle: currentAngle + angle,
            color
        };
        currentAngle += angle;
        return segment;
    });

    // Build conic gradient string
    const gradientParts = segments.map(s => `${s.color} ${s.startAngle}deg ${s.endAngle}deg`);
    const gradientString = `conic-gradient(${gradientParts.join(', ')})`;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-full">
            <h3 className="text-gray-900 font-bold mb-6">Appliance Analysis</h3>

            <div className="flex items-center gap-6">
                {/* Donut Chart */}
                <div className="relative w-32 h-32 flex-shrink-0">
                    <div
                        className="w-full h-full rounded-full"
                        style={{
                            background: gradientString,
                            mask: 'radial-gradient(transparent 55%, black 56%)',
                            WebkitMask: 'radial-gradient(transparent 55%, black 56%)'
                        }}
                    ></div>
                    {/* Center Text is tricky with varying content, leaving empty for clean donut look or putting total? */}
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-2">
                    {segments.map((seg, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ background: seg.color }}></div>
                                <span className="text-gray-600 font-medium truncate max-w-[80px]">{seg.appliance_name}</span>
                            </div>
                            <span className="font-bold text-gray-900">{Math.round(seg.percent)}%</span>
                        </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-gray-100 text-xs text-gray-400">
                        Top Consumers
                    </div>
                </div>
            </div>
        </div>
    );
}
