import { useEffect, useState, type FormEvent } from "react";
import { API_BASE_URL } from "../api/config";

type ClassItem = {
    id: number;
    name: string;
    code?: string | null;
};

const PROFESSOR_ID = 2; // for demo: professor@example.com has id=2

const AddClass = () => {
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [code, setCode] = useState("");

    // Load existing classes
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(
                    `${API_BASE_URL}/api/professors/${PROFESSOR_ID}/classes`,
                );
                if (!res.ok) {
                    throw new Error(`Failed to load classes (status ${res.status})`);
                }

                const data: ClassItem[] = await res.json();
                setClasses(data);
            } catch (err: unknown) {
                if (err instanceof Error) setError(err.message);
                else setError("Failed to load classes.");
            } finally {
                setLoading(false);
            }
        };

        void fetchClasses();
    }, []);

    // Create a new class
    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/professors/${PROFESSOR_ID}/classes`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        code: code || null,
                    }),
                },
            );

            if (!res.ok) {
                throw new Error(`Failed to create class (status ${res.status})`);
            }

            const created: ClassItem = await res.json();
            setClasses((prev) => [...prev, created]);
            setName("");
            setCode("");
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Failed to create class.");
        }
    };

    // Delete a class
    const handleDelete = async (classId: number) => {
        setError(null);

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/professors/${PROFESSOR_ID}/classes/${classId}`,
                {
                    method: "DELETE",
                },
            );

            if (!res.ok) {
                throw new Error(`Failed to delete class (status ${res.status})`);
            }

            // Remove from local state
            setClasses((prev) => prev.filter((c) => c.id !== classId));
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Failed to delete class.");
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <h1 className="text-3xl font-bold text-foreground mb-6">
                    Add a New Class
                </h1>

                {/* Create class form */}
                <form
                    onSubmit={handleCreate}
                    className="bg-card border border-border rounded-xl p-6 mb-8 space-y-4"
                >
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Class Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            required
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                            placeholder="e.g. CS101 - Intro to Programming"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Class Code
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                            placeholder="e.g. CS101 A1"
                        />
                    </div>

                    {error && (
                        <div className="text-destructive text-sm mb-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-all"
                    >
                        Create Class
                    </button>
                </form>

                {/* Existing classes list */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-foreground mb-4">
                        Your Classes
                    </h2>

                    {loading ? (
                        <p className="text-muted-foreground text-sm">
                            Loading classes...
                        </p>
                    ) : classes.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            You don&apos;t have any classes yet. Create one using the form
                            above.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {classes.map((clazz) => (
                                <li
                                    key={clazz.id}
                                    className="flex items-center justify-between bg-background border border-border/60 rounded-lg px-4 py-3"
                                >
                                    <div>
                                        <p className="font-medium text-foreground">{clazz.name}</p>
                                        {clazz.code && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {clazz.code}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleDelete(clazz.id)}
                                        className="text-xs px-3 py-1.5 rounded-full border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
                                    >
                                        Delete
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

export default AddClass;