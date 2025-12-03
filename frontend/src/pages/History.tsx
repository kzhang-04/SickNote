// src/pages/History.tsx
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../api/config";

type LogItem = {
    id: number;
    symptoms: string;
    severity: number;
    recoveryTime: number;
    created_at: string;
};

const History = () => {
    const [logs, setLogs] = useState<LogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch(`${API_BASE_URL}/api/reports`);

            if (!res.ok) {
                throw new Error(`Failed to load history (status ${res.status})`);
            }

            const data: LogItem[] = await res.json();
            setLogs(data);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to load history.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchHistory();
    }, []);

    const deleteLog = async (logId: number) => {
        setDeleteMessage(null);
        try {
            setDeletingId(logId);

            const res = await fetch(`${API_BASE_URL}/api/reports/${logId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                let msg = `Failed to delete entry (status ${res.status})`;
                try {
                    const data = await res.json();
                    if (data.detail) msg = data.detail;
                } catch {
                    // ignore JSON parse error
                }
                throw new Error(msg);
            }

            setLogs((prev) => prev.filter((log) => log.id !== logId));
            setDeleteMessage("Entry deleted.");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setDeleteMessage(err.message);
            } else {
                setDeleteMessage("Failed to delete entry.");
            }
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        Illness History
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        A timeline of all the illnesses you&apos;ve logged, including severity
                        and when they were reported.
                    </p>
                </div>

                <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                    {loading && (
                        <p className="text-sm text-muted-foreground">Loading history...</p>
                    )}

                    {!loading && error && (
                        <p className="text-sm text-red-500">Error: {error}</p>
                    )}

                    {!loading && !error && deleteMessage && (
                        <p className="mb-3 text-sm text-muted-foreground">{deleteMessage}</p>
                    )}

                    {!loading && !error && logs.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            You haven&apos;t logged any illnesses yet. Once you submit entries on
                            the Log page, they&apos;ll show up here.
                        </p>
                    )}

                    {!loading && !error && logs.length > 0 && (
                        <ul className="space-y-3">
                            {logs.map((log) => {
                                const created = new Date(log.created_at);
                                const createdLabel = created.toLocaleString();

                                return (
                                    <li
                                        key={log.id}
                                        className="px-4 py-3 bg-muted/40 rounded-lg border border-border/60"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">
                                                    Symptoms
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {log.symptoms}
                                                </p>
                                            </div>

                                            <div className="flex flex-col items-end text-right gap-2">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Logged at</p>
                                                    <p className="text-xs text-foreground font-medium">
                                                        {createdLabel}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => void deleteLog(log.id)}
                                                    disabled={deletingId === log.id}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-destructive/50 text-destructive bg-destructive/5 hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                >
                                                    {deletingId === log.id ? "Deleting..." : "Delete"}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                                            <div>
                        <span className="text-xs uppercase text-muted-foreground">
                          Severity
                        </span>
                                                <p className="font-medium text-foreground">
                                                    {log.severity}/5
                                                </p>
                                            </div>
                                            <div>
                        <span className="text-xs uppercase text-muted-foreground">
                          Expected Recovery
                        </span>
                                                <p className="font-medium text-foreground">
                                                    {log.recoveryTime} day
                                                    {log.recoveryTime === 1 ? "" : "s"}
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default History;