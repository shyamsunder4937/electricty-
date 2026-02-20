import React, { useState } from 'react';
import AnalysisComfortAlternatives from './AnalysisComfortAlternatives';
import AnalysisAIExplanation from './AnalysisAIExplanation';
import AnalysisImmediateAdvice from './AnalysisImmediateAdvice';
import AnalysisSavingsCard from './AnalysisSavingsCard';

// Helper to format hour for the main row
const formatHour = (h) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:00 ${ampm}`;
};

export default function ApplianceAnalysis({ appliances }) {
    const [expandedIndex, setExpandedIndex] = useState(null);

    // If no appliances, return nothing
    if (!appliances || appliances.length === 0) return null;

    const toggleExpand = (index) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <div className="bg-white rounded-3xl p-6 md:p-8 mb-8 shadow-xl border border-gray-100 animate-fade-in relative z-10 font-sans">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="text-3xl bg-purple-100 rounded-lg p-1.5 shadow-sm">🔬</span>
                Detailed Appliance Analysis
            </h3>

            {/* Header Row (Desktop) */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-y border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider rounded-t-lg">
                <div className="col-span-3">Appliance</div>
                <div className="col-span-3">Schedule</div>
                <div className="col-span-2">Cost</div>
                <div className="col-span-3">Optimization</div>
                <div className="col-span-1 text-center">Action</div>
            </div>

            <div className="divide-y divide-gray-100">
                {appliances.map((app, index) => {
                    const isExpanded = expandedIndex === index;
                    const analysis = app.detailed_analysis;
                    const savings = app.cost_summary?.potential_savings || 0;
                    const hasSavings = savings > 0;

                    // Main schedule info
                    const startH = app.scheduled_time?.hour || 0;
                    const endH = (startH + app.duration_hours) % 24;
                    const timeRange = `${formatHour(startH)} - ${formatHour(endH)}`;

                    return (
                        <div key={index} className={`transition-all duration-300 ${isExpanded ? 'bg-purple-50/20' : 'hover:bg-gray-50'}`}>

                            {/* -- Main Summary Row -- */}
                            <div
                                className="grid grid-cols-1 md:grid-cols-12 gap-4 px-4 py-5 items-center cursor-pointer group"
                                onClick={() => toggleExpand(index)}
                            >
                                {/* Name & Specs */}
                                <div className="col-span-3 flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform group-hover:scale-105 ${isExpanded ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
                                        ⚡
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-base">{app.appliance_name}</div>
                                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                                            {app.wattage}W • {app.duration_hours}h
                                        </div>
                                    </div>
                                </div>

                                {/* Schedule Time */}
                                <div className="col-span-3">
                                    <div className="inline-flex flex-col items-start gap-1">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-gray-700 font-bold text-sm border border-gray-200">
                                            🕒 {timeRange}
                                        </div>
                                        {app.scheduled_time?.load_category && (
                                            <span className={`text-[10px] uppercase font-bold tracking-wide ml-1 ${app.scheduled_time.load_category === 'off-peak' ? 'text-emerald-600' :
                                                    app.scheduled_time.load_category === 'peak' ? 'text-red-500' : 'text-amber-500'
                                                }`}>
                                                {app.scheduled_time.load_category}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Cost */}
                                <div className="col-span-2">
                                    <div className="text-lg font-bold text-gray-900">₹{app.scheduled_time?.total_cost?.toFixed(2)}</div>
                                    <div className="text-xs text-gray-500 font-medium">
                                        ₹{app.scheduled_time?.price_per_kwh}/kWh
                                    </div>
                                </div>

                                {/* Status Badge */}
                                <div className="col-span-3 flex flex-col items-start gap-2">
                                    {hasSavings ? (
                                        <div className="flex flex-col gap-1">
                                            <div className="badge bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 shadow-sm">
                                                💰 Save ₹{savings.toFixed(2)}
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-medium pl-1">
                                                Best: ₹{app.cost_summary?.best_possible_cost?.toFixed(2)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="badge bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                            ✅ Optimized
                                        </div>
                                    )}
                                </div>

                                {/* Arrow */}
                                <div className="col-span-1 text-center">
                                    <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-purple-100 text-purple-600 rotate-180' : 'text-gray-400 group-hover:bg-gray-100'}`}>
                                        ▼
                                    </button>
                                </div>
                            </div>

                            {/* -- Expanded Details Panel -- */}
                            {isExpanded && analysis && (
                                <div className="px-4 md:px-6 pb-6 animate-fade-in-down">
                                    <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-200 shadow-inner">

                                        {/* Simple Summary Banner */}
                                        {analysis.simple_summary && (
                                            <div className="bg-white rounded-xl p-4 border-l-4 border-amber-400 mb-6 shadow-sm">
                                                <div className="text-sm text-gray-800 leading-relaxed font-medium">
                                                    {analysis.simple_summary.split('\n').map((line, i) => (
                                                        <div key={i}>{line}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                            {/* LEFT COLUMN */}
                                            <div className="space-y-6">
                                                {/* 1. AI Analysis Summary */}
                                                <AnalysisAIExplanation
                                                    title="AI Cost Analysis"
                                                    icon="🤖"
                                                    content={analysis.current_time_analysis?.explanation}
                                                    supportingImages={analysis.current_time_analysis?.supporting_images}
                                                />

                                                {/* 2. Immediate Usage Advice */}
                                                {hasSavings && (
                                                    <AnalysisImmediateAdvice advice={analysis.if_you_must_use_now} />
                                                )}
                                            </div>

                                            {/* RIGHT COLUMN */}
                                            <div className="space-y-6">
                                                {/* 3. Savings Opportunity */}
                                                {hasSavings && (
                                                    <AnalysisSavingsCard opportunity={analysis.savings_opportunity} />
                                                )}

                                                {/* 4. Comfort Alternatives */}
                                                <AnalysisComfortAlternatives alternatives={app.comfort_friendly_alternatives} />

                                                {/* 5. Usage Tips */}
                                                <AnalysisAIExplanation
                                                    title="Smart Usage Tips"
                                                    icon="💡"
                                                    content={analysis.user_comfort_recommendations?.rag_generated_tips}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-center mt-4">
                                        <button
                                            onClick={() => toggleExpand(index)}
                                            className="text-xs font-bold text-gray-400 hover:text-purple-600 transition-colors uppercase tracking-widest"
                                        >
                                            Close Details ▲
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
