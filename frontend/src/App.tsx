// src/App.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navigation from "./components/Navigation";
import Log from "./pages/Log";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Classes from "./pages/Classes";
import Friends from "./pages/Friends";
import NotifyFriends from "./pages/NotifyFriends";
import ClassSummary from "./pages/ClassSummary";
import NotFound from "./pages/NotFound";

import LoginPage from "./pages/LoginPage";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import AddClass from "./pages/AddClass";

const queryClient = new QueryClient();

const AuthedApp = () => {
    const { token, userRole } = useAuth();

    if (!token) {
        return <LoginPage />;
    }

    const isStudent = userRole === "student";
    const isProfessor = userRole === "professor";

    return (
        <>
            <Navigation />
            <Routes>
                {/* Role-based default for "/" */}
                <Route
                    path="/"
                    element={
                        isProfessor ? (
                            <Navigate to="/class-summary" replace />
                        ) : (
                            <Log />
                        )
                    }
                />

                {/* ---------- STUDENT-ONLY ROUTES ---------- */}
                <Route
                    path="/history"
                    element={
                        isStudent ? (
                            <History />
                        ) : (
                            <Navigate
                                to={isProfessor ? "/class-summary" : "/"}
                                replace
                            />
                        )
                    }
                />
                <Route
                    path="/settings"
                    element={
                        isStudent ? (
                            <Settings />
                        ) : (
                            <Navigate
                                to={isProfessor ? "/class-summary" : "/"}
                                replace
                            />
                        )
                    }
                />
                <Route
                    path="/classes"
                    element={
                        isStudent ? (
                            <Classes />
                        ) : (
                            <Navigate
                                to={isProfessor ? "/class-summary" : "/"}
                                replace
                            />
                        )
                    }
                />
                <Route
                    path="/friends"
                    element={
                        isStudent ? (
                            <Friends />
                        ) : (
                            <Navigate
                                to={isProfessor ? "/class-summary" : "/"}
                                replace
                            />
                        )
                    }
                />
                <Route
                    path="/notify-friends"
                    element={
                        isStudent ? (
                            <NotifyFriends />
                        ) : (
                            <Navigate
                                to={isProfessor ? "/class-summary" : "/"}
                                replace
                            />
                        )
                    }
                />

                {/* ---------- PROFESSOR-ONLY ROUTES ---------- */}
                <Route
                    path="/class-summary"
                    element={
                        isProfessor ? (
                            <ClassSummary />
                        ) : (
                            <Navigate to={isStudent ? "/" : "/"} replace />
                        )
                    }
                />
                <Route
                    path="/add-class"
                    element={
                        isProfessor ? (
                            <AddClass />
                        ) : (
                            <Navigate to={isStudent ? "/" : "/"} replace />
                        )
                    }
                />

                {/* Fallback */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </>
    );
};

const App = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <AuthedApp />
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    );
};

export default App;