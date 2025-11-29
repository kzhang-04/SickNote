import React, { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { loginRequest } from "../api/auth";

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const data = await loginRequest(email, password);
            // backend: { id, email, full_name, role, token }
            if (!data.token) {
                throw new Error("No token returned from server");
            }
            login(data.token, data.role ?? null);
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Login failed");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm p-8 bg-card border border-border rounded-xl shadow-soft"
            >
                <h2 className="text-3xl font-bold text-foreground text-center mb-6">
                    SickNote Login
                </h2>

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
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                        placeholder="••••••••"
                        required
                    />
                </label>

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
                    {loading ? "Logging in..." : "Log In"}
                </button>
            </form>
        </div>
    );
};

export default LoginPage;