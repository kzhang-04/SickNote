import React, { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../api/config";

type Mode = "login" | "signup";
type UserRole = "student" | "professor";

const LoginPage: React.FC = () => {
    const { login } = useAuth();

    const [mode, setMode] = useState<Mode>("login");

    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("student");

    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (mode === "login") {
                // login
                await login(email, password);
                // If it doesn't throw, AuthContext will store token & role
            } else {
                // signup
                if (!email || !password || !fullName) {
                    setError("Please fill in name, email, and password.");
                    setLoading(false);
                    return;
                }

                const res = await fetch(`${API_BASE_URL}/auth/signup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        password,
                        full_name: fullName,
                        role, // "student" or "professor"
                    }),
                });

                let data: unknown = null;
                try {
                    data = await res.json();
                } catch {
                    // ignore parse error will handle with res.ok
                }

                if (!res.ok) {
                    let msg = "Sign up failed";
                    if (data && typeof data === "object" && "detail" in data) {
                        const detail = (data as { detail: unknown }).detail;
                        if (typeof detail === "string") {
                            msg = detail;
                        }
                    }
                    throw new Error(msg);
                }

                // sign up succeeded so log in with same credentials
                await login(email, password);
            }
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError(mode === "login" ? "Login failed" : "Sign up failed");
            }
        } finally {
            setLoading(false);
        }
    }

    const isLogin = mode === "login";

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm p-8 bg-card border border-border rounded-xl shadow-soft"
            >
                <h2 className="text-3xl font-bold text-foreground text-center mb-6">
                    SickNote {isLogin ? "Login" : "Sign Up"}
                </h2>

                {/* Toggle between Login / Sign Up */}
                <div className="flex justify-center gap-2 mb-6 text-sm">
                    <button
                        type="button"
                        onClick={() => setMode("login")}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                            isLogin
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-transparent text-muted-foreground border-border"
                        }`}
                    >
                        Login
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("signup")}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                            !isLogin
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-transparent text-muted-foreground border-border"
                        }`}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Full name only for sign up */}
                {!isLogin && (
                    <label className="block mb-4">
            <span className="text-sm font-medium text-foreground mb-2 block">
              Full name
            </span>
                        <input
                            type="text"
                            autoComplete="name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                            placeholder="Your name"
                            required
                        />
                    </label>
                )}

                <label className="block mb-4">
          <span className="text-sm font-medium text-foreground mb-2 block">
            Email
          </span>
                    <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                        placeholder="student@example.com"
                        required
                    />
                </label>

                <label className="block mb-4">
          <span className="text-sm font-medium text-foreground mb-2 block">
            Password
          </span>
                    <input
                        type="password"
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                        placeholder="••••••••"
                        required
                    />
                </label>

                {/* Role picker only for sign up */}
                {!isLogin && (
                    <div className="mb-4">
            <span className="text-sm font-medium text-foreground mb-2 block">
              Account type
            </span>
                        <div className="flex gap-4 text-sm">
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="role"
                                    value="student"
                                    checked={role === "student"}
                                    onChange={() => setRole("student")}
                                />
                                <span>Student</span>
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="role"
                                    value="professor"
                                    checked={role === "professor"}
                                    onChange={() => setRole("professor")}
                                />
                                <span>Professor</span>
                            </label>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="text-destructive text-sm mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {loading
                        ? isLogin
                            ? "Logging in..."
                            : "Creating account..."
                        : isLogin
                            ? "Log In"
                            : "Sign Up"}
                </button>
            </form>
        </div>
    );
};

export default LoginPage;