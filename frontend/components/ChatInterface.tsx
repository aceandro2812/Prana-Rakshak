"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Loader2, MapPin, Activity, Menu, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import GlassCard from "./GlassCard";
import GlassTable, { GlassTableHead, GlassTableBody, GlassTableRow, GlassTableCell } from "./GlassTable";
import AnimatedList, { AnimatedListItem } from "./AnimatedList";
import InfoCard from "./InfoCard";
import AqiWeatherCard from "./AqiWeatherCard";
import Sidebar from "./Sidebar";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface LocationState {
    latitude: number | null;
    longitude: number | null;
    error: string | null;
}

interface Session {
    id: string;
    create_time: string;
    update_time: string;
    title?: string;
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [location, setLocation] = useState<LocationState>({ latitude: null, longitude: null, error: null });
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Session State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string>("default_session");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch Location
    useEffect(() => {
        if (!navigator.geolocation) {
            setLocation(prev => ({ ...prev, error: "Geolocation is not supported by your browser" }));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    error: null
                });
            },
            (error) => {
                setLocation(prev => ({ ...prev, error: error.message }));
            }
        );
    }, []);

    // Fetch Sessions
    const fetchSessions = async () => {
        try {
            const response = await fetch("http://localhost:8000/api/sessions/user");
            if (response.ok) {
                const data = await response.json();
                setSessions(data);
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    // Load Session History
    const loadSessionHistory = async (sessionId: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/api/history/${sessionId}?user_id=user`);
            if (response.ok) {
                const data = await response.json();
                // Ideally map history here. For now, we clear to avoid showing stale state if format differs
                setMessages([]);
            }
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewChat = () => {
        const newSessionId = `session_${Date.now()}`;
        setCurrentSessionId(newSessionId);
        setMessages([]);
        fetchSessions();
    };

    const handleSelectSession = (sessionId: string) => {
        setCurrentSessionId(sessionId);
        loadSessionHistory(sessionId);
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { role: "user" as const, content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("http://localhost:8000/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: input,
                    session_id: currentSessionId,
                    user_id: "user",
                    latitude: location.latitude,
                    longitude: location.longitude
                }),
            });

            const data = await response.json();
            const botMessage = { role: "assistant" as const, content: data.response };
            setMessages((prev) => [...prev, botMessage]);

            // Refresh sessions list
            fetchSessions();
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages((prev) => [...prev, { role: "assistant", content: "Error: Could not connect to the server." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full">
            <Sidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelectSession={handleSelectSession}
                onNewChat={handleNewChat}
                isOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <div className="flex-1 flex flex-col h-full relative">
                {/* Header */}
                <div className="p-4 border-b border-white/10 bg-black/20 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden p-2 text-white/70 hover:text-white"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] shadow-[0_0_20px_rgba(0,242,255,0.3)]">
                            <Activity className="w-6 h-6 text-black" />
                        </div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">
                            Prana-Rakshak
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                            <div className={`w-2 h-2 rounded-full ${location.error ? 'bg-red-500' : location.latitude ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                            <span className="text-xs font-medium text-white/70">
                                {location.error ? 'Location Error' : location.latitude ? 'GPS Active' : 'Locating...'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar relative">
                    {/* Welcome Screen with Banner */}
                    {messages.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50">
                            <img
                                src="/banner.png"
                                alt="Prana-Rakshak Banner"
                                className="w-full max-w-2xl object-cover rounded-2xl shadow-[0_0_50px_rgba(0,242,255,0.1)] mb-8 opacity-80"
                            />
                            <div className="text-center space-y-4">
                                <h2 className="text-3xl font-bold text-white">Welcome to Prana-Rakshak</h2>
                                <p className="text-white/50 max-w-md mx-auto">
                                    Your personal AI guardian for air quality, traffic, and safe travel.
                                </p>
                            </div>
                        </div>
                    )}

                    <AnimatePresence initial={false}>
                        {messages.map((msg, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} relative z-10`}
                            >
                                <div className={`flex gap-4 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user"
                                        ? "bg-[var(--secondary)] shadow-[0_0_15px_var(--secondary-glow)]"
                                        : "bg-[var(--primary)] shadow-[0_0_15px_var(--primary-glow)]"
                                        }`}>
                                        {msg.role === "user" ? <User className="w-5 h-5 text-black" /> : <Bot className="w-5 h-5 text-black" />}
                                    </div>

                                    <div className={`p-6 rounded-2xl backdrop-blur-md border ${msg.role === "user"
                                        ? "bg-[rgba(189,0,255,0.1)] border-[var(--secondary)]/30 text-white"
                                        : "bg-[rgba(0,242,255,0.05)] border-[var(--primary)]/20 text-gray-100"
                                        }`}>
                                        <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    table: GlassTable,
                                                    thead: GlassTableHead,
                                                    tbody: GlassTableBody,
                                                    tr: GlassTableRow,
                                                    td: GlassTableCell,
                                                    ul: AnimatedList,
                                                    ol: AnimatedList,
                                                    li: AnimatedListItem,
                                                    blockquote: InfoCard,
                                                    code(props) {
                                                        const { children, className, node, ...rest } = props
                                                        const match = /language-(\w+)/.exec(className || '')
                                                        if (match && match[1] === 'aqi') {
                                                            try {
                                                                const data = JSON.parse(String(children).replace(/\n$/, ''))
                                                                return <AqiWeatherCard data={data} />
                                                            } catch (e) {
                                                                return <code {...rest} className={className}>{children}</code>
                                                            }
                                                        }
                                                        return <code {...rest} className={className}>{children}</code>
                                                    }
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start relative z-10"
                        >
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center relative overflow-hidden">
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--primary)]/50 to-transparent"
                                        animate={{ x: ['-100%', '100%'] }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                    />
                                    <Sparkles className="w-5 h-5 text-[var(--primary)] relative z-10" />
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 relative overflow-hidden group">
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/0 via-[var(--primary)]/5 to-[var(--primary)]/0"
                                        animate={{ x: ['-200%', '200%'] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                    />
                                    <Loader2 className="w-4 h-4 text-[var(--primary)] animate-spin" />
                                    <span className="text-sm text-white/70 font-medium tracking-wide">
                                        Analyzing environmental factors...
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md relative z-20">
                    <div className="max-w-4xl mx-auto relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            placeholder="Ask about AQI, traffic, or safe routes..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-6 pr-14 text-white placeholder-white/30 focus:outline-none focus:border-[var(--primary)]/50 focus:bg-white/10 transition-all shadow-[0_0_20px_rgba(0,0,0,0.2)]"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading}
                            className="absolute right-2 top-2 p-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <Send className="w-5 h-5 text-black group-hover:scale-110 transition-transform" />
                        </button>
                    </div>
                    <p className="text-center text-xs text-white/30 mt-3">
                        Powered by Gemini 2.0 • Real-time Traffic & AQI Analysis
                    </p>
                </div>
            </div>
        </div>
    );
}
