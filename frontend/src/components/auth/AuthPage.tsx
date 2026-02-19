"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    signInWithGoogle,
    signInWithGithub,
    signInWithEmail,
    signUpWithEmail,
} from "@/lib/firebase";

export default function AuthPage() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (isSignUp) {
                await signUpWithEmail(email, password);
            } else {
                await signInWithEmail(email, password);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Authentication failed";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleSSO = async (provider: "google" | "github") => {
        setError("");
        setLoading(true);
        try {
            if (provider === "google") await signInWithGoogle();
            else await signInWithGithub();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Authentication failed";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                background: "var(--bg-primary)",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Ambient background orbs */}
            <div
                style={{
                    position: "absolute",
                    top: "15%",
                    left: "20%",
                    width: "500px",
                    height: "500px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%)",
                    filter: "blur(60px)",
                    pointerEvents: "none",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: "10%",
                    right: "15%",
                    width: "400px",
                    height: "400px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent 70%)",
                    filter: "blur(60px)",
                    pointerEvents: "none",
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="glass"
                style={{
                    borderRadius: "var(--radius-2xl)",
                    padding: "48px 40px",
                    width: "100%",
                    maxWidth: "440px",
                    position: "relative",
                    zIndex: 1,
                }}
            >
                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: "36px" }}>
                    <div
                        className="glow"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "64px",
                            height: "64px",
                            borderRadius: "var(--radius-lg)",
                            background: "var(--gradient-primary)",
                            marginBottom: "20px",
                        }}
                    >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                        </svg>
                    </div>
                    <h1
                        className="gradient-text"
                        style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "8px" }}
                    >
                        LearnFlow
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                        Interactive AI-powered learning
                    </p>
                </div>

                {/* SSO Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
                    <button
                        onClick={() => handleSSO("google")}
                        disabled={loading}
                        className="btn-outline"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "12px",
                            padding: "14px 20px",
                            borderRadius: "var(--radius-md)",
                            fontSize: "14px",
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    <button
                        onClick={() => handleSSO("github")}
                        disabled={loading}
                        className="btn-outline"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "12px",
                            padding: "14px 20px",
                            borderRadius: "var(--radius-md)",
                            fontSize: "14px",
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        Continue with GitHub
                    </button>
                </div>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
                    <div className="divider" />
                    <span style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap" }}>
                        or continue with email
                    </span>
                    <div className="divider" />
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="chat-input"
                        style={{
                            padding: "14px 16px",
                            borderRadius: "var(--radius-md)",
                            fontSize: "14px",
                            width: "100%",
                        }}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="chat-input"
                        style={{
                            padding: "14px 16px",
                            borderRadius: "var(--radius-md)",
                            fontSize: "14px",
                            width: "100%",
                        }}
                        required
                        minLength={6}
                    />

                    <AnimatePresence>
                        {error && (
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{
                                    fontSize: "13px",
                                    color: "#f87171",
                                    background: "rgba(239, 68, 68, 0.08)",
                                    border: "1px solid rgba(239, 68, 68, 0.15)",
                                    borderRadius: "var(--radius-sm)",
                                    padding: "10px 14px",
                                }}
                            >
                                {error}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{
                            padding: "14px 20px",
                            borderRadius: "var(--radius-md)",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            marginTop: "4px",
                        }}
                    >
                        {loading ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                        ) : (
                            <>
                                {isSignUp ? "Create Account" : "Sign In"}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                {/* Toggle */}
                <p style={{ textAlign: "center", marginTop: "28px", fontSize: "13px", color: "var(--text-secondary)" }}>
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                        onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                        style={{
                            background: "none",
                            border: "none",
                            color: "var(--accent-light)",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontFamily: "inherit",
                            fontSize: "13px",
                        }}
                    >
                        {isSignUp ? "Sign in" : "Create one"}
                    </button>
                </p>
            </motion.div>

            <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
