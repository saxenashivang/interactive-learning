// API client for backend communication
import { getIdToken } from "./firebase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = await getIdToken();
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    return fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });
}

// ---- Chat API ----

export async function sendMessage(data: {
    message: string;
    project_id: string;
    conversation_id?: string;
    provider?: string;
    use_deep_research?: boolean;
}) {
    const res = await authFetch("/chat/send", {
        method: "POST",
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function listConversations(projectId: string) {
    const res = await authFetch(`/chat/conversations/${projectId}`);
    return res.json();
}

export async function getMessages(conversationId: string) {
    const res = await authFetch(`/chat/messages/${conversationId}`);
    return res.json();
}

export async function toggleFlag(conversationId: string, isFlagged: boolean) {
    return authFetch(`/chat/conversations/${conversationId}/flag`, {
        method: "PATCH",
        body: JSON.stringify({ is_flagged: isFlagged }),
    });
}

export async function toggleSave(conversationId: string, isSaved: boolean) {
    return authFetch(`/chat/conversations/${conversationId}/save`, {
        method: "PATCH",
        body: JSON.stringify({ is_saved: isSaved }),
    });
}

// ---- Projects API ----

export async function listProjects() {
    const res = await authFetch("/projects/");
    return res.json();
}

export async function createProject(data: {
    name: string;
    description?: string;
    category_id?: string;
    color?: string;
}) {
    const res = await authFetch("/projects/", {
        method: "POST",
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteProject(projectId: string) {
    return authFetch(`/projects/${projectId}`, { method: "DELETE" });
}

export async function listCategories() {
    const res = await authFetch("/projects/categories");
    return res.json();
}

// ---- Uploads API ----

export async function uploadFile(file: File, projectId: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("project_id", projectId);

    const res = await authFetch("/uploads/upload", {
        method: "POST",
        body: formData,
    });
    return res.json();
}

export async function listUploads(projectId: string) {
    const res = await authFetch(`/uploads/${projectId}`);
    return res.json();
}

// ---- Billing API ----

export async function createCheckout(plan: string) {
    const res = await authFetch("/billing/create-checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
    });
    return res.json();
}

export async function getBillingStatus() {
    const res = await authFetch("/billing/status");
    return res.json();
}

export async function createBillingPortal() {
    const res = await authFetch("/billing/portal", {
        method: "POST",
        body: JSON.stringify({ return_url: window.location.href }),
    });
    return res.json();
}
