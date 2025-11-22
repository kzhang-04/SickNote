import { useEffect, useState } from "react";

type Friend = {
    id: number;
    friend_name: string;
    friend_email: string;
};

type NotifyResponse = {
    notified_count: number;
};

const API_BASE_URL = "http://127.0.0.1:8000"; // backend

const NotifyFriends = () => {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true); // loading friends
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [sending, setSending] = useState(false); // sending notifications
    const [notifyMessage, setNotifyMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(`${API_BASE_URL}/friends`);
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

        void fetchFriends();
    }, []);

    const toggleFriend = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSendNotifications = async () => {
        if (selectedIds.length === 0) {
            setError("Please select at least one friend.");
            setNotifyMessage(null);
            return;
        }

        try {
            setSending(true);
            setError(null);
            setNotifyMessage(null);

            const res = await fetch(`${API_BASE_URL}/notify-friends`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ friend_ids: selectedIds }),
            });

            if (!res.ok) {
                throw new Error(`Failed to send notifications (status ${res.status})`);
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

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-xl">
                <h1 className="text-3xl font-bold text-foreground mb-4">
                    Notify Friends
                </h1>

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
                            disabled={sending || loading || friends.length === 0}
                            className="px-4 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50"
                        >
                            {sending ? "Sending..." : "Send Notifications"}
                        </button>

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