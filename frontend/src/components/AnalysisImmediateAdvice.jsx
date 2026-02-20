import React from 'react';

export default function AnalysisImmediateAdvice({ advice }) {
    if (!advice || !advice.smart_alternatives || advice.smart_alternatives.length === 0) return null;

    return (
        <div className="bg-amber-50 rounded-xl border border-amber-100 overflow-hidden">
            <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wider px-4 py-3 flex items-center gap-2 border-b border-amber-200/50 bg-amber-100/30">
                <span>⚠️</span> If You Must Use Now
            </h4>
            <div className="p-4 space-y-3">
                {advice.smart_alternatives.map((alt, i) => (
                    <div key={i} className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                        <div className="flex gap-3 mb-2">
                            <div className="text-xl mt-0.5">💡</div>
                            <div>
                                <div className="font-bold text-gray-900 text-sm">{alt.recommendation}</div>
                                <div className="text-xs text-gray-600 mt-1 leading-snug">{alt.reasoning}</div>
                            </div>
                        </div>
                        {/* Benefits Grid */}
                        {alt.benefits && (
                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-dashed border-gray-100 bg-gray-50/50 p-2 rounded">
                                <div>
                                    <span className="block text-[10px] text-gray-400 uppercase font-bold">Cost Impact</span>
                                    <div className="font-bold text-gray-700 text-xs">{alt.benefits.cost}</div>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-gray-400 uppercase font-bold">Savings</span>
                                    <div className="font-bold text-emerald-600 text-xs">{alt.benefits.savings}</div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
