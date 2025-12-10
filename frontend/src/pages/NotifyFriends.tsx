import { useEffect, useState } from "react";
import { API_BASE_URL } from "../api/config";
import { useAuth } from "../auth/AuthContext";

type Friend = {
    id: number;
    friend_name: string;
    friend_email: string;
};

type NotifyResponse = {
    notified_count: number;
};

type PrivacyOption = "everyone" | "friends" | "professors";

const NotifyFriends = () => {
    const { token, userRole } = useAuth();

    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true); // loading friends
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [sending, setSending] = useState(false); // sending notifications
    const [notifyMessage, setNotifyMessage] = useState<string | null>(null);

    // 🔒 Privacy-related state
    const [privacy, setPrivacy] = useState<PrivacyOption | null>(null);
    const [privacyError, setPrivacyError] = useState<string | null>(null);

    useEffect(() => {
        // If not logged in, don't even try to call the backend
        if (!token) {
            setLoading(false);
            setError("You must be logged in to view and notify friends.");
            return;
        }

        const fetchFriends = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(`${API_BASE_URL}/friends`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (!res.ok) {
                    throw new Error(`Failed to load friends (status ${res.status})`);
                }

                const data: Friend[] = await res.json();
                setFriends(data);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError("Failed to load friends.");
                }
            } finally {
                setLoading(false);
            }
        };

        const fetchPrivacy = async () => {
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
                // backend returns: { notification_privacy: "friends" | "everyone" | "professors" }
                setPrivacy(data.notification_privacy as PrivacyOption);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setPrivacyError(err.message);
                } else {
                    setPrivacyError("Failed to load privacy settings.");
                }
            }
        };

        void fetchFriends();
        void fetchPrivacy();
    }, [token]);

    const toggleFriend = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSendNotifications = async () => {
        setError(null);
        setNotifyMessage(null);

        if (!token) {
            setError("You must be logged in to notify friends.");
            return;
        }

        // 🔒 Frontend guard: block if privacy is professors-only
        if (privacy === "professors") {
            setError(
                "Your notification privacy is set to 'Professors Only', so you cannot notify friends."
            );
            return;
        }

        if (selectedIds.length === 0) {
            setError("Please select at least one friend.");
            return;
        }

        try {
            setSending(true);

            const res = await fetch(`${API_BASE_URL}/notify-friends`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ friend_ids: selectedIds }),
            });

            if (!res.ok) {
                let msg = `Failed to send notifications (status ${res.status})`;
                try {
                    const data = await res.json();
                    if (data.detail) {
                        msg = data.detail;
                    }
                } catch {
                    // ignore JSON parse errors
                }
                throw new Error(msg);
            }

            const data: NotifyResponse = await res.json();
            setNotifyMessage(
                `Notifications sent to ${data.notified_count} friend(s).`
            );
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to send notifications.");
            }
        } finally {
            setSending(false);
        }
    };

    const notificationsDisabled =
        privacy === "professors" || privacy === null; // null while loading privacy

    // Restrict this page to students; professors don’t need to notify friends
    if (userRole === "professor") {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8 max-w-2xl">
                    <h1 className="text-3xl font-bold text-foreground mb-4">
                        Notify Friends
                    </h1>
                    <div className="bg-card p-6 rounded-lg border border-border">
                        <p className="text-foreground font-semibold">Access restricted</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            The &quot;Notify Friends&quot; feature is designed for{" "}
                            <span className="font-semibold">students</span> to email their
                            personal contacts when they&apos;re sick. As a professor, you can
                            instead view aggregated health information for your classes in the{" "}
                            <span className="font-semibold">&quot;Class Summary&quot;</span> tab.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-xl">
                <h1 className="text-3xl font-bold text-foreground mb-4">
                    Notify Friends
                </h1>

                {!token && (
                    <p className="text-red-600 text-sm mb-4">
                        You must be logged in to view and notify friends.
                    </p>
                )}

                {/* Privacy info */}
                {privacyError && (
                    <p className="text-red-600 text-sm mb-2">
                        Privacy settings error: {privacyError}
                    </p>
                )}
                {privacy && !privacyError && (
                    <p className="text-sm text-muted-foreground mb-4">
                        Current privacy:{" "}
                        <span className="font-semibold">
                            {privacy === "everyone"
                                ? "Everyone (Friends & Professors)"
                                : privacy === "friends"
                                    ? "Friends Only"
                                    : "Professors Only"}
                        </span>
                    </p>
                )}

                {loading && <p>Loading friends...</p>}

                {!loading && error && (
                    <p className="text-red-600 text-sm mb-2">{error}</p>
                )}

                {!loading && !error && friends.length === 0 && (
                    <p>You have no friends saved yet.</p>
                )}

                {!loading && !error && friends.length > 0 && (
                    <div className="space-y-4">
                        <div>
                            <p className="font-medium mb-1">Select friends to notify:</p>
                            <ul className="space-y-2">
                                {friends.map((friend) => (
                                    <li
                                        key={friend.id}
                                        className="flex items-center gap-2 border rounded px-3 py-2"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(friend.id)}
                                            onChange={() => toggleFriend(friend.id)}
                                            disabled={notificationsDisabled || !token}
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-semibold">
                                                {friend.friend_name}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {friend.friend_email}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button
                            type="button"
                            onClick={handleSendNotifications}
                            disabled={
                                sending ||
                                loading ||
                                friends.length === 0 ||
                                notificationsDisabled ||
                                !token
                            }
                            className="px-4 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50"
                        >
                            {!token
                                ? "Log in to Notify Friends"
                                : notificationsDisabled
                                    ? "Notifications Disabled by Privacy Settings"
                                    : sending
                                        ? "Sending..."
                                        : "Send Notifications"}
                        </button>

                        {/* Message if disabled due to professors-only */}
                        {privacy === "professors" && (
                            <p className="text-sm text-red-600 mt-2">
                                Your privacy is set to <strong>Professors Only</strong>, so
                                friends cannot be notified. You can change this in the{" "}
                                <strong>Settings</strong> page.
                            </p>
                        )}

                        {notifyMessage && (
                            <p className="text-sm text-green-600">{notifyMessage}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotifyFriends;