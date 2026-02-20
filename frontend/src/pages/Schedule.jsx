import { useState } from 'react';
import {
    Zap, Home, PlusCircle, Trash2, Cpu, TrendingDown, AlertTriangle,
    CheckCircle, Clock, DollarSign, Lightbulb, ThumbsUp, BarChart2,
    RefreshCw, Info, ChevronDown, ChevronUp, ArrowRight, Calendar,
    Battery, BatteryCharging, Thermometer, Wind, Activity, Leaf,
    ShieldAlert, Star, Target, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    LineElement, PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, ArcElement, Tooltip, Legend, Filler
);

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtHour = (h) => {
    if (h === undefined || h === null) return '--';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:00 ${ampm}`;
};
const fmtRupee = (v) => `₹${Number(v || 0).toFixed(2)}`;
const statusColor = (s) => {
    if (!s) return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-400' };
    const upper = s.toUpperCase();
    if (upper === 'PEAK') return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
    if (upper === 'MODERATE') return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
    return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
};
const getApplianceIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('ac') || n.includes('air')) return '❄️';
    if (n.includes('heat')) return '🔥';
    if (n.includes('wash')) return '🧺';
    if (n.includes('dish')) return '🍽️';
    if (n.includes('fridge') || n.includes('refrig')) return '🧊';
    if (n.includes('micro')) return '📡';
    if (n.includes('oven')) return '🍕';
    if (n.includes('light')) return '💡';
    if (n.includes('geyser') || n.includes('water')) return '🚿';
    if (n.includes('fan')) return '🌀';
    if (n.includes('tv') || n.includes('tele')) return '📺';
    return '⚡';
};
const cleanMarkdown = (s = '') => s.replace(/\*\*/g, '').replace(/[#]/g, '').trim();

// ── Sub-components ────────────────────────────────────────────────────────────

/** Collapsible section wrapper */
function Section({ title, icon: Icon, defaultOpen = true, children, accent = 'violet' }) {
    const [open, setOpen] = useState(defaultOpen);
    const accents = {
        violet: 'border-violet-400 text-violet-700',
        amber: 'border-amber-400 text-amber-700',
        emerald: 'border-emerald-400 text-emerald-700',
        red: 'border-red-400 text-red-700',
        blue: 'border-blue-400 text-blue-700',
    };
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between px-5 py-4 border-l-4 ${accents[accent]} bg-white hover:bg-gray-50 transition`}
            >
                <div className="flex items-center gap-2 font-bold text-gray-800">
                    {Icon && <Icon size={18} className={accents[accent].split(' ')[1]} />}
                    {title}
                </div>
                {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {open && <div className="px-5 pb-5 pt-3">{children}</div>}
        </div>
    );
}

/** Tag pill */
function StatusBadge({ status }) {
    const c = statusColor(status);
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.bg} ${c.text} border ${c.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {status}
        </span>
    );
}

/** Quick info row */
function InfoRow({ label, value, accent }) {
    return (
        <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-500 font-medium">{label}</span>
            <span className={`text-sm font-bold ${accent || 'text-gray-800'}`}>{value}</span>
        </div>
    );
}

/** Cost comparison block */
function CostCompare({ current, best, savings }) {
    const savingPct = current > 0 ? ((savings / current) * 100).toFixed(0) : 0;
    return (
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            <div className="flex-1 text-center">
                <div className="text-xs text-gray-500 mb-1">Current Cost</div>
                <div className="text-lg font-black text-red-600">{fmtRupee(current)}</div>
            </div>
            <div className="flex flex-col items-center gap-1">
                <ArrowRight size={18} className="text-gray-300" />
                {savings > 0 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                        Save {savingPct}%
                    </span>
                )}
            </div>
            <div className="flex-1 text-center">
                <div className="text-xs text-gray-500 mb-1">Best Cost</div>
                <div className="text-lg font-black text-emerald-600">{fmtRupee(best)}</div>
            </div>
        </div>
    );
}

/** 24-hour bar chart for a single appliance */
function HourlyPriceChart({ currentHour, bestHour }) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const isPeakHour = (h) => (h >= 17 && h <= 21) || (h >= 7 && h <= 9);
    const isModerate = (h) => (h >= 10 && h <= 16) || h === 22;
    const getPrice = (h) => isPeakHour(h) ? 7.5 : isModerate(h) ? 5.5 : 3.5;

    const bgColors = hours.map(h => {
        if (h === currentHour) return 'rgba(239,68,68,0.8)';
        if (h === bestHour) return 'rgba(16,185,129,0.8)';
        if (isPeakHour(h)) return 'rgba(239,68,68,0.25)';
        if (isModerate(h)) return 'rgba(245,158,11,0.25)';
        return 'rgba(16,185,129,0.25)';
    });

    const data = {
        labels: hours.map(h => fmtHour(h)),
        datasets: [{
            label: 'Price (₹/kWh)',
            data: hours.map(getPrice),
            backgroundColor: bgColors,
            borderRadius: 4,
        }]
    };
    const opts = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => `₹${ctx.raw}/kWh`,
                    afterLabel: (ctx) => {
                        if (ctx.dataIndex === currentHour) return '← Your scheduled time';
                        if (ctx.dataIndex === bestHour) return '← Best time 🎯';
                        return '';
                    }
                }
            }
        },
        scales: {
            y: { ticks: { callback: v => `₹${v}` }, grid: { color: '#f3f4f6' } },
            x: { ticks: { maxRotation: 45, font: { size: 9 } }, grid: { display: false } }
        }
    };
    return (
        <div>
            <div className="flex items-center gap-3 mb-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Your Time</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Best Time</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> Peak Zone</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 inline-block" /> Moderate Zone</span>
            </div>
            <Bar data={data} options={opts} />
        </div>
    );
}

