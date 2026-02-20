/**
 * ReboundPeakAlert Component - Matches Mockup Style
 * - Orange/Red Gradient
 * - Alert Icon
 * - Pulse effect
 */
export default function ReboundPeakAlert({ reboundPeak }) {
    if (!reboundPeak || !reboundPeak.detected) return null;

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 p-4 mb-6 shadow-lg shadow-orange-500/20 animate-pulse-glow">

            {/* Background Texture */}
            <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-white/10 to-transparent"></div>

            <div className="flex items-center gap-4 relative z-10">
                {/* Icon */}
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl shadow-inner border border-white/20 animate-bounce-slow">
                    ⚠️
                </div>

                {/* Text */}
                <div className="flex-1">
                    <h3 className="text-white font-bold text-lg uppercase tracking-wide drop-shadow-sm">
                        REBOUND PEAK ALERT
                    </h3>
                    <p className="text-orange-50 text-sm font-medium opacity-95">
                        {reboundPeak.message || "High Usage Detected! Shift to Off-Peak."}
                    </p>
                </div>

                {/* Pulse Visual */}
                <div className="hidden sm:block">
                    <div className="w-8 h-8 rounded-full border-4 border-white/30 animate-ping opacity-75"></div>
                </div>
            </div>
        </div>
    );
}
