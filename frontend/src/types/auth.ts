export type UserRole = "student" | "professor" | string;

export interface User {
    id: number;
    email: string;
    full_name?: string | null;
    role: UserRole;
}

export interface LoginResponse {
    id: number;
    email: string;
    full_name?: string | null;
    role: UserRole;
    token: string;
}