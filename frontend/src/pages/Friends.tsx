// src/pages/Friends.tsx
import { useEffect, useState } from "react";
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

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">My Friends</h1>
                </div>

                <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                    {loading && (
                        <p className="text-sm text-muted-foreground">Loading friends...</p>
                    )}

                    {!loading && error && (
                        <p className="text-sm text-red-500">Error: {error}</p>
                    )}

                    {!loading && !error && friends.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            You don&apos;t have any friends added yet. They&apos;ll show up here
                            once you add them.
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
                                    {/* placeholder for future actions (edit/delete) */}
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