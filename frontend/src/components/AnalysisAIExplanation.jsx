import React from 'react';

// Robust text renderer for bold markdown and newlines
const renderContent = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => (
        <p key={idx} className="mb-2 last:mb-0">
            {line.split(/(\*\*.*?\*\*)/).map((part, i) =>
                part.startsWith('**') && part.endsWith('**')
                    ? <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>
                    : part
            )}
        </p>
    ));
};

export default function AnalysisAIExplanation({ title = "AI Analysis", icon = "🤖", content, supportingImages }) {
    if (!content) return null;

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-full">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider bg-gray-50 px-4 py-3 flex items-center gap-2 border-b border-gray-100">
                <span>{icon}</span> {title}
            </h4>
            <div className="p-4">
                <div className="text-sm text-gray-600 leading-relaxed">
                    {renderContent(content)}
                </div>

                {supportingImages && supportingImages.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500 italic">
                        <span className="font-semibold text-gray-700">📚 Sources:</span>
                        {supportingImages.length} research documents referenceed.
                    </div>
                )}
            </div>
        </div>
    );
}
