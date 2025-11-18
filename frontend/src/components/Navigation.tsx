import { Settings, Users, FileText, UserPlus, Bell, History } from "lucide-react";
import {NavLink} from "./NavLink.tsx";

const Navigation = () => {
    const navItems = [
        { name: "Settings", path: "/settings", icon: Settings },
        { name: "Classes", path: "/classes", icon: Users },
        { name: "Log", path: "/", icon: FileText },
        { name: "History", path: "/history", icon: History },
        { name: "Friends", path: "/friends", icon: UserPlus },
        { name: "Notifications", path: "/notifications", icon: Bell },
    ];

    return (
        <nav className="bg-card border-b border-border shadow-sm">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-center gap-1 py-3">
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
            </div>
        </nav>
    );
};

export default Navigation;
