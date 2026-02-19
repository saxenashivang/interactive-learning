"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface InteractiveOutputProps {
    url?: string;
    htmlContent?: string;
}

export default function InteractiveOutput({ url, htmlContent }: InteractiveOutputProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [iframeHeight, setIframeHeight] = useState(450);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleRefresh = () => {
        if (iframeRef.current) {
            if (htmlContent) {
                iframeRef.current.srcdoc = htmlContent;
            } else if (url) {
                iframeRef.current.src = url;
            }
        }
    };

    // Auto-resize iframe based on content
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "resize" && event.data?.height) {
                setIframeHeight(Math.min(Math.max(event.data.height + 40, 300), 800));
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // Inject resize script into htmlContent
    const enhancedHtml = htmlContent
        ? htmlContent.replace(
            "</body>",
            `<script>
                new ResizeObserver(() => {
                    parent.postMessage({ type: 'resize', height: document.body.scrollHeight }, '*');
                }).observe(document.body);
                setTimeout(() => {
                    parent.postMessage({ type: 'resize', height: document.body.scrollHeight }, '*');
                }, 1000);
              </script></body>`
        )
        : undefined;

    const openInNewTab = () => {
        if (htmlContent) {
            const blob = new Blob([htmlContent], { type: "text/html" });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, "_blank");
        } else if (url) {
            window.open(url, "_blank");
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`relative ${isExpanded ? "fixed inset-4 z-50" : ""}`}
            style={{
                borderRadius: isExpanded ? "16px" : "16px",
                overflow: "hidden",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(99, 102, 241, 0.1)",
                background: isExpanded ? "var(--bg-primary)" : "transparent",
            }}
        >
            {/* Toolbar */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 14px",
                    background: "rgba(15, 23, 42, 0.95)",
                    borderBottom: "1px solid rgba(99, 102, 241, 0.15)",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444" }} />
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#eab308" }} />
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e" }} />
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 500, color: "rgba(148, 163, 184, 0.8)", letterSpacing: "0.5px" }}>
                        Interactive Output
                    </span>
                    {!isLoaded && (
                        <span style={{
                            fontSize: "11px",
                            color: "#818cf8",
                            animation: "pulse 1.5s ease-in-out infinite",
                        }}>
                            Loading...
                        </span>
                    )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button
                        onClick={handleRefresh}
                        title="Refresh"
                        style={{
                            background: "none",
                            border: "none",
                            color: "rgba(148, 163, 184, 0.7)",
                            cursor: "pointer",
                            padding: "4px",
                            borderRadius: "6px",
                            fontSize: "14px",
                        }}
                    >
                        ↻
                    </button>
                    <button
                        onClick={openInNewTab}
                        title="Open in new tab"
                        style={{
                            background: "none",
                            border: "none",
                            color: "rgba(148, 163, 184, 0.7)",
                            cursor: "pointer",
                            padding: "4px",
                            borderRadius: "6px",
                            fontSize: "14px",
                        }}
                    >
                        ↗
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        title={isExpanded ? "Minimize" : "Maximize"}
                        style={{
                            background: "none",
                            border: "none",
                            color: "rgba(148, 163, 184, 0.7)",
                            cursor: "pointer",
                            padding: "4px",
                            borderRadius: "6px",
                            fontSize: "14px",
                        }}
                    >
                        {isExpanded ? "⊖" : "⊕"}
                    </button>
                </div>
            </div>

            {/* Iframe */}
            <iframe
                ref={iframeRef}
                srcDoc={enhancedHtml}
                src={!htmlContent ? url : undefined}
                onLoad={() => setIsLoaded(true)}
                style={{
                    width: "100%",
                    height: isExpanded ? "calc(100vh - 80px)" : `${iframeHeight}px`,
                    border: "none",
                    background: "#0f172a",
                    display: "block",
                }}
                sandbox="allow-scripts allow-same-origin allow-popups"
                title="Interactive Learning Output"
            />

            {/* Expanded backdrop */}
            {isExpanded && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: -1,
                        background: "rgba(0, 0, 0, 0.85)",
                        backdropFilter: "blur(8px)",
                    }}
                    onClick={() => setIsExpanded(false)}
                />
            )}
        </motion.div>
    );
}
