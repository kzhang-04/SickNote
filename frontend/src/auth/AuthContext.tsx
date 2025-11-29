/* eslint-disable react-refresh/only-export-components */
// disable fast refresh warning for context file

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type AuthContextValue = {
    token: string | null;
    userRole: string | null;
    login: (token: string, role?: string | null) => void;
    logout: () => void;
};

const AUTH_STORAGE_KEY = "sicknote_token";
const ROLE_STORAGE_KEY = "sicknote_role";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem(AUTH_STORAGE_KEY);
        const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);

        if (storedToken) setToken(storedToken);
        if (storedRole) setUserRole(storedRole);
    }, []);

    const login = (newToken: string, role: string | null = null) => {
        setToken(newToken);
        localStorage.setItem(AUTH_STORAGE_KEY, newToken);

        if (role) {
            setUserRole(role);
            localStorage.setItem(ROLE_STORAGE_KEY, role);
        } else {
            setUserRole(null);
            localStorage.removeItem(ROLE_STORAGE_KEY);
        }
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