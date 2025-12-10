import { useEffect, useState, type FormEvent } from "react";
import { API_BASE_URL } from "../api/config";
import { useAuth } from "../auth/AuthContext";

type ClassItem = {
    id: number;
    name: string;
    code?: string | null;
};

const AddClass = () => {
    const { userId, userRole, token } = useAuth();

    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [code, setCode] = useState("");

    // Fetch classes (must run before return)
    useEffect(() => {
        if (!userId || userRole !== "professor") return;

        const fetchClasses = async () => {
            try {
                setLoading(true);
                const res = await fetch(
                    `${API_BASE_URL}/api/professors/${userId}/classes`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!res.ok) throw new Error("Failed to load classes");
                setClasses(await res.json());
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error loading classes");
            } finally {
                setLoading(false);
            }
        };

        void fetchClasses();
    }, [userId, userRole, token]);

    // Block students AFTER hooks
    if (userRole !== "professor") {
        return (
            <div className="min-h-screen flex items-center justify-center p-10">
                <h2 className="text-xl text-muted-foreground">
                    🔒 This page is only available for professors.
                </h2>
            </div>
        );
    }

    // Create class
    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/professors/${userId}/classes`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ name, code: code || null }),
                }
            );

            if (!res.ok) throw new Error("Failed to create class");
            const created: ClassItem = await res.json();
            setClasses(prev => [...prev, created]);
            setName("");
            setCode("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error creating class");
        }
    };

    // Delete class
    const handleDelete = async (classId: number) => {
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/professors/${userId}/classes/${classId}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!res.ok) throw new Error("Failed to delete class");
            setClasses(prev => prev.filter(c => c.id !== classId));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error deleting class");
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <h1 className="text-3xl font-bold mb-6">Add a New Class</h1>

                {/* Create form */}
                <form onSubmit={handleCreate} className="bg-card p-6 rounded-lg space-y-4 border">
                    <div>
                        <label className="block mb-1">Class Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full border p-2 rounded"
                            placeholder="CS101 - Intro to Programming"
                        />
                    </div>

                    <div>
                        <label className="block mb-1">Class Code (optional)</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full border p-2 rounded"
                            placeholder="CS101-A1"
                        />
                    </div>

                    {error && <p className="text-red-500">{error}</p>}

                    <button type="submit" className="bg-primary text-white px-4 py-2 rounded">
                        Create Class
                    </button>
                </form>

                {/* List existing classes */}
                <div className="mt-8 bg-card p-6 rounded-lg border">
                    <h2 className="text-xl font-semibold mb-3">Your Classes</h2>

                    {loading ? <p>Loading...</p> :
                        classes.length === 0 ? <p>No classes yet.</p> :
                            <ul className="space-y-2">
                                {classes.map(c => (
                                    <li key={c.id} className="flex justify-between items-center border p-3 rounded">
                                        <div>
                                            <p className="font-medium">{c.name}</p>
                                            {c.code && <p className="text-sm">Code: {c.code}</p>}
                                        </div>

                                        <button
                                            onClick={() => handleDelete(c.id)}
                                            className="text-red-500 border border-red-400 px-3 py-1 rounded"
                                        >
                                            Delete
                                        </button>
                                    </li>
                                ))}
                            </ul>
                    }
                </div>
            </div>
        </div>
    );
};

export default AddClass;