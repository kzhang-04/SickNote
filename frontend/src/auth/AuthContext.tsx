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
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
};

const AUTH_STORAGE_KEY = "sicknote_token";
const ROLE_STORAGE_KEY = "sicknote_role";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);

    // Load token/role from localStorage on first mount
    useEffect(() => {
        const storedToken = localStorage.getItem(AUTH_STORAGE_KEY);
        const storedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;

        if (storedToken) setToken(storedToken);
        if (storedRole) setUserRole(storedRole);
    }, []);

    // Called from LoginPage, with email/password
    const login = async (email: string, password: string) => {
        const data = await loginRequest(email, password); // backend: { id, email, full_name, role, token }

        setToken(data.token);
        setUserRole(data.role);

        localStorage.setItem(AUTH_STORAGE_KEY, data.token);
        localStorage.setItem(ROLE_STORAGE_KEY, data.role);
    };

    const logout = () => {
        setToken(null);
        setUserRole(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(ROLE_STORAGE_KEY);
    };

    const value: AuthContextValue = {
        token,
        userRole,
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