/** Donut chart for cost distribution */
function CostDistributionChart({ appliances }) {
    const labels = appliances.map(a => a.appliance_name);
    const values = appliances.map(a => +(a.scheduled_time?.total_cost || 0).toFixed(2));
    const colors = ['#7c3aed', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#c026d3'];

    const data = {
        labels,
        datasets: [{
            data: values,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 2,
            borderColor: '#fff'
        }]
    };
    const opts = {
        responsive: true,
        plugins: {
            legend: { position: 'bottom', labels: { font: { size: 11 } } },
            tooltip: { callbacks: { label: ctx => `${ctx.label}: ₹${ctx.raw}` } }
        },
        cutout: '65%'
    };
    return <Doughnut data={data} options={opts} />;
}

/** Monthly projection chart */
function MonthlyProjectionChart({ current, optimized }) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const factor = [1, 0.95, 1.05, 1.1, 1.15, 1.2, 1.25, 1.1, 1.0, 0.95, 1.0, 1.1];
    const data = {
        labels: months,
        datasets: [
            {
                label: 'Current Schedule (₹)',
                data: months.map((_, i) => +(current * factor[i]).toFixed(2)),
                backgroundColor: 'rgba(239,68,68,0.15)',
                borderColor: '#ef4444',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#ef4444',
                pointRadius: 4,
            },
            {
                label: 'Optimized Schedule (₹)',
                data: months.map((_, i) => +(optimized * factor[i]).toFixed(2)),
                backgroundColor: 'rgba(16,185,129,0.15)',
                borderColor: '#10b981',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#10b981',
                pointRadius: 4,
            }
        ]
    };
    const opts = {
        responsive: true,
        plugins: {
            legend: { position: 'bottom' },
            tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ₹${ctx.raw}` } }
        },
        scales: {
            y: { ticks: { callback: v => `₹${v}` }, grid: { color: '#f3f4f6' } },
            x: { grid: { display: false } }
        }
    };
    return <Line data={data} options={opts} />;
}

/** Single appliance full analysis card */
function ApplianceCard({ app, index }) {
    const [expanded, setExpanded] = useState(false);
    const sc = statusColor(app.scheduled_time?.status);
    const savings = app.cost_summary?.potential_savings || 0;
    const isRebound = app.scheduled_time?.is_rebound_peak;
    const detail = app.detailed_analysis;
    const reboundData = detail?.rebound_peak_analysis;
    const comfortSuggestions = app.comfort_suggestions || [];
    const alternatives = app.comfort_friendly_alternatives || [];
    const bestRec = app.best_time_recommendation;
    const ifYouMust = detail?.if_you_must_use_now;

    return (
        <div className={`rounded-2xl border-2 shadow-md overflow-hidden transition-all ${isRebound ? 'border-orange-300' : sc.border}`}>
            {/* Header */}
            <div className={`${sc.bg} px-5 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">
                        {getApplianceIcon(app.appliance_name)}
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 text-lg leading-tight">{app.appliance_name}</h3>
                        <div className="text-xs text-gray-600 font-medium">
                            {app.wattage}W • {app.duration_hours}h • {app.energy_consumption_kwh?.toFixed(2)} kWh
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={app.scheduled_time?.status} />
                    {isRebound && (
                        <span className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <RefreshCw size={10} /> Rebound Peak
                        </span>
                    )}
                </div>
            </div>

            {/* Core Numbers */}
            <div className="bg-white px-5 py-4 grid grid-cols-3 gap-3 border-b border-gray-100">
                <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Scheduled</div>
                    <div className="text-base font-black text-gray-900">{fmtHour(app.scheduled_time?.hour)}</div>
                    <div className="text-xs text-red-600 font-semibold">{fmtRupee(app.scheduled_time?.total_cost)}</div>
                </div>
                <div className="text-center border-x border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">Best Time</div>
                    <div className="text-base font-black text-emerald-700">{fmtHour(bestRec?.hour)}</div>
                    <div className="text-xs text-emerald-600 font-semibold">{fmtRupee(bestRec?.total_cost)}</div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">You Save</div>
                    <div className="text-base font-black text-violet-700">{fmtRupee(savings)}</div>
                    <div className="text-xs text-violet-500 font-semibold">
                        {app.cost_summary?.savings_percentage?.toFixed(0)}% off
                    </div>
                </div>
            </div>

            {/* Cost comparison bar */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <CostCompare
                    current={app.scheduled_time?.total_cost}
                    best={bestRec?.total_cost}
                    savings={savings}
                />
            </div>

            {/* Simple Summary */}
            {detail?.simple_summary && (
                <div className="px-5 py-3 bg-white border-b border-gray-100">
                    {detail.simple_summary.split('\n').map((line, i) => (
                        line.trim() && (
                            <p key={i} className="text-xs text-gray-700 mb-1 leading-relaxed">
                                {cleanMarkdown(line)}
                            </p>
                        )
                    ))}
                </div>
            )}

            {/* Expand toggle */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 transition"
            >
                {expanded ? (
                    <><ChevronUp size={14} /> Hide Detailed Analysis</>
                ) : (
                    <><ChevronDown size={14} /> Show Full Analysis, Tips & Rebound Info</>
                )}
            </button>

            {/* Expanded Detail */}
            {expanded && (
                <div className="bg-white divide-y divide-gray-50">

                    {/* 24-Hour Price Chart */}
                    <div className="px-5 py-4">
                        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <BarChart2 size={15} className="text-violet-600" /> 24-Hour Price Map
                        </h4>
                        <HourlyPriceChart
                            currentHour={app.scheduled_time?.hour}
                            bestHour={bestRec?.hour}
                        />
                    </div>

                    {/* Rebound Peak Analysis */}
                    {reboundData && reboundData.is_rebound_peak && (
                        <div className="px-5 py-4">
                            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                                <h4 className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
                                    <ShieldAlert size={15} /> Rebound Peak Analysis
                                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${reboundData.severity === 'HIGH' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}`}>
                                        {reboundData.severity}
                                    </span>
                                </h4>
                                <p className="text-xs text-gray-700 leading-relaxed mb-3">{reboundData.what_is_rebound_peak}</p>
                                <p className="text-xs text-orange-800 font-semibold mb-3">{reboundData.why_this_causes_rebound}</p>

                                {/* Load Pattern Visual */}
                                {reboundData.load_pattern && (
                                    <div className="flex items-center gap-2 bg-white rounded-lg p-3 mb-3 border border-orange-100 text-xs text-center">
                                        <div className="flex-1">
                                            <div className="text-gray-400 text-[10px]">Hour Before</div>
                                            <div className="font-bold text-emerald-700 mt-1">{reboundData.load_pattern.hour_before}</div>
                                        </div>
                                        <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />
                                        <div className="flex-1 bg-red-50 rounded-lg p-2 border border-red-200">
                                            <div className="text-red-500 text-[10px] font-bold">⚡ NOW</div>
                                            <div className="font-black text-red-700 mt-1">{reboundData.load_pattern.current_hour}</div>
                                        </div>
                                        <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />
                                        <div className="flex-1">
                                            <div className="text-gray-400 text-[10px]">Hour After</div>
                                            <div className="font-bold text-gray-700 mt-1">{reboundData.load_pattern.hour_after}</div>
                                        </div>
                                    </div>
                                )}

                                {/* How to Avoid */}
                                {reboundData.how_to_avoid && (
                                    <div>
                                        <div className="text-[10px] font-bold text-orange-700 uppercase mb-2">How to Avoid Rebound Peak</div>
                                        <ul className="space-y-1">
                                            {reboundData.how_to_avoid.map((tip, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                                    <span className="text-orange-500 font-bold mt-0.5">→</span> {tip}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* RAG Explanation for Rebound */}
                                {reboundData.detailed_explanation && (
                                    <div className="mt-3 bg-orange-100/50 rounded-lg p-3">
                                        <div className="text-[10px] font-bold text-orange-700 uppercase mb-1 flex items-center gap-1">
                                            <Info size={10} /> AI Explanation
                                        </div>
                                        <p className="text-xs text-gray-700 leading-relaxed">
                                            {cleanMarkdown(reboundData.detailed_explanation).slice(0, 400)}...
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Current Time Analysis */}
                    {detail?.current_time_analysis && (
                        <div className="px-5 py-4">
                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <Clock size={15} className="text-blue-600" /> Current Time Analysis
                            </h4>
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <InfoRow label="Status" value={detail.current_time_analysis.status} accent={`font-bold ${sc.text}`} />
                                    <InfoRow label="Price" value={detail.current_time_analysis.cost_per_hour} />
                                    <InfoRow label="Total Cost" value={detail.current_time_analysis.total_cost} accent="text-red-600 font-bold" />
                                </div>
                                {detail.current_time_analysis.explanation && (
                                    <p className="text-xs text-gray-700 leading-relaxed mt-2">
                                        {cleanMarkdown(String(detail.current_time_analysis.explanation)).slice(0, 350)}...
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Savings Opportunity */}
                    {detail?.savings_opportunity && detail.savings_opportunity.can_save && (
                        <div className="px-5 py-4">
                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <TrendingDown size={15} className="text-emerald-600" /> Savings Opportunity
                            </h4>
                            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="text-xs text-gray-500">Switch to</div>
                                        <div className="text-xl font-black text-emerald-700">{detail.savings_opportunity.best_time}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500">You save</div>
                                        <div className="text-xl font-black text-emerald-600">{detail.savings_opportunity.amount}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500">New cost</div>
                                        <div className="text-xl font-black text-gray-800">{detail.savings_opportunity.best_time_cost}</div>
                                    </div>
                                </div>
                                {detail.savings_opportunity.explanation && (
                                    <p className="text-xs text-gray-700 leading-relaxed">
                                        {cleanMarkdown(String(detail.savings_opportunity.explanation)).slice(0, 300)}...
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Comfort-Friendly Alternatives */}
                    {alternatives.length > 0 && (
                        <div className="px-5 py-4">
                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <Star size={15} className="text-violet-600" /> Nearby Comfort-Friendly Times
                            </h4>
                            <div className="space-y-2">
                                {alternatives.map((alt, i) => {
                                    const ac = statusColor(alt.load_category);
                                    return (
                                        <div key={i} className={`flex items-center justify-between rounded-lg p-3 border ${ac.border} ${ac.bg}`}>
                                            <div className="flex items-center gap-2">
                                                <Clock size={13} className={ac.text} />
                                                <span className="text-sm font-bold text-gray-800">{fmtHour(alt.hour)}</span>
                                                <StatusBadge status={alt.load_category?.toUpperCase()} />
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-500">₹{alt.price_per_kwh?.toFixed(2)}/kWh</div>
                                                <div className="text-sm font-bold text-gray-800">{fmtRupee(alt.total_cost)}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Comfort Suggestions */}
                    {comfortSuggestions.length > 0 && (
                        <div className="px-5 py-4">
                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <Leaf size={15} className="text-green-600" /> Comfort Suggestions
                            </h4>
                            <div className="space-y-3">
                                {comfortSuggestions.map((s, i) => (
                                    <div key={i} className="bg-green-50 rounded-xl p-3 border border-green-100">
                                        <div className="flex items-start gap-2">
                                            <Lightbulb size={13} className="text-green-600 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                                <div className="text-xs font-bold text-green-800 mb-0.5">{s.suggestion}</div>
                                                <div className="text-[11px] text-gray-600">{s.reason}</div>
                                                {s.potential_savings && (
                                                    <div className="text-[11px] font-bold text-emerald-700 mt-1">
                                                        💰 Save: {s.potential_savings}
                                                    </div>
                                                )}
                                                <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.comfort_impact === 'none' ? 'bg-emerald-100 text-emerald-700' :
                                                    s.comfort_impact === 'minimal' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    Comfort impact: {s.comfort_impact}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* RAG Energy Saving Tips */}
                    {detail?.user_comfort_recommendations?.rag_generated_tips && (
                        <div className="px-5 py-4">
                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <Cpu size={15} className="text-violet-600" /> AI Energy Saving Tips
                            </h4>
                            <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                                    {cleanMarkdown(String(detail.user_comfort_recommendations.rag_generated_tips)).slice(0, 500)}
                                    {String(detail.user_comfort_recommendations.rag_generated_tips).length > 500 ? '...' : ''}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* If You Must Use Now */}
                    {ifYouMust && ifYouMust.smart_alternatives?.length > 0 && (
                        <div className="px-5 py-4">
                            <h4 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                                <Target size={15} className="text-amber-600" /> {ifYouMust.scenario}
                            </h4>
                            <div className="space-y-3 mt-3">
                                {ifYouMust.smart_alternatives.map((alt, i) => (
                                    <div key={i} className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Activity size={13} className="text-amber-600" />
                                            <span className="text-xs font-bold text-amber-800">{alt.option}</span>
                                        </div>
                                        <p className="text-xs text-gray-700 mb-2">{alt.recommendation}</p>

                                        {/* Cost breakdown if split strategy */}
                                        {alt.cost_breakdown && (
                                            <div className="bg-white rounded-lg p-2 border border-amber-100 space-y-1 mb-2">
                                                {Object.entries(alt.cost_breakdown).map(([k, v]) => (
                                                    <InfoRow key={k} label={k.replace(/_/g, ' ')} value={v} />
                                                ))}
                                            </div>
                                        )}

                                        {/* Benefits */}
                                        {alt.benefits && (
                                            <div className="grid grid-cols-2 gap-1 mb-2">
                                                {Object.entries(alt.benefits).map(([k, v]) => (
                                                    <div key={k} className="flex items-start gap-1 text-[10px]">
                                                        <CheckCircle size={10} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                                        <span className="text-gray-600"><b>{k.replace(/_/g, ' ')}:</b> {v}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {alt.comfort_impact && (
                                            <div className="text-[11px] text-blue-700 font-semibold">
                                                🎯 Comfort: {alt.comfort_impact}
                                            </div>
                                        )}

                                        {alt.reasoning && (
                                            <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                                                {cleanMarkdown(String(alt.reasoning)).slice(0, 250)}
                                                {String(alt.reasoning).length > 250 ? '...' : ''}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main Schedule Page ────────────────────────────────────────────────────────
const Schedule = () => {
    const [roomName, setRoomName] = useState('Living Room');
    const [appliances, setAppliances] = useState([]);
    const [currentAppliance, setCurrentAppliance] = useState({
        name: '', wattage: '', start_time: '', duration_hours: ''
    });
    const [scheduleResult, setScheduleResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const commonAppliances = [
        { icon: '❄️', name: 'AC', wattage: 2000 },
        { icon: '🔥', name: 'Heater', wattage: 1500 },
        { icon: '🧺', name: 'Washing Machine', wattage: 1000 },
        { icon: '🍽️', name: 'Dishwasher', wattage: 1200 },
        { icon: '🧊', name: 'Refrigerator', wattage: 300 },
        { icon: '📡', name: 'Microwave', wattage: 1000 },
        { icon: '🍕', name: 'Oven', wattage: 2000 },
        { icon: '🚿', name: 'Geyser', wattage: 2000 },
    ];

    const handleSelectAppliance = (app) => {
        setCurrentAppliance(prev => ({ ...prev, name: app.name, wattage: app.wattage.toString() }));
    };

    const handleAddAppliance = () => {
        const { name, wattage, start_time, duration_hours } = currentAppliance;
        if (name && wattage && start_time !== '' && duration_hours) {
            setAppliances(prev => [...prev, { ...currentAppliance, id: Date.now() }]);
            setCurrentAppliance({ name: '', wattage: '', start_time: '', duration_hours: '' });
        }
    };

    const handleRemoveAppliance = (id) => {
        setAppliances(prev => prev.filter(a => a.id !== id));
    };

    const handleGenerateSchedule = async () => {
        if (appliances.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('http://localhost:5000/api/scheduling/schedule_appliances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_name: roomName,
                    appliances: appliances.map(({ id, ...a }) => ({
                        ...a,
                        wattage: parseInt(a.wattage),
                        start_time: parseInt(a.start_time),
                        duration_hours: parseFloat(a.duration_hours)
                    })),
                    include_explanations: true,
                    show_detailed_hours: true
                })
            });
            const data = await res.json();
            if (data.status === 'error') throw new Error(data.message);
            setScheduleResult(data);
        } catch (e) {
            setError(e.message || 'Failed to fetch schedule');
        } finally {
            setLoading(false);
        }
    };

    const summary = scheduleResult?.summary;
    const bill = summary?.room_electricity_bill;
    const applianceResults = scheduleResult?.appliances || [];

    return (
        <div className="min-h-screen bg-[#f5f7ff] text-gray-900 font-sans">
            {/* Top Banner */}
            <div className="  text-black px-6 py-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                            <Zap size={28} className="text-yellow-300" /> Smart Energy Planner
                        </h1>
                        <p className="text-blackmt-1 text-sm font-medium">
                            AI-powered scheduling • Rebound peak detection • Comfort-first savings
                        </p>
                    </div>
                    {summary && (
                        <div className="hidden md:flex items-center gap-6">
                            <div className="text-center">
                                <div className="text-2xl font-black">{fmtRupee(bill?.current_daily_cost)}</div>
                                <div className="text-black text-xs">Daily Cost</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-black text-yellow-300">{fmtRupee(bill?.monthly_savings)}</div>
                                <div className="text-black text-xs">Monthly Savings</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ── LEFT PANEL ─────────────────────────────────────────── */}
                <div className="lg:col-span-4 space-y-4">

                    {/* Room Name */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-3 text-gray-700 font-bold">
                            <Home size={16} className="text-violet-600" /> Room Name
                        </div>
                        <input
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                            placeholder="e.g. Living Room"
                        />
                    </div>

                    {/* Add Appliance */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4 text-gray-700 font-bold">
                            <PlusCircle size={16} className="text-blue-600" /> Add Appliance
                        </div>

                        {/* Quick Select */}
                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Quick Select</label>
                            <div className="grid grid-cols-4 gap-2">
                                {commonAppliances.map(app => (
                                    <button
                                        key={app.name}
                                        onClick={() => handleSelectAppliance(app)}
                                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all ${currentAppliance.name === app.name
                                            ? 'bg-violet-100 border-violet-400 text-violet-700 shadow'
                                            : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                                            }`}
                                    >
                                        <span className="text-lg mb-0.5">{app.icon}</span>
                                        <span className="text-[10px] truncate w-full text-center">{app.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Appliance Name</label>
                                <input
                                    type="text"
                                    value={currentAppliance.name}
                                    onChange={e => setCurrentAppliance(p => ({ ...p, name: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                                    placeholder="e.g. AC, Heater"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Wattage (W)</label>
                                    <input
                                        type="number"
                                        value={currentAppliance.wattage}
                                        onChange={e => setCurrentAppliance(p => ({ ...p, wattage: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                                        placeholder="2000"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Duration (h)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={currentAppliance.duration_hours}
                                        onChange={e => setCurrentAppliance(p => ({ ...p, duration_hours: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                                        placeholder="2"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Start Time (0–23 hr)</label>
                                <input
                                    type="number"
                                    min="0" max="23"
                                    value={currentAppliance.start_time}
                                    onChange={e => setCurrentAppliance(p => ({ ...p, start_time: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                                    placeholder="14 → 2 PM"
                                />
                            </div>
                            <button
                                onClick={handleAddAppliance}
                                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition"
                            >
                                <PlusCircle size={16} /> Add to List
                            </button>
                        </div>
                    </div>

                    {/* Appliance Queue */}
                    {appliances.length > 0 && (
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-bold text-gray-700 flex items-center gap-2">
                                    <Calendar size={15} className="text-indigo-600" /> Scheduled Appliances
                                </span>
                                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {appliances.length} items
                                </span>
                            </div>
                            <div className="space-y-2 max-h-72 overflow-y-auto">
                                {appliances.map(app => (
                                    <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-violet-200 transition">
                                        <div>
                                            <div className="font-bold text-sm text-gray-800">{getApplianceIcon(app.name)} {app.name}</div>
                                            <div className="text-[11px] text-gray-500">{fmtHour(parseInt(app.start_time))} • {app.duration_hours}h • {app.wattage}W</div>
                                        </div>
                                        <button onClick={() => handleRemoveAppliance(app.id)} className="text-gray-300 hover:text-red-500 transition">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleGenerateSchedule}
                                disabled={loading}
                                className="w-full mt-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 transition"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <RefreshCw size={16} className="animate-spin" /> Analyzing...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2"><Cpu size={16} /> Optimize Schedule</span>
                                )}
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                            <AlertTriangle size={14} className="inline mr-1" /> {error}
                        </div>
                    )}
                </div>

                {/* ── RIGHT PANEL ────────────────────────────────────────── */}
                <div className="lg:col-span-8 space-y-5">
                    {scheduleResult ? (
                        <>
                            {/* ── 1. Summary Hero ── */}
                            <div className="bg-gradient-to-r from-violet-700 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <div className="text-sm text-indigo-200 font-medium mb-1">🏠 {summary?.room_name}</div>
                                        <div className="text-5xl font-black">{fmtRupee(bill?.current_daily_cost)}</div>
                                        <div className="text-indigo-200 text-sm mt-1">Total Estimated Daily Cost</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                                            <BatteryCharging size={18} className="mx-auto mb-1 text-yellow-300" />
                                            <div className="text-xl font-black">{summary?.total_energy_consumption_kwh?.toFixed(2)}</div>
                                            <div className="text-[10px] text-indigo-200 uppercase">kWh consumed</div>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                                            <TrendingDown size={18} className="mx-auto mb-1 text-emerald-300" />
                                            <div className="text-xl font-black text-emerald-300">{fmtRupee(bill?.monthly_savings)}</div>
                                            <div className="text-[10px] text-indigo-200 uppercase">Monthly savings</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── 2. Bill Projections (4 cards) ── */}
                            {bill && (
                                <Section title="💸 Electricity Bill Projections" icon={DollarSign} accent="violet">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Daily (Current)', val: bill.current_daily_cost, sub: 'Scheduled times', color: 'text-red-600', bg: 'bg-red-50' },
                                            { label: 'Monthly (Current)', val: bill.current_monthly_cost, sub: '30 days', color: 'text-red-600', bg: 'bg-red-50' },
                                            { label: 'Daily (Optimized)', val: bill.optimized_daily_cost, sub: 'Best times', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                            { label: 'Monthly (Optimized)', val: bill.optimized_monthly_cost, sub: '30 days', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                        ].map((c, i) => (
                                            <div key={i} className={`${c.bg} rounded-xl p-4 text-center border border-gray-100`}>
                                                <div className={`text-2xl font-black ${c.color}`}>{fmtRupee(c.val)}</div>
                                                <div className="text-xs font-bold text-gray-700 mt-1">{c.label}</div>
                                                <div className="text-[10px] text-gray-400">{c.sub}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Yearly Savings highlight */}
                                    <div className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-bold opacity-90">🎉 Annual Savings Potential</div>
                                            <div className="text-xs opacity-75 mt-0.5">By switching to optimized schedule</div>
                                        </div>
                                        <div className="text-3xl font-black">{fmtRupee(bill.yearly_savings)}</div>
                                    </div>

                                    {/* Monthly Projection Chart */}
                                    <div className="mt-5">
                                        <div className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                                            <BarChart2 size={14} /> 12-Month Cost Projection
                                        </div>
                                        <MonthlyProjectionChart
                                            current={bill.current_monthly_cost}
                                            optimized={bill.optimized_monthly_cost}
                                        />
                                    </div>
                                </Section>
                            )}

                            {/* ── 3. Smart Recommendations ── */}
                            {summary?.smart_recommendations?.length > 0 && (
                                <Section title="🍃 Smart Recommendations" icon={Leaf} accent="emerald">
                                    <div className="space-y-2">
                                        {summary.smart_recommendations.map((rec, i) => (
                                            <div key={i} className="flex items-start gap-3 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                                                <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                                <p className="text-sm text-gray-800 leading-relaxed">
                                                    {cleanMarkdown(rec)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            {/* ── 4. Cost Distribution Chart ── */}
                            {applianceResults.length > 1 && (
                                <Section title="📊 Cost Distribution by Appliance" icon={Activity} accent="blue">
                                    <div className="max-w-xs mx-auto">
                                        <CostDistributionChart appliances={applianceResults} />
                                    </div>
                                </Section>
                            )}

                            {/* ── 5. Per-Appliance Cards ── */}
                            <div>
                                <h2 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">
                                    <Zap size={18} className="text-violet-600" /> Appliance-by-Appliance Analysis
                                </h2>
                                <div className="space-y-5">
                                    {applianceResults.map((app, i) => (
                                        <ApplianceCard key={i} app={app} index={i} />
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Empty State */
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                            <div className="w-28 h-28 bg-gray-50 rounded-full flex items-center justify-center shadow-inner mb-6">
                                <Zap size={48} className="text-violet-300" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 mb-3">Ready to Optimize</h2>
                            <p className="text-gray-400 max-w-md leading-relaxed text-sm">
                                Add appliances on the left panel, then click <b>"Optimize Schedule"</b> to see full AI analysis —
                                cost breakdown, rebound peak detection, comfort tips, savings opportunities, and monthly projections.
                            </p>
                            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                                {[
                                    { icon: <BarChart2 size={20} className="text-violet-500" />, label: 'Cost Charts' },
                                    { icon: <ShieldAlert size={20} className="text-orange-500" />, label: 'Rebound Peak' },
                                    { icon: <Leaf size={20} className="text-emerald-500" />, label: 'Comfort Tips' },
                                ].map((f, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1 bg-gray-50 rounded-xl p-3">
                                        {f.icon}
                                        <span className="text-xs text-gray-500 font-medium">{f.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Schedule;
