"use client";

import { motion } from "framer-motion";

export default function GlassTable(props: any) {
    return (
        <div className="overflow-x-auto my-6 rounded-xl border border-[var(--glass-border)] shadow-[0_0_20px_rgba(0,0,0,0.2)]">
            <table className="w-full text-left border-collapse" {...props}>
                {props.children}
            </table>
        </div>
    );
}

export function GlassTableHead(props: any) {
    return (
        <thead className="bg-[var(--primary)]/10 text-[var(--primary)] uppercase text-xs font-bold tracking-wider">
            {props.children}
        </thead>
    );
}

export function GlassTableBody(props: any) {
    return <tbody className="divide-y divide-[var(--glass-border)]">{props.children}</tbody>;
}

export function GlassTableRow(props: any) {
    return (
        <motion.tr
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="hover:bg-white/5 transition-colors"
            {...props}
        >
            {props.children}
        </motion.tr>
    );
}

export function GlassTableCell(props: any) {
    const isHeader = props.node?.tagName === 'th';
    const Component = isHeader ? 'th' : 'td';

    return (
        <Component
            className={`p-4 ${isHeader ? 'font-bold' : 'text-gray-300'}`}
            {...props}
        >
            {props.children}
        </Component>
    );
}
