import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../api/config";
import type { ClassItem } from "../types/classes";

type StudentHealth = {
    student_id: number;
    full_name?: string | null;
    email: string;
    is_sick: boolean;
    latest_symptoms?: string | null;
    latest_severity?: number | null;
    latest_created_at?: string | null;
};

type SummaryData = {
    available: boolean;
    count?: number;
    avg_severity?: number;
    common_symptoms?: string[];
    message?: string;
    students?: StudentHealth[];
};

const ClassSummary = () => {
    const { userRole, userId, token } = useAuth();

    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Only professors can see class summary
    const isProfessor = userRole === "professor";

    // 1) Fetch classes for professor
    useEffect(() => {
        if (!isProfessor || !userId || !token) {
            setLoading(false);
            return;
        }

        const fetchClasses = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(
                    `${API_BASE_URL}/api/professors/${userId}/classes`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!res.ok) {
                    throw new Error(`Failed to load classes (status ${res.status})`);
                }

                const data: ClassItem[] = await res.json();
                setClasses(data);

                if (data.length > 0 && selectedClassId === null) {
                    setSelectedClassId(data[0].id);
                }
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError("Failed to load classes.");
                }
            } finally {
                setLoading(false);
            }
        };

        void fetchClasses();
    }, [isProfessor, userId, token, selectedClassId]);

    // 2) Fetch summary when a class is selected
    useEffect(() => {
        if (!isProfessor || !token) return;
        if (selectedClassId == null) return;

        const fetchSummary = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(
                    `${API_BASE_URL}/api/classes/${selectedClassId}/summary`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                if (!res.ok) {
                    throw new Error(`Failed to load summary (status ${res.status})`);
                }

                const data: SummaryData = await res.json();
                setSummary(data);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError("Failed to load class summary.");
                }
            } finally {
                setLoading(false);
            }
        };

        void fetchSummary();
    }, [isProfessor, selectedClassId, token]);

    // If not professor, show restricted view
    if (!isProfessor) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8 max-w-2xl">
                    <h1 className="text-3xl font-bold text-foreground mb-4">
                        Class Health Summary
                    </h1>
                    <div className="bg-card p-6 rounded-lg border border-border">
                        <p className="text-foreground font-semibold">Access restricted</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            The class summary is only available to professors.
                            Please log in with a professor account to view aggregated class data.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // While auth is still resolving
    if (!userId || !token) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading your account…</p>
            </div>
        );
    }

    const currentClass = classes.find((c) => c.id === selectedClassId) ?? null;

    // Professor view
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                    <h1 className="text-3xl font-bold text-foreground">
                        Class Health Summary
                    </h1>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Class</span>
                        <select
                            className="px-3 py-2 border border-border rounded-md bg-card text-sm text-foreground"
                            value={selectedClassId ?? ""}
                            onChange={(e) =>
                                setSelectedClassId(
                                    e.target.value ? Number(e.target.value) : null
                                )
                            }
                        >
                            {classes.length === 0 && (
                                <option value="">No classes</option>
                            )}
                            {classes.map((clazz) => (
                                <option key={clazz.id} value={clazz.id}>
                                    {clazz.name}
                                    {clazz.code ? ` (${clazz.code})` : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {!currentClass && (
                    <div className="bg-card p-6 rounded-lg border border-border">
                        <p className="text-muted-foreground">
                            You don’t have any classes yet.
                        </p>
                    </div>
                )}

                {currentClass && (
                    <>
                        {loading && (
                            <div className="bg-card p-6 rounded-lg border border-border">
                                <p className="text-muted-foreground">
                                    Loading summary for{" "}
                                    <span className="font-semibold">{currentClass.name}</span>
                                    ...
                                </p>
                            </div>
                        )}

                        {!loading && error && (
                            <div className="bg-card p-6 rounded-lg border border-red-500">
                                <p className="text-red-600 font-semibold">Error</p>
                                <p className="text-sm text-red-500">{error}</p>
                            </div>
                        )}

                        {!loading && !error && summary && !summary.available && (
                            <div className="bg-card p-6 rounded-lg border border-border">
                                <p className="text-muted-foreground">
                                    {summary.message ||
                                        "No summary data available yet for this class."}
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    The summary will appear once there are illness reports
                                    for students enrolled in this class.
                                </p>
                            </div>
                        )}

                        {!loading && !error && summary && summary.available && (
                            <div className="space-y-6">
                                {/* High-level cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                                            Sick Students
                                        </h3>
                                        <p className="text-4xl font-bold text-foreground">
                                            {summary.count ?? 0}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Students currently marked as sick
                                        </p>
                                    </div>

                                    <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                                            Average Severity
                                        </h3>
                                        <p className="text-4xl font-bold text-foreground">
                                            {summary.avg_severity ?? "-"}
                                            {summary.avg_severity != null && "/5"}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {summary.avg_severity == null
                                                ? "No recent illness reports"
                                                : summary.avg_severity < 2
                                                    ? "Overall mild"
                                                    : summary.avg_severity < 4
                                                        ? "Overall moderate"
                                                        : "Overall severe"}
                                        </p>
                                    </div>
                                </div>

                                {/* Common Symptoms */}
                                <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                                    <h3 className="text-lg font-semibold text-foreground mb-4">
                                        Most Common Symptoms
                                    </h3>
                                    {summary.common_symptoms &&
                                    summary.common_symptoms.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {summary.common_symptoms.map((symptom, index) => (
                                                <span
                                                    key={index}
                                                    className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium"
                                                >
                                                    {symptom}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">
                                            No symptom data available
                                        </p>
                                    )}
                                </div>

                                {/* Per-student table */}
                                <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                                    <h3 className="text-lg font-semibold text-foreground mb-4">
                                        Student Health Status
                                    </h3>

                                    {summary.students && summary.students.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                                                    <th className="py-2 pr-4">Name</th>
                                                    <th className="py-2 pr-4">Email</th>
                                                    <th className="py-2 pr-4">Status</th>
                                                    <th className="py-2 pr-4">Latest Symptoms</th>
                                                    <th className="py-2 pr-4">Severity</th>
                                                    <th className="py-2 pr-4">Last Updated</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {summary.students.map((s) => {
                                                    const statusLabel = s.is_sick ? "Sick" : "Healthy";
                                                    const statusClasses = s.is_sick
                                                        ? "text-red-600 bg-red-50 border-red-100"
                                                        : "text-emerald-600 bg-emerald-50 border-emerald-100";

                                                    return (
                                                        <tr
                                                            key={s.student_id}
                                                            className="border-b border-border/60 last:border-0"
                                                        >
                                                            <td className="py-2 pr-4">
                                                                {s.full_name ?? "(No name)"}
                                                            </td>
                                                            <td className="py-2 pr-4 text-muted-foreground">
                                                                {s.email}
                                                            </td>
                                                            <td className="py-2 pr-4">
                                                                    <span
                                                                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${statusClasses}`}
                                                                    >
                                                                        {statusLabel}
                                                                    </span>
                                                            </td>
                                                            <td className="py-2 pr-4">
                                                                {s.latest_symptoms ?? "—"}
                                                            </td>
                                                            <td className="py-2 pr-4">
                                                                {s.latest_severity ?? "—"}
                                                            </td>
                                                            <td className="py-2 pr-4 text-muted-foreground">
                                                                {s.latest_created_at
                                                                    ? new Date(
                                                                        s.latest_created_at
                                                                    ).toLocaleString()
                                                                    : "—"}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">
                                            No students or health data yet for this class.
                                        </p>
                                    )}
                                </div>

                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ClassSummary;