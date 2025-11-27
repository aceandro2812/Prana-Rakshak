"use client";

import { motion } from "framer-motion";
import { Cloud, CloudRain, Sun, Wind, Droplets, Thermometer } from "lucide-react";

interface AqiData {
    city: string;
    aqi: number;
    weather: string;
    temperature: number;
    humidity: number;
}

export default function AqiWeatherCard({ data }: { data: AqiData }) {
    const { city, aqi, weather, temperature, humidity } = data;

    // Determine severity color and label
    let color = "from-green-500 to-emerald-700";
    let status = "Good";
    let glow = "shadow-green-500/50";

    if (aqi > 50) {
        color = "from-yellow-400 to-yellow-600";
        status = "Moderate";
        glow = "shadow-yellow-500/50";
    }
    if (aqi > 100) {
        color = "from-orange-500 to-orange-700";
        status = "Unhealthy for Sensitive Groups";
        glow = "shadow-orange-500/50";
    }
    if (aqi > 150) {
        color = "from-red-500 to-red-700";
        status = "Unhealthy";
        glow = "shadow-red-500/50";
    }
    if (aqi > 200) {
        color = "from-purple-500 to-purple-700";
        status = "Very Unhealthy";
        glow = "shadow-purple-500/50";
    }
    if (aqi > 300) {
        color = "from-rose-900 to-red-900";
        status = "Hazardous";
        glow = "shadow-rose-900/50";
    }

    // Weather Icon Logic
    const getWeatherIcon = () => {
        const w = weather.toLowerCase();
        if (w.includes("rain")) return <CloudRain className="w-8 h-8 text-white" />;
        if (w.includes("cloud")) return <Cloud className="w-8 h-8 text-white" />;
        if (w.includes("clear") || w.includes("sun")) return <Sun className="w-8 h-8 text-yellow-300" />;
        return <Wind className="w-8 h-8 text-white" />;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100 }}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-6 text-white shadow-lg ${glow} my-4 max-w-md mx-auto`}
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-2xl font-bold">{city}</h3>
                        <p className="text-white/80 text-sm">{new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                        {getWeatherIcon()}
                    </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col">
                        <span className="text-6xl font-bold tracking-tighter">{aqi}</span>
                        <span className="text-sm font-medium uppercase tracking-wider opacity-90">AQI Index</span>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold">{status}</div>
                        <div className="text-sm opacity-80">{weather}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3">
                        <Thermometer className="w-5 h-5 opacity-70" />
                        <div>
                            <div className="text-xs opacity-70">Temperature</div>
                            <div className="font-bold">{temperature}°C</div>
                        </div>
                    </div>
                    <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3">
                        <Droplets className="w-5 h-5 opacity-70" />
                        <div>
                            <div className="text-xs opacity-70">Humidity</div>
                            <div className="font-bold">{humidity}%</div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
