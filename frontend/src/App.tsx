import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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

const queryClient = new QueryClient();

const AuthedApp = () => {
    const { token } = useAuth();

    if (!token) {
        // Not authenticated, show login full-screen
        return <LoginPage />;
    }

    // Authenticated: show nav + routes
    return (
        <>
            <Navigation />
            <Routes>
                <Route path="/" element={<Log />} />
                <Route path="/history" element={<History />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/classes" element={<Classes />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/notify-friends" element={<NotifyFriends />} />
                <Route path="/class-summary" element={<ClassSummary />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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