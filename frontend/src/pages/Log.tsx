import { useState } from "react";

const Log = () => {
    const [symptoms, setSymptoms] = useState("");
    const [severity, setSeverity] = useState("");
    const [recoveryTime, setRecoveryTime] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!symptoms || !severity || !recoveryTime) {
            alert("Please fill in all fields before submitting.");
            return;
        }

        alert("Your health report has been logged successfully.");

        // Reset form
        setSymptoms("");
        setSeverity("");
        setRecoveryTime("");
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <div className="bg-card p-8 rounded-lg border border-border shadow-lg">
                    <h1 className="text-3xl font-bold text-foreground mb-8 text-center">
                        Submit Report
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="symptoms" className="text-base font-semibold text-foreground block">
                                Symptoms
                            </label>
                            <textarea
                                id="symptoms"
                                placeholder="Describe your symptoms..."
                                value={symptoms}
                                onChange={(e) => setSymptoms(e.target.value)}
                                className="w-full min-h-[100px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="severity" className="text-base font-semibold text-foreground block">
                                Severity
                            </label>
                            <input
                                id="severity"
                                type="text"
                                placeholder="On a scale of 1-5"
                                value={severity}
                                onChange={(e) => setSeverity(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="recovery-time" className="text-base font-semibold text-foreground block">
                                Expected Recovery Time
                            </label>
                            <input
                                id="recovery-time"
                                type="text"
                                placeholder="e.g., 2-3 days, 1 week"
                                value={recoveryTime}
                                onChange={(e) => setRecoveryTime(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full h-14 text-lg font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                            Confirm Report
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Log;
