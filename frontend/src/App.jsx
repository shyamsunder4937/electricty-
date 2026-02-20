import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Schedule from './pages/Schedule';
import AskAI from './pages/AskAI';
import './index.css';

function App() {
  return (
    <Router>
      {/* Updated to use CSS variable for consistent premium background */}
      <div className="min-h-screen bg-[var(--bg-gradient-page)] text-gray-900 font-sans selection:bg-purple-200 selection:text-purple-900">
        <Navbar />

        {/* Main Content Area with Fade In Animation */}
        <main className="animate-fade-in px-4 pb-12 w-full max-w-[1600px] mx-auto">
          <Routes>
            <Route path="/" element={<Schedule />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/ask-ai" element={<AskAI />} />
          </Routes>
        </main>

        {/* Optional decorative background elements */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-50 overflow-hidden opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/30 rounded-full blur-[100px] animate-pulse-glow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/30 rounded-full blur-[100px] animate-pulse-glow delay-1000" />
        </div>
      </div>
    </Router>
  );
}

export default App;