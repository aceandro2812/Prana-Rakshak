import React from 'react';
import { MessageSquare, Plus, Clock, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface Session {
    id: string;
    create_time: string;
    update_time: string;
    title?: string;
}

interface SidebarProps {
    sessions: Session[];
    currentSessionId: string;
    onSelectSession: (sessionId: string) => void;
    onNewChat: () => void;
    isOpen: boolean;
    toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    sessions,
    currentSessionId,
    onSelectSession,
    onNewChat,
    isOpen,
    toggleSidebar
}) => {
    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar Container */}
            <motion.div
                className={`fixed top-0 left-0 h-full w-72 bg-black/40 backdrop-blur-xl border-r border-white/10 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } md:translate-x-0 md:static`}
            >
                <div className="flex flex-col h-full p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">
                            History
                        </h2>
                        <button
                            onClick={toggleSidebar}
                            className="md:hidden p-2 text-white/70 hover:text-white"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    </div>

                    {/* New Chat Button */}
                    <button
                        onClick={() => {
                            onNewChat();
                            if (window.innerWidth < 768) toggleSidebar();
                        }}
                        className="flex items-center gap-3 w-full p-3 mb-6 rounded-xl bg-gradient-to-r from-[var(--primary)]/20 to-[var(--secondary)]/20 border border-white/10 hover:border-white/30 transition-all group"
                    >
                        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10">
                            <Plus className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-medium text-white">New Chat</span>
                    </button>

                    {/* Session List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {sessions.map((session) => (
                            <button
                                key={session.id}
                                onClick={() => {
                                    onSelectSession(session.id);
                                    if (window.innerWidth < 768) toggleSidebar();
                                }}
                                className={`w-full p-3 rounded-xl text-left transition-all border ${currentSessionId === session.id
                                        ? 'bg-white/10 border-[var(--primary)]/50 shadow-[0_0_10px_rgba(0,242,255,0.1)]'
                                        : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <MessageSquare className={`w-4 h-4 ${currentSessionId === session.id ? 'text-[var(--primary)]' : 'text-white/50'
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${currentSessionId === session.id ? 'text-white' : 'text-white/70'
                                            }`}>
                                            {session.title || `Session ${session.id.slice(0, 8)}...`}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <Clock className="w-3 h-3 text-white/30" />
                                            <p className="text-xs text-white/30">
                                                {new Date(session.update_time || session.create_time).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default Sidebar;
