"use client";

import { motion } from "framer-motion";

export default function AnimatedList(props: any) {
    return (
        <ul className="space-y-3 my-4" {...props}>
            {props.children}
        </ul>
    );
}

export function AnimatedListItem(props: any) {
    return (
        <motion.li
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-[var(--secondary)]/50 transition-colors"
        >
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--secondary)] shrink-0 shadow-[0_0_10px_var(--secondary-glow)]" />
            <span className="text-gray-200">{props.children}</span>
        </motion.li>
    );
}
