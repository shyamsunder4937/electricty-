import { useState, useRef, useEffect } from 'react';
import '../styles/components.css';

const AskAI = () => {
    const [messages, setMessages] = useState([
        { id: 1, sender: 'ai', text: 'Hello! I am your Energy Assistant. Ask me about your schedule, pricing trends, or how to save money on your bill.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), sender: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Simulate AI response for now (connect to backend later)
        setTimeout(() => {
            const aiMsg = {
                id: Date.now() + 1,
                sender: 'ai',
                text: 'I can help you analyze that. Based on current trends, shifting your AC usage to 2 PM could save you approximately ₹15.50 today due to lower off-peak rates.'
            };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1500);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    // Suggested queries
    const suggestions = [
        "How can I reduce my bill?",
        "When is the cheapest time to run AC?",
        "Analyze my current schedule",
        "What are the peak hours today?"
    ];

    return (
        <div className="h-[calc(100vh-140px)] flex gap-6 animate-fade-in relative">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col glass rounded-2xl overflow-hidden shadow-2xl border border-white/20 relative">

                {/* Chat Header */}
                <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 p-[2px] animate-pulse-glow">
                            <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-lg">
                                🤖
                            </div>
                        </div>
                        <div>
                            <h2 className="text-white font-bold">Energy AI Assistant</h2>
                            <p className="text-xs text-green-400 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                Online
                            </p>
                        </div>
                    </div>
                    <button className="text-gray-400 hover:text-white transition">
                        <span className="text-xl">⚙️</span>
                    </button>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-gray-900/50 to-gray-800/50">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`
                                    max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-lg backdrop-blur-sm
                                    ${msg.sender === 'user'
                                        ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-tr-none'
                                        : 'bg-white/10 text-gray-100 border border-white/10 rounded-tl-none'
                                    }
                                `}
                            >
                                <p>{msg.text}</p>
                                <span className="text-[10px] opacity-50 mt-2 block text-right">
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white/10 p-4 rounded-2xl rounded-tl-none border border-white/10 flex gap-1 items-center">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-0" />
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150" />
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-300" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white/5 border-t border-white/10 backdrop-blur-md">

                    {/* Suggestions (only show if few messages) */}
                    {messages.length < 3 && (
                        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInput(s)}
                                    className="whitespace-nowrap px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 hover:border-purple-500/50 transition-all cursor-pointer"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask about your energy usage..."
                            className="flex-1 bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                        >
                            <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Side Info Panel (Optional - Desktop only) */}
            <div className="hidden lg:flex w-80 flex-col gap-4">
                <div className="glass p-6 rounded-2xl border border-white/20">
                    <h3 className="text-white font-bold mb-4">Capabilities</h3>
                    <ul className="space-y-3">
                        {['Rebound Peak Analysis', 'Cost Prediction', 'Schedule Optimization', 'Energy Saving Tips'].map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                                <span className="text-green-400">✓</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="glass p-6 rounded-2xl border border-white/20 flex-1 bg-gradient-to-br from-purple-900/20 to-blue-900/20">
                    <h3 className="text-white font-bold mb-2">Did you know?</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                        Running your washing machine during off-peak hours (usually after 8 PM) can save up to 40% on that appliance's energy cost.
                    </p>
                    <div className="mt-4 h-32 bg-white/5 rounded-lg border border-white/5 flex items-center justify-center">
                        <span className="text-4xl">💡</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AskAI;
