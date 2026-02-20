/**
 * Sidebar Component
 * Navigation sidebar for the application
 */
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
    const location = useLocation();

    const navItems = [
        { path: '/', icon: '🏠', label: 'Home' },
        { path: '/schedule', icon: '📅', label: 'Schedule' },
        { path: '/analytics', icon: '📊', label: 'Analytics' },
        { path: '/ask-ai', icon: '🤖', label: 'Ask AI' },
    ];

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">⚡</div>
                <h1 className="sidebar-title">AI Dynamic<br />Pricing</h1>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`sidebar-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                    >
                        <span className="sidebar-nav-icon">{item.icon}</span>
                        <span className="sidebar-nav-label">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">👤</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">User</div>
                        <div className="sidebar-user-role">Premium</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
