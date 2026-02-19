"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { auth, onAuthStateChanged, type User } from "@/lib/firebase";
import { useAppStore } from "@/lib/store";

const AuthPage = dynamic(() => import("@/components/auth/AuthPage"), { ssr: false });
const Dashboard = dynamic(() => import("@/components/layout/Dashboard"), { ssr: false });

// Force dynamic rendering — no SSR prerender
export const runtime = "edge";

export default function Home() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const setUser = useAppStore((s) => s.setUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        setUser({
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || user.email?.split("@")[0] || "User",
          photoURL: user.photoURL || undefined,
          planTier: "free",
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl glow animate-pulse-glow" style={{ background: 'var(--gradient-primary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading LearnFlow...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthPage />;
  }

  return <Dashboard />;
}
