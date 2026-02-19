"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { logOut } from "@/lib/firebase";
import { listProjects, createProject, listConversations } from "@/lib/api";
import ChatView from "@/components/chat/ChatView";

export default function Dashboard() {
    const {
        user, projects, setProjects, activeProject, setActiveProject,
        conversations, setConversations, activeConversation, setActiveConversation,
        sidebarOpen, setSidebarOpen,
    } = useAppStore();

    const [showNewProject, setShowNewProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => { loadProjects(); }, []);
    useEffect(() => { if (activeProject) loadConversations(activeProject.id); }, [activeProject]);

    const loadProjects = async () => {
        try {
            const data = await listProjects();
            setProjects(data);
            if (data.length > 0 && !activeProject) setActiveProject(data[0]);
        } catch (e) { console.error("Failed to load projects:", e); }
    };

    const loadConversations = async (pid: string) => {
        try {
            const data = await listConversations(pid);
            setConversations(data);
        } catch (e) { console.error("Failed to load conversations:", e); }
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        try {
            await createProject({ name: newProjectName });
            setNewProjectName("");
            setShowNewProject(false);
            loadProjects();
        } catch (e) { console.error("Failed to create project:", e); }
    };

    const filteredConvos = conversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const initials = user?.displayName?.[0]?.toUpperCase() || "U";

    return (
        <div style={{ height: "100vh", display: "flex", overflow: "hidden", background: "var(--bg-primary)" }}>
            {/* ===== Sidebar ===== */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 280, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            background: "var(--bg-secondary)",
                            borderRight: "1px solid var(--border-subtle)",
                        }}
                    >
                        <div style={{ display: "flex", flexDirection: "column", minWidth: "280px", height: "100%" }}>
                            {/* Header */}
                            <div style={{
                                padding: "20px 16px 16px",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                borderBottom: "1px solid var(--border-subtle)",
                            }}>
                                <div className="glow-sm" style={{
                                    width: "40px", height: "40px", borderRadius: "var(--radius-md)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    background: "var(--gradient-primary)", flexShrink: 0,
                                }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                                    </svg>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h1 className="gradient-text" style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.02em" }}>LearnFlow</h1>
                                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Interactive Learning</p>
                                </div>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="btn-ghost"
                                    style={{ padding: "6px", borderRadius: "var(--radius-sm)" }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m15 18-6-6 6-6" />
                                    </svg>
                                </button>
                            </div>

                            {/* New Chat Button */}
                            <div style={{ padding: "12px 12px 0" }}>
                                <button
                                    onClick={() => { setActiveConversation(null); useAppStore.getState().setMessages([]); }}
                                    className="btn-primary"
                                    style={{
                                        width: "100%", padding: "11px 16px", borderRadius: "var(--radius-md)",
                                        fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 5v14" /><path d="M5 12h14" />
                                    </svg>
                                    New Chat
                                </button>
                            </div>

                            {/* Projects Section */}
                            <div style={{ padding: "16px 12px 8px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                    <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                                        Projects
                                    </span>
                                    <button
                                        onClick={() => setShowNewProject(!showNewProject)}
                                        className="btn-ghost"
                                        style={{ padding: "4px 6px", borderRadius: "var(--radius-sm)", fontSize: "12px" }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 5v14" /><path d="M5 12h14" />
                                        </svg>
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {showNewProject && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                            style={{ marginBottom: "8px" }}
                                        >
                                            <input
                                                type="text" value={newProjectName}
                                                onChange={(e) => setNewProjectName(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                                                placeholder="Project name..."
                                                className="chat-input"
                                                style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
                                                autoFocus
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                    {projects.map((project) => (
                                        <button
                                            key={project.id}
                                            onClick={() => setActiveProject(project)}
                                            className="glass-hover"
                                            style={{
                                                width: "100%", display: "flex", alignItems: "center", gap: "10px",
                                                padding: "10px 12px", borderRadius: "var(--radius-sm)", fontSize: "13px",
                                                textAlign: "left", cursor: "pointer", border: "1px solid transparent",
                                                background: activeProject?.id === project.id ? "rgba(139, 92, 246, 0.1)" : "transparent",
                                                borderColor: activeProject?.id === project.id ? "var(--border-active)" : "transparent",
                                                color: activeProject?.id === project.id ? "var(--text-primary)" : "var(--text-secondary)",
                                                fontFamily: "inherit", fontWeight: activeProject?.id === project.id ? 500 : 400,
                                                transition: "all 0.2s ease",
                                            }}
                                        >
                                            <div style={{
                                                width: "8px", height: "8px", borderRadius: "50%",
                                                background: project.color, flexShrink: 0,
                                                boxShadow: activeProject?.id === project.id ? `0 0 6px ${project.color}` : "none",
                                            }} />
                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Conversations */}
                            {activeProject && (
                                <div style={{
                                    flex: 1, overflow: "hidden", display: "flex", flexDirection: "column",
                                    padding: "0 12px", borderTop: "1px solid var(--border-subtle)",
                                }}>
                                    <div style={{ padding: "12px 0 8px" }}>
                                        <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                                            Recent Chats
                                        </span>
                                    </div>

                                    {/* Search */}
                                    <div style={{ position: "relative", marginBottom: "8px" }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}>
                                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                                        </svg>
                                        <input
                                            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search..."
                                            className="chat-input"
                                            style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: "var(--radius-sm)", fontSize: "12px" }}
                                        />
                                    </div>

                                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px", paddingBottom: "8px" }}>
                                        {filteredConvos.map((conv) => (
                                            <button
                                                key={conv.id}
                                                onClick={() => setActiveConversation(conv)}
                                                className="glass-hover"
                                                style={{
                                                    width: "100%", display: "flex", alignItems: "center", gap: "8px",
                                                    padding: "9px 10px", borderRadius: "var(--radius-sm)", fontSize: "12px",
                                                    textAlign: "left", cursor: "pointer", border: "1px solid transparent",
                                                    background: activeConversation?.id === conv.id ? "rgba(139, 92, 246, 0.1)" : "transparent",
                                                    borderColor: activeConversation?.id === conv.id ? "var(--border-active)" : "transparent",
                                                    color: activeConversation?.id === conv.id ? "var(--text-primary)" : "var(--text-secondary)",
                                                    fontFamily: "inherit", transition: "all 0.15s ease",
                                                }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                                                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                                                </svg>
                                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{conv.title}</span>
                                                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                                                    {conv.is_flagged && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f87171" }} />}
                                                    {conv.is_saved && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fbbf24" }} />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* User Profile */}
                            <div style={{
                                padding: "12px", borderTop: "1px solid var(--border-subtle)",
                                marginTop: "auto",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} />
                                    ) : (
                                        <div style={{
                                            width: "36px", height: "36px", borderRadius: "50%",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            background: "var(--gradient-primary)", color: "white",
                                            fontSize: "14px", fontWeight: 700, flexShrink: 0,
                                        }}>
                                            {initials}
                                        </div>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {user?.displayName}
                                        </p>
                                        <span className={`badge ${user?.planTier === "pro" ? "badge-pro" : user?.planTier === "team" ? "badge-team" : "badge-free"}`}>
                                            {user?.planTier || "free"}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    <button
                                        className="btn-ghost"
                                        style={{ flex: 1, padding: "8px", borderRadius: "var(--radius-sm)", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                        Settings
                                    </button>
                                    <button
                                        onClick={() => logOut()}
                                        className="btn-ghost"
                                        style={{ flex: 1, padding: "8px", borderRadius: "var(--radius-sm)", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#f87171" }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" x2="9" y1="12" y2="12" />
                                        </svg>
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Sidebar Toggle */}
            {!sidebarOpen && (
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="glass glass-hover"
                    style={{
                        position: "fixed", top: "16px", left: "16px", zIndex: 50,
                        padding: "10px", borderRadius: "var(--radius-md)", cursor: "pointer",
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </button>
            )}

            {/* Main Content */}
            <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <ChatView />
            </main>
        </div>
    );
}
