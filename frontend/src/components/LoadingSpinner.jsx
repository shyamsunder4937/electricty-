/**
 * LoadingSpinner Component - Using Tailwind CSS
 */
export default function LoadingSpinner({ text = 'Loading...' }) {
    return (
        <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-4" />
            {text && (
                <p className="text-gray-600 text-base font-medium">{text}</p>
            )}
        </div>
    );
}
