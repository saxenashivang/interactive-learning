"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Maximize2, Minimize2, ExternalLink, RotateCcw } from "lucide-react";

interface InteractiveOutputProps {
    url: string;
}

export default function InteractiveOutput({ url }: InteractiveOutputProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleRefresh = () => {
        if (iframeRef.current) {
            iframeRef.current.src = url;
        }
    };

    return (
        <motion.div
            layout
            className={`interactive-frame relative ${isExpanded ? "fixed inset-4 z-50" : ""}`}
            style={
                isExpanded
                    ? { background: "var(--bg-primary)" }
                    : {}
            }
        >
            {/* Toolbar */}
            <div
                className="flex items-center justify-between px-3 py-2"
                style={{
                    background: "var(--bg-tertiary)",
                    borderBottom: "1px solid var(--border-subtle)",
                }}
            >
                <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#eab308" }} />
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                        Interactive Output
                    </span>
                    {!isLoaded && (
                        <span className="animate-shimmer text-[10px] px-2 py-0.5 rounded" style={{ color: "var(--accent-primary)" }}>
                            Loading...
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleRefresh}
                        className="btn-ghost p-1 rounded"
                        title="Refresh"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost p-1 rounded"
                        title="Open in new tab"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="btn-ghost p-1 rounded"
                        title={isExpanded ? "Minimize" : "Maximize"}
                    >
                        {isExpanded ? (
                            <Minimize2 className="w-3.5 h-3.5" />
                        ) : (
                            <Maximize2 className="w-3.5 h-3.5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Iframe */}
            <iframe
                ref={iframeRef}
                src={url}
                onLoad={() => setIsLoaded(true)}
                className="w-full border-none"
                style={{
                    height: isExpanded ? "calc(100% - 40px)" : "400px",
                    borderRadius: "0 0 12px 12px",
                    background: "#0f172a",
                }}
                sandbox="allow-scripts allow-same-origin"
                title="Interactive Learning Output"
            />

            {/* Expanded backdrop */}
            {isExpanded && (
                <div
                    className="fixed inset-0 -z-10"
                    style={{ background: "rgba(0, 0, 0, 0.8)" }}
                    onClick={() => setIsExpanded(false)}
                />
            )}
        </motion.div>
    );
}
