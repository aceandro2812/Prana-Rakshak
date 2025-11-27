"use client";

import { motion } from "framer-motion";
import { Info, AlertTriangle, Lightbulb } from "lucide-react";

export default function InfoCard(props: any) {
    // Simple heuristic to detect type based on content (optional enhancement)
    // For now, we'll default to a generic "Insight" card

    return (
        <motion.blockquote
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative my-6 p-6 rounded-xl bg-gradient-to-br from-[var(--primary)]/10 to-transparent border-l-4 border-[var(--primary)] overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-4 opacity-20">
                <Lightbulb className="w-12 h-12 text-[var(--primary)]" />
            </div>
            <div className="relative z-10 text-gray-200 italic">
                {props.children}
            </div>
        </motion.blockquote>
    );
}
