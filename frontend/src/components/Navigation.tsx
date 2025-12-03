import { Settings, Users, FileText, UserPlus, Bell, History, LogOut } from "lucide-react";
import { NavLink } from "./NavLink";
import { useAuth } from "../auth/AuthContext";

const Navigation = () => {
    const { logout, userRole } = useAuth();

    const navItems = [
        { name: "Settings", path: "/settings", icon: Settings },

        // Student-only
        ...(userRole === "student"
            ? [{ name: "Classes", path: "/classes", icon: Users }]
            : []),

        { name: "Log", path: "/", icon: FileText },
        { name: "History", path: "/history", icon: History },
        { name: "Friends", path: "/friends", icon: UserPlus },
        { name: "Notify Friends", path: "/notify-friends", icon: Bell },

        // Professor-only
        ...(userRole === "professor"
            ? [
                { name: "Class Summary", path: "/class-summary", icon: Users },
                { name: "Add a New Class", path: "/add-class", icon: Users },
            ]
            : []),
    ];


    return (
        <nav className="bg-card border-b border-border shadow-sm">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between py-3 gap-3">
                    {/* Center nav items */}
                    <div className="flex-1 flex items-center justify-center gap-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                                activeClassName="text-primary bg-accent font-medium"
                            >
                                <item.icon className="h-4 w-4" />
                                <span className="hidden sm:inline">{item.name}</span>
                            </NavLink>
                        ))}
                    </div>

                    {/* Logout button on the right */}
                    <button
                        type="button"
                        onClick={logout}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-destructive border border-destructive/40 bg-destructive/5 hover:bg-destructive/10 transition-all"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Log out</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;