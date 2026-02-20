import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
    const location = useLocation();

    const navItems = [
        { path: '/', icon: '⚡', label: 'Schedule' },
        { path: '/ask-ai', icon: '🤖', label: 'Ask AI' },
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 mb-8 shadow-sm">
            <div className="max-w-[1600px] mx-auto px-6 h-[80px] flex items-center justify-between">
                {/* Logo Section */}
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform duration-300 text-white">
                        ⚡
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-blue-500">
                            PowerSchedule
                        </span>
                        <span className="text-xs text-gray-500 font-medium tracking-wide">AI DRIVEN</span>
                    </div>
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/schedule');
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`
                                    flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                                    ${isActive
                                        ? 'bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-md scale-105'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                                    }
                                `}
                            >
                                <span className="text-lg">{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* User Profile / Actions */}
                <div className="flex items-center gap-4">


                </div>
            </div>
        </nav>
    );
}
