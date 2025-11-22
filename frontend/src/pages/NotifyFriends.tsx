import { useEffect, useState } from "react";

type Friend = {
    id: number;
    friend_name: string;
    friend_email: string;
};

const API_BASE_URL = "http://127.0.0.1:8000"; // backend

const NotifyFriends = () => {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]); // will be used in next task

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

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-xl">
                <h1 className="text-3xl font-bold text-foreground mb-4">
                    Notify Friends
                </h1>

                {loading && <p>Loading friends...</p>}

                {!loading && error && (
                    <p className="text-red-600 text-sm">{error}</p>
                )}

                {!loading && !error && friends.length === 0 && (
                    <p>You have no friends saved yet.</p>
                )}

                {!loading && !error && friends.length > 0 && (
                    <div className="space-y-3">
                        <p className="font-medium mb-1">
                            Select friends to notify:
                        </p>
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
                )}
            </div>
        </div>
    );
};

export default NotifyFriends;