// src/api/auth.ts
import type { LoginResponse } from "../types/auth";

const API_BASE = "http://localhost:8000";

export async function loginRequest(
    email: string,
    password: string
): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    let data: unknown = null;

    try {
        data = await res.json();
    } catch {
        // ignore parse error; we'll handle below
    }

    if (!res.ok) {
        let msg = "Login failed";

        if (data && typeof data === "object" && "detail" in data) {
            const detail = (data as { detail: unknown }).detail;

            if (typeof detail === "string") {
                msg = detail;
            } else if (Array.isArray(detail) && detail.length > 0) {
                const first = detail[0] as { msg?: unknown };
                if (typeof first.msg === "string") {
                    msg = first.msg;
                }
            }
        }

        throw new Error(msg);
    }

    // At this point we expect the backend's success shape
    return data as LoginResponse;
}