"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { sendMessage, getMessages, uploadFile, toggleFlag, toggleSave } from "@/lib/api";
import InteractiveOutput from "@/components/interactive/InteractiveOutput";

export default function ChatView() {
    const {
        user, activeProject, activeConversation, setActiveConversation,
        messages, setMessages, addMessage, selectedProvider, setSelectedProvider,
        isLoading, setIsLoading,
    } = useAppStore();

    const [input, setInput] = useState("");
    const [useDeepResearch, setUseDeepResearch] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [statusLog, setStatusLog] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeConversation) loadMessages();
        else setMessages([]);
    }, [activeConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadMessages = async () => {
        if (!activeConversation) return;
        try { setMessages(await getMessages(activeConversation.id)); }
        catch (e) { console.error("Failed to load messages:", e); }
    };

    const handleSend = async () => {
        if (!input.trim() || !activeProject || isLoading) return;
        const text = input.trim();
        setInput("");
        setIsLoading(true);
        setStatusLog(["🔍 Analyzing your question..."]);

        addMessage({ id: `temp-${Date.now()}`, role: "human", content: text, has_interactive: false, created_at: new Date().toISOString() });

        // Simulate progress logs while waiting
        const logTimer = setTimeout(() => {
            setStatusLog(prev => [...prev, "🧠 Generating response with interactive visuals..."]);
        }, 3000);

        const logTimer2 = setTimeout(() => {
            setStatusLog(prev => [...prev, "📦 Building HTML card..."]);
        }, 8000);

        try {
            const res = await sendMessage({
                message: text, project_id: activeProject.id,
                conversation_id: activeConversation?.id, provider: selectedProvider,
                use_deep_research: useDeepResearch,
            });

            clearTimeout(logTimer);
            clearTimeout(logTimer2);

            // Use status log from server if available
            if (res.status_log?.length) {
                setStatusLog(res.status_log);
            }

            addMessage({
                id: res.message_id, role: "ai", content: res.content,
                has_interactive: res.has_interactive,
                interactive_html_url: res.interactive_html_url,
                html_content: res.html_content,
                status_log: res.status_log,
                created_at: new Date().toISOString(),
            });

            if (!activeConversation && res.conversation_id) {
                setActiveConversation({
                    id: res.conversation_id, title: text.slice(0, 100),
                    is_flagged: false, is_saved: false, llm_provider: selectedProvider,
                    created_at: new Date().toISOString(),
                });
            }
        } catch {
            clearTimeout(logTimer);
            clearTimeout(logTimer2);
            addMessage({ id: `error-${Date.now()}`, role: "ai", content: "Something went wrong. Please try again.", has_interactive: false, created_at: new Date().toISOString() });
        } finally {
            setIsLoading(false);
            setStatusLog([]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || !activeProject) return;
        for (const file of Array.from(files)) {
            try {
                await uploadFile(file, activeProject.id);
                addMessage({ id: `upload-${Date.now()}`, role: "human", content: `📎 Uploaded: ${file.name}`, has_interactive: false, created_at: new Date().toISOString() });
            } catch (e) { console.error("Upload failed:", e); }
        }
    };

    // Clean text — remove interactive markers
    const extractText = (content: string) => content.replace(/<!-- INTERACTIVE_OUTPUT: .+? -->/g, "").replace(/<!-- HTML_CONTENT_START -->[\s\S]*?<!-- HTML_CONTENT_END -->/g, "").trim();

    // Empty state — no project
    if (!activeProject) {
        return (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <div className="animate-float" style={{
                        width: "72px", height: "72px", borderRadius: "var(--radius-xl)", margin: "0 auto 24px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(139, 92, 246, 0.08)", border: "1px solid var(--border-subtle)",
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                        </svg>
                    </div>
                    <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", letterSpacing: "-0.02em" }}>Welcome to LearnFlow</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Create a project to start learning interactively</p>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); }}
        >
            {/* Header */}
            <header style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 24px", borderBottom: "1px solid var(--border-subtle)",
                background: "var(--bg-secondary)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: activeProject.color }} />
                    <span style={{ fontSize: "14px", fontWeight: 600 }}>{activeProject.name}</span>
                    {activeConversation && (
                        <span style={{
                            fontSize: "12px", padding: "3px 10px", borderRadius: "99px",
                            background: "var(--bg-elevated)", color: "var(--text-muted)",
                            maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                            {activeConversation.title}
                        </span>
                    )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <select
                        value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}
                        className="chat-input"
                        style={{ padding: "7px 12px", borderRadius: "var(--radius-sm)", fontSize: "12px", cursor: "pointer" }}
                    >
                        <option value="gemini">✨ Gemini</option>
                        <option value="openai">🟢 OpenAI</option>
                        <option value="anthropic">🟠 Anthropic</option>
                    </select>

                    {activeConversation && (
                        <div style={{ display: "flex", gap: "2px" }}>
                            <button onClick={() => toggleFlag(activeConversation.id, !activeConversation.is_flagged)}
                                className="btn-ghost" style={{ padding: "6px", borderRadius: "var(--radius-sm)" }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill={activeConversation.is_flagged ? "#f87171" : "none"} stroke={activeConversation.is_flagged ? "#f87171" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" />
                                </svg>
                            </button>
                            <button onClick={() => toggleSave(activeConversation.id, !activeConversation.is_saved)}
                                className="btn-ghost" style={{ padding: "6px", borderRadius: "var(--radius-sm)" }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill={activeConversation.is_saved ? "#fbbf24" : "none"} stroke={activeConversation.is_saved ? "#fbbf24" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Drop overlay */}
            <AnimatePresence>
                {isDragging && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                            position: "absolute", inset: 0, zIndex: 50,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(9, 9, 11, 0.92)", backdropFilter: "blur(8px)",
                        }}>
                        <div style={{ textAlign: "center" }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" style={{ margin: "0 auto 16px" }}>
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" x2="12" y1="3" y2="15" />
                            </svg>
                            <p style={{ fontSize: "16px", fontWeight: 600 }}>Drop files here</p>
                            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>PDF and images supported</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
                {messages.length === 0 && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                        <div style={{ textAlign: "center", maxWidth: "480px" }}>
                            <div className="animate-float glow" style={{
                                width: "80px", height: "80px", borderRadius: "var(--radius-xl)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                background: "var(--gradient-primary)", margin: "0 auto 28px",
                            }}>
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                                </svg>
                            </div>
                            <h2 className="gradient-text" style={{ fontSize: "22px", fontWeight: 800, marginBottom: "10px", letterSpacing: "-0.03em" }}>
                                Start Learning
                            </h2>
                            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "28px", lineHeight: 1.6 }}>
                                Ask anything and get interactive visual explanations — diagrams, charts, maps, and live code.
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                {["Explain TCP handshake", "How neural networks work", "Sorting algorithms", "Visualize the solar system"].map((s) => (
                                    <button key={s} onClick={() => setInput(s)}
                                        className="glass glass-hover"
                                        style={{
                                            padding: "14px 16px", borderRadius: "var(--radius-md)",
                                            fontSize: "13px", textAlign: "left", cursor: "pointer",
                                            color: "var(--text-secondary)", fontFamily: "inherit",
                                            lineHeight: 1.4,
                                        }}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {messages.map((msg, idx) => {
                        const isHuman = msg.role === "human";
                        const hasHtml = !!msg.html_content;
                        const hasUrl = !!msg.interactive_html_url;
                        const text = extractText(msg.content);

                        return (
                            <motion.div key={msg.id}
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                style={{ display: "flex", gap: "12px", justifyContent: isHuman ? "flex-end" : "flex-start" }}>

                                {/* AI avatar */}
                                {!isHuman && (
                                    <div style={{
                                        width: "32px", height: "32px", borderRadius: "var(--radius-sm)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        background: "var(--gradient-primary)", flexShrink: 0, marginTop: "2px",
                                    }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                                        </svg>
                                    </div>
                                )}

                                <div style={{ maxWidth: hasHtml || hasUrl ? "800px" : "680px", flex: hasHtml || hasUrl ? 1 : undefined }}>
                                    {/* Human message bubble */}
                                    {isHuman && (
                                        <div className="message-human"
                                            style={{
                                                borderRadius: "var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)",
                                                padding: "14px 18px", fontSize: "14px", lineHeight: 1.7,
                                                whiteSpace: "pre-wrap",
                                            }}>
                                            {text}
                                        </div>
                                    )}

                                    {/* AI message — HTML card or text fallback */}
                                    {!isHuman && (
                                        <>
                                            {/* Show status log pills if available */}
                                            {msg.status_log && msg.status_log.length > 0 && (
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                                                    {msg.status_log.map((log, i) => (
                                                        <span key={i} style={{
                                                            fontSize: "11px", padding: "3px 10px", borderRadius: "99px",
                                                            background: "rgba(99, 102, 241, 0.08)",
                                                            border: "1px solid rgba(99, 102, 241, 0.15)",
                                                            color: "var(--text-secondary)",
                                                        }}>
                                                            {log}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* HTML Card output via InteractiveOutput */}
                                            {hasHtml ? (
                                                <InteractiveOutput htmlContent={msg.html_content} url={msg.interactive_html_url} />
                                            ) : hasUrl ? (
                                                <InteractiveOutput url={msg.interactive_html_url} />
                                            ) : (
                                                /* Text fallback when no HTML was generated */
                                                <div className="message-ai"
                                                    style={{
                                                        borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px",
                                                        padding: "14px 18px", fontSize: "14px", lineHeight: 1.7,
                                                        whiteSpace: "pre-wrap",
                                                    }}>
                                                    {text || "Processing..."}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Human avatar */}
                                {isHuman && (
                                    <div style={{
                                        width: "32px", height: "32px", borderRadius: "var(--radius-sm)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        background: "var(--gradient-primary)", flexShrink: 0, marginTop: "2px",
                                        overflow: "hidden",
                                    }}>
                                        {user?.photoURL ? (
                                            <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        ) : (
                                            <span style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>{user?.displayName?.[0]?.toUpperCase() || "U"}</span>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Loading indicator with status logs */}
                {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                        <div style={{
                            width: "32px", height: "32px", borderRadius: "var(--radius-sm)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "var(--gradient-primary)",
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div className="message-ai" style={{
                                borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px",
                                padding: "16px 20px",
                            }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {statusLog.map((log, i) => (
                                        <motion.div key={i}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            {i === statusLog.length - 1 && (
                                                <div className="animate-pulse-glow" style={{
                                                    width: "6px", height: "6px", borderRadius: "50%",
                                                    background: "var(--accent)", flexShrink: 0,
                                                }} />
                                            )}
                                            <span style={{
                                                fontSize: "13px",
                                                color: i === statusLog.length - 1 ? "var(--text-primary)" : "var(--text-muted)",
                                            }}>
                                                {log}
                                            </span>
                                        </motion.div>
                                    ))}
                                    {statusLog.length === 0 && (
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <div className="animate-pulse-glow" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)" }} />
                                            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                                                {useDeepResearch ? "Starting deep research..." : "Thinking..."}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "8px 24px 20px" }}>
                <div className="glass" style={{
                    borderRadius: "var(--radius-xl)", padding: "14px 16px",
                    borderColor: input.trim() ? "var(--border-active)" : undefined,
                    transition: "border-color 0.2s ease",
                }}>
                    <textarea
                        value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                        placeholder="Ask anything... (Shift+Enter for new line)"
                        rows={1}
                        style={{
                            width: "100%", background: "transparent", border: "none", outline: "none",
                            resize: "none", fontSize: "14px", color: "var(--text-primary)",
                            fontFamily: "inherit", lineHeight: 1.6, minHeight: "24px", maxHeight: "120px",
                        }}
                    />

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <button onClick={() => fileInputRef.current?.click()}
                                className="btn-ghost" style={{ padding: "7px", borderRadius: "var(--radius-sm)" }} title="Upload">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                </svg>
                            </button>
                            <input ref={fileInputRef} type="file" style={{ display: "none" }} accept=".pdf,image/*" multiple
                                onChange={(e) => handleFileUpload(e.target.files)} />

                            <button onClick={() => setUseDeepResearch(!useDeepResearch)}
                                style={{
                                    display: "flex", alignItems: "center", gap: "6px",
                                    padding: "5px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: 500,
                                    cursor: "pointer", border: "1px solid", fontFamily: "inherit",
                                    transition: "all 0.2s ease",
                                    ...(useDeepResearch ? {
                                        background: "rgba(250, 204, 21, 0.08)", borderColor: "rgba(250, 204, 21, 0.25)",
                                        color: "#fbbf24",
                                    } : {
                                        background: "transparent", borderColor: "transparent", color: "var(--text-muted)",
                                    }),
                                }}
                                title={user?.planTier === "free" ? "Requires Pro plan" : "Deep Research"}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
                                </svg>
                                Deep Research
                                {user?.planTier === "free" && (
                                    <span style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "4px", background: "rgba(250, 204, 21, 0.15)", color: "#fbbf24" }}>PRO</span>
                                )}
                            </button>
                        </div>

                        <button onClick={handleSend} disabled={!input.trim() || isLoading}
                            className="btn-primary"
                            style={{
                                padding: "9px 12px", borderRadius: "var(--radius-md)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                            {isLoading ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
                <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                    LearnFlow can make mistakes. Verify important information.
                </p>
            </div>
        </div>
    );
}
