import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Log from "./pages/Log";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Classes from "./pages/Classes";
import Friends from "./pages/Friends";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <BrowserRouter>
            <Navigation />
            <Routes>
                <Route path="/" element={<Log />} />
                <Route path="/history" element={<History />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/classes" element={<Classes />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/notifications" element={<Notifications />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    </QueryClientProvider>
);

export default App;
