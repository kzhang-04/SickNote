import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../api/config";

type SummaryData = {
    available: boolean;
    count?: number;
    avg_severity?: number;
    common_symptoms?: string[];
    message?: string;
};

const ClassSummary = () => {
    const { userRole } = useAuth();

    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Only professors can see class summary
        if (userRole !== "professor") {
            setLoading(false);
            return;
        }

        const fetchSummary = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(`${API_BASE_URL}/api/class-summary`);
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
    }, [userRole]);

    // If not professor, show restricted view
    if (userRole !== "professor") {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8 max-w-2xl">
                    <h1 className="text-3xl font-bold text-foreground mb-4">
                        Class Health Summary
                    </h1>
                    <div className="bg-card p-6 rounded-lg border border-border">
                        <p className="text-foreground font-semibold">
                            Access restricted
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            The class summary is only available to professors.
                            Please log in with a professor account to view aggregated class data.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Professor view
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <h1 className="text-3xl font-bold text-foreground mb-6">
                    Class Health Summary
                </h1>

                {loading && (
                    <div className="bg-card p-6 rounded-lg border border-border">
                        <p className="text-muted-foreground">Loading summary...</p>
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
                            {summary.message || "No summary data available yet."}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Summary will be available once sufficient reports are submitted
                            (minimum 10 for privacy protection).
                        </p>
                    </div>
                )}

                {!loading && !error && summary && summary.available && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Total Reports Card */}
                            <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                                    Total Reports
                                </h3>
                                <p className="text-4xl font-bold text-foreground">
                                    {summary.count}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Students reported illness
                                </p>
                            </div>

                            {/* Average Severity Card */}
                            <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                                    Average Severity
                                </h3>
                                <p className="text-4xl font-bold text-foreground">
                                    {summary.avg_severity}/5
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {summary.avg_severity && summary.avg_severity < 2
                                        ? "Mild"
                                        : summary.avg_severity && summary.avg_severity < 4
                                            ? "Moderate"
                                            : "Severe"}
                                </p>
                            </div>
                        </div>

                        {/* Common Symptoms Card */}
                        <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                            <h3 className="text-lg font-semibold text-foreground mb-4">
                                Most Common Symptoms
                            </h3>
                            {summary.common_symptoms && summary.common_symptoms.length > 0 ? (
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
                                <p className="text-muted-foreground">No symptom data available</p>
                            )}
                        </div>

                        {/* Info Note */}
                        <div className="bg-muted/50 p-4 rounded-lg border border-border">
                            <p className="text-sm text-muted-foreground">
                                <strong>Note:</strong> This data is anonymized and aggregated to
                                protect student privacy. Individual student information is not
                                displayed.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassSummary;