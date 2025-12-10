export type UserRole = "student" | "professor";

export interface LoginResponse {
    id: number;
    email: string;
    full_name: string | null;
    role: UserRole;
    token: string;
}