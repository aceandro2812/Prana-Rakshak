"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Wind, Car, MapPin, Activity, Bot, User } from "lucide-react";
import GlassCard from "./GlassCard";
import GlassTable, { GlassTableHead, GlassTableBody, GlassTableRow, GlassTableCell } from "./GlassTable";
import AnimatedList, { AnimatedListItem } from "./AnimatedList";
import InfoCard from "./InfoCard";
import AqiWeatherCard from "./AqiWeatherCard";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export default function ChatInterface() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId] = useState(() => "session_" + Math.random().toString(36).substr(2, 9));
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                (error) => {
                    console.error("Error getting location:", error);
                }
            );
        }
    }, []);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            role: "user",
            content: input,
            timestamp: new Date()
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("http://localhost:8000/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    session_id: sessionId,
                    user_id: "user_frontend",
                    latitude: location?.lat,
                    longitude: location?.lng,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch response");
            }

            const data = await response.json();
            const assistantMessage: Message = {
                role: "assistant",
                content: data.response,
                timestamp: new Date()
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, something went wrong. Please try again.",
                    timestamp: new Date()
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden relative z-10">
            {/* Sidebar / Dashboard Overlay */}
            <div className="hidden md:flex flex-col w-80 p-6 gap-6 border-r border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-lg bg-[var(--primary)] shadow-[0_0_15px_var(--primary-glow)]">
                        <Activity className="w-6 h-6 text-black" />
                    </div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">
                        Prana-Rakshak
                    </h1>
                </div>

                <GlassCard className="p-4">
                    <div className="flex items-center gap-3 mb-2 text-[var(--primary)]">
                        <Wind className="w-5 h-5" />
                        <h3 className="font-semibold">Air Quality</h3>
                    </div>
                    <div className="text-sm text-gray-400">
                        Monitoring real-time AQI levels in your area.
                    </div>
                </GlassCard>

                <GlassCard className="p-4">
                    <div className="flex items-center gap-3 mb-2 text-[var(--secondary)]">
                        <Car className="w-5 h-5" />
                        <h3 className="font-semibold">Traffic Status</h3>
                    </div>
                    <div className="text-sm text-gray-400">
                        Analyzing congestion and optimal routes.
                    </div>
                </GlassCard>

                <div className="mt-auto">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        <span>Auto-detecting location...</span>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative">
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    <AnimatePresence>
                        {messages.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center h-full text-center space-y-6"
                            >
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-[0_0_50px_var(--primary-glow)]">
                                    <Bot className="w-12 h-12 text-black" />
                                </div>
                                <h2 className="text-3xl font-bold text-white">How can I help you today?</h2>
                                <p className="text-gray-400 max-w-md">
                                    I can help you find the best time to travel based on air quality and traffic conditions.
                                </p>
                            </motion.div>
                        )}

                        {messages.map((msg, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
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
                                                    th: GlassTableCell,
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
                                        <div className="mt-2 text-xs opacity-50">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                            className="flex justify-start gap-4"
                        >
                            <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-[0_0_15px_var(--primary-glow)]">
                                <Bot className="w-5 h-5 text-black" />
                            </div>
                            <div className="bg-[rgba(0,242,255,0.05)] border border-[var(--primary)]/20 p-4 rounded-2xl flex gap-2 items-center">
                                <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                                <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                    <div className="max-w-4xl mx-auto relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            placeholder="Ask about AQI, traffic, or best travel times..."
                            className="w-full p-4 pr-14 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2 top-2 p-2 rounded-lg bg-[var(--primary)] text-black hover:bg-[var(--primary)]/80 disabled:opacity-50 disabled:hover:bg-[var(--primary)] transition-colors"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
