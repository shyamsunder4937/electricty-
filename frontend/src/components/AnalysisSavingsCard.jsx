import React from 'react';

// Robust text renderer for bold markdown
const renderContent = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => (
        <p key={idx} className="mb-1 last:mb-0">
            {line.split(/(\*\*.*?\*\*)/).map((part, i) =>
                part.startsWith('**') && part.endsWith('**')
                    ? <strong key={i} className="font-bold text-emerald-900">{part.slice(2, -2)}</strong>
                    : part
            )}
        </p>
    ));
};

export default function AnalysisSavingsCard({ opportunity }) {
    if (!opportunity || !opportunity.can_save) return null;

    return (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 overflow-hidden shadow-sm">
            <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-wider px-4 py-3 flex items-center gap-2 border-b border-emerald-200/50">
                <span>💰</span> Maximizing Savings
            </h4>

            <div className="p-5">
                <div className="flex items-center justify-between mb-4 bg-white/80 p-3 rounded-lg backdrop-blur-sm shadow-sm border border-emerald-100">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-bold mb-1">Best Time</span>
                        <span className="text-xl font-bold text-emerald-800 flex items-center gap-1">
                            🕒 {opportunity.best_time}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="block text-2xl font-bold text-emerald-600">₹{parseFloat(opportunity.amount).toFixed(2)}</span>
                        <span className="text-[10px] text-emerald-700 font-medium uppercase tracking-wide">Potential Savings</span>
                    </div>
                </div>

                <div className="text-xs text-emerald-800/90 leading-relaxed bg-emerald-100/50 p-3 rounded-lg border border-emerald-100/50">
                    {renderContent(opportunity.explanation)}
                </div>
            </div>
        </div>
    );
}
