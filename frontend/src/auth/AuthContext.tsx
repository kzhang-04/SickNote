/* eslint-disable react-refresh/only-export-components */
// disable fast refresh warning for context file

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { loginRequest } from "../api/auth";
import type { UserRole } from "../types/auth";

type AuthContextValue = {
    token: string | null;
    userRole: UserRole | null;
    userId: number | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
};

const AUTH_STORAGE_KEY = "sicknote_token";
const ROLE_STORAGE_KEY = "sicknote_role";
const USER_ID_STORAGE_KEY = "sicknote_user_id";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [userId, setUserId] = useState<number | null>(null);

    // Load token/role/userId from localStorage on first mount
    useEffect(() => {
        const storedToken = localStorage.getItem(AUTH_STORAGE_KEY);
        const storedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
        const storedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);

        if (storedToken) setToken(storedToken);
        if (storedRole) setUserRole(storedRole);
        if (storedUserId) {
            const parsed = Number(storedUserId);
            if (!Number.isNaN(parsed)) {
                setUserId(parsed);
            }
        }
    }, []);

    // Called from LoginPage, with email/password
    const login = async (email: string, password: string) => {
        // backend LoginResponse: { id, email, full_name, role, token }
        const data = await loginRequest(email, password);

        setToken(data.token);
        setUserRole(data.role);
        setUserId(data.id);

        localStorage.setItem(AUTH_STORAGE_KEY, data.token);
        localStorage.setItem(ROLE_STORAGE_KEY, data.role);
        localStorage.setItem(USER_ID_STORAGE_KEY, String(data.id));
    };

    const logout = () => {
        setToken(null);
        setUserRole(null);
        setUserId(null);

        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(ROLE_STORAGE_KEY);
        localStorage.removeItem(USER_ID_STORAGE_KEY);
    };

    const value: AuthContextValue = {
        token,
        userRole,
        userId,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return ctx;
};