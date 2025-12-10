import { useEffect, useState, type FormEvent } from "react";
import { API_BASE_URL } from "../api/config";
import { useAuth } from "../auth/AuthContext";

type ClassItem = {
    id: number;
    name: string;
    code?: string | null;
};

type PrivacyOption = "everyone" | "friends" | "professors";

const Classes = () => {
    const { userRole, userId, token } = useAuth();

    // ---- state ----
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [joinCode, setJoinCode] = useState("");
    const [joinMessage, setJoinMessage] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);

    const [leavingId, setLeavingId] = useState<number | null>(null);
    const [leaveMessage, setLeaveMessage] = useState<string | null>(null);

    // 🔒 privacy-related state
    const [privacy, setPrivacy] = useState<PrivacyOption | null>(null);
    const [privacyError, setPrivacyError] = useState<string | null>(null);

    // ---- fetch enrolled classes ----
    const fetchClasses = async () => {
        if (!userId || userRole !== "student") return;

        try {
            setLoading(true);
            setError(null);

            const res = await fetch(
                `${API_BASE_URL}/api/students/${userId}/classes`,
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

    const fetchPrivacy = async () => {
        if (!token) return;

        try {
            setPrivacyError(null);
            const res = await fetch(`${API_BASE_URL}/api/settings/privacy`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                throw new Error(
                    `Failed to load privacy settings (status ${res.status})`
                );
            }

            const data = await res.json();
            setPrivacy(data.notification_privacy as PrivacyOption);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setPrivacyError(err.message);
            } else {
                setPrivacyError("Failed to load privacy settings.");
            }
        }
    };

    useEffect(() => {
        void fetchClasses();
        void fetchPrivacy();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, userRole, token]);

    // ---- professor view: just explanation ----
    if (userRole === "professor") {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8 max-w-2xl">
                    <h1 className="text-3xl font-bold text-foreground mb-4">
                        My Classes
                    </h1>
                    <div className="bg-card p-6 rounded-lg border border-border">
                        <p className="text-sm text-muted-foreground">
                            This page is intended for{" "}
                            <span className="font-semibold">students</span> to see and join the
                            classes they’re enrolled in.
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            As a professor, you can create and manage classes in the{" "}
                            <span className="font-semibold">&quot;Add a New Class&quot;</span>{" "}
                            tab and view aggregated health data in{" "}
                            <span className="font-semibold">&quot;Class Summary&quot;</span>.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // While auth is still loading
    if (!userId) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading your account…</p>
            </div>
        );
    }

    // 🔒 student view disabled when privacy = "friends"
    if (privacy === "friends") {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8 max-w-2xl">
                    <h1 className="text-3xl font-bold text-foreground mb-4">
                        My Classes
                    </h1>

                    {privacyError && (
                        <p className="text-sm text-red-600 mb-3">
                            Privacy settings error: {privacyError}
                        </p>
                    )}

                    <div className="bg-card p-6 rounded-lg border border-border">
                        <p className="text-sm text-muted-foreground">
                            Your notification privacy is set to{" "}
                            <span className="font-semibold">Friends Only</span>. Class
                            enrollment features are currently disabled.
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            You can change this in the <span className="font-semibold">Settings</span>{" "}
                            page if you want to join or leave classes here.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ---- join class handler ----
    const handleJoin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setJoinMessage(null);
        setLeaveMessage(null);

        if (!joinCode.trim()) {
            setJoinMessage("Please enter a class code.");
            return;
        }

        try {
            setJoining(true);

            const res = await fetch(
                `${API_BASE_URL}/api/students/${userId}/join-class`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        student_id: userId,
                        code: joinCode.trim(),
                    }),
                }
            );

            if (!res.ok) {
                let msg = `Failed to join class (status ${res.status})`;
                try {
                    const data = await res.json();
                    if (data.detail) msg = data.detail;
                } catch {
                    // ignore parsing error
                }
                throw new Error(msg);
            }

            const data = await res.json();
            setJoinMessage(
                `Joined class "${data.class_name ?? data.name ?? "Unknown"}"!`
            );
            setJoinCode("");
            void fetchClasses();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setJoinMessage(err.message);
            } else {
                setJoinMessage("Failed to join class.");
            }
        } finally {
            setJoining(false);
        }
    };

    // ---- leave class handler ----
    const leaveClass = async (classId: number) => {
        setLeaveMessage(null);
        try {
            setLeavingId(classId);

            const res = await fetch(
                `${API_BASE_URL}/api/classes/${classId}/students/${userId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!res.ok) {
                let msg = `Failed to leave class (status ${res.status})`;
                try {
                    const data = await res.json();
                    if (data.detail) msg = data.detail;
                } catch {
                    // ignore parsing error
                }
                throw new Error(msg);
            }

            setLeaveMessage("You left the class successfully.");
            void fetchClasses();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setLeaveMessage(err.message);
            } else {
                setLeaveMessage("Failed to leave class.");
            }
        } finally {
            setLeavingId(null);
        }
    };

    // ---- student view (normal) ----
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">My Classes</h1>
                <p className="text-sm text-muted-foreground mb-1">
                    Join a class with a code from your professor, and see the list of
                    classes you&apos;re currently enrolled in.
                </p>

                {privacyError && (
                    <p className="text-xs text-red-600 mb-2">
                        Privacy settings error: {privacyError}
                    </p>
                )}
                {privacy && (
                    <p className="text-xs text-muted-foreground mb-4">
                        Current privacy: <span className="font-semibold">{privacy}</span>
                    </p>
                )}

                {/* Join class form */}
                <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-3">
                        Join a Class
                    </h2>
                    <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                            placeholder="Enter class code (e.g. CS101-A1)"
                        />
                        <button
                            type="submit"
                            disabled={joining}
                            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {joining ? "Joining..." : "Join"}
                        </button>
                    </form>
                    {joinMessage && (
                        <p className="mt-3 text-sm text-muted-foreground">{joinMessage}</p>
                    )}
                </div>

                {/* Enrolled classes list */}
                <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                        Enrolled Classes
                    </h2>

                    {loading && (
                        <p className="text-sm text-muted-foreground">Loading classes...</p>
                    )}

                    {!loading && error && (
                        <p className="text-sm text-red-500">Error: {error}</p>
                    )}

                    {!loading && !error && leaveMessage && (
                        <p className="mb-3 text-sm text-muted-foreground">{leaveMessage}</p>
                    )}

                    {!loading && !error && classes.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            You are not enrolled in any classes yet. Use the class code your
                            professor gave you to join.
                        </p>
                    )}

                    {!loading && !error && classes.length > 0 && (
                        <ul className="space-y-2">
                            {classes.map((cls) => (
                                <li
                                    key={cls.id}
                                    className="flex items-center justify-between px-4 py-3 bg-muted/40 rounded-lg border border-border/60"
                                >
                                    <div>
                                        <p className="font-medium text-foreground">{cls.name}</p>
                                        {cls.code && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Code: {cls.code}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void leaveClass(cls.id)}
                                        disabled={leavingId === cls.id}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-destructive/50 text-destructive bg-destructive/5 hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {leavingId === cls.id ? "Leaving..." : "Leave"}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Classes;