// src/pages/Friends.tsx
import { useEffect, useState, type FormEvent } from "react";
import { API_BASE_URL } from "../api/config";

type Friend = {
    id: number;
    friend_name: string;
    friend_email: string;
};

const Friends = () => {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Add-friend form state
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // Delete state
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

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

    useEffect(() => {
        void fetchFriends();
    }, []);

    const handleAddFriend = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaveMessage(null);
        setDeleteMessage(null);

        if (!newName.trim() || !newEmail.trim()) {
            setSaveMessage("Please enter a name and an email.");
            return;
        }

        try {
            setSaving(true);

            const res = await fetch(`${API_BASE_URL}/friends`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    friend_name: newName.trim(),
                    friend_email: newEmail.trim(),
                }),
            });

            if (!res.ok) {
                let msg = `Failed to add friend (status ${res.status})`;
                try {
                    const data = await res.json();
                    if (data.detail) msg = data.detail;
                } catch {
                    // ignore
                }
                throw new Error(msg);
            }

            await res.json();
            setSaveMessage("Friend added!");
            setNewName("");
            setNewEmail("");

            void fetchFriends();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setSaveMessage(err.message);
            } else {
                setSaveMessage("Failed to add friend.");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteFriend = async (friendId: number) => {
        setDeleteMessage(null);
        setSaveMessage(null);

        try {
            setDeletingId(friendId);

            const res = await fetch(`${API_BASE_URL}/friends/${friendId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                let msg = `Failed to delete friend (status ${res.status})`;
                try {
                    const data = await res.json();
                    if (data.detail) msg = data.detail;
                } catch {
                    // ignore
                }
                throw new Error(msg);
            }

            setDeleteMessage("Friend deleted.");
            void fetchFriends();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setDeleteMessage(err.message);
            } else {
                setDeleteMessage("Failed to delete friend.");
            }
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">My Friends</h1>
                    <p className="text-sm text-muted-foreground">
                        These are the contacts that will be emailed when you&apos;re sick.
                    </p>
                </div>

                {/* Add friend form */}
                <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-3">
                        Add a Friend
                    </h2>
                    <form
                        onSubmit={handleAddFriend}
                        className="flex flex-col sm:flex-row gap-3"
                    >
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                            placeholder="Friend's name"
                        />
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                            placeholder="Friend's email"
                        />
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {saving ? "Saving..." : "Add"}
                        </button>
                    </form>
                    {(saveMessage || deleteMessage) && (
                        <p className="mt-3 text-sm text-muted-foreground">
                            {saveMessage || deleteMessage}
                        </p>
                    )}
                </div>

                {/* Friends list */}
                <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                        Saved Friends
                    </h2>

                    {loading && (
                        <p className="text-sm text-muted-foreground">Loading friends...</p>
                    )}

                    {!loading && error && (
                        <p className="text-sm text-red-500">Error: {error}</p>
                    )}

                    {!loading && !error && friends.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            You don&apos;t have any friends added yet. Add a friend above and
                            they&apos;ll show up here.
                        </p>
                    )}

                    {!loading && !error && friends.length > 0 && (
                        <ul className="space-y-2">
                            {friends.map((friend) => (
                                <li
                                    key={friend.id}
                                    className="flex items-center justify-between px-4 py-3 bg-muted/40 rounded-lg border border-border/60"
                                >
                                    <div>
                                        <p className="font-medium text-foreground">
                                            {friend.friend_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {friend.friend_email}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleDeleteFriend(friend.id)}
                                        disabled={deletingId === friend.id}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-destructive/50 text-destructive bg-destructive/5 hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {deletingId === friend.id ? "Deleting..." : "Delete"}
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

export default Friends;