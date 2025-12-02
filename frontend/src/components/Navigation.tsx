import { Settings, Users, FileText, UserPlus, Bell, History, LogOut } from "lucide-react";
import { NavLink } from "./NavLink";
import { useAuth } from "../auth/AuthContext";
import type { ComponentType, SVGProps } from "react";

type NavItem = {
    name: string;
    path: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    // Optional list of roles that can see this tab
    roles?: ("student" | "professor")[];
};

const navItems: NavItem[] = [
    { name: "Settings", path: "/settings", icon: Settings },
    { name: "Classes", path: "/classes", icon: Users },
    { name: "Log", path: "/", icon: FileText },
    { name: "History", path: "/history", icon: History },
    { name: "Friends", path: "/friends", icon: UserPlus },
    { name: "Notify Friends", path: "/notify-friends", icon: Bell },
    // Only professors see this tab
    { name: "Class Summary", path: "/class-summary", icon: Users, roles: ["professor"] },
];

const Navigation = () => {
    const { logout, userRole } = useAuth();

    // Filter items by role (if roles is defined, only show for those roles)
    const visibleItems = navItems.filter((item) => {
        if (!item.roles || item.roles.length === 0) return true;
        if (!userRole) return false;
        return item.roles.includes(userRole as "student" | "professor");
    });

    return (
        <nav className="bg-card border-b border-border shadow-sm">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between py-3 gap-2">
                    {/* Left: nav links */}
                    <div className="flex items-center justify-center gap-1">
                        {visibleItems.map((item) => (
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

                    {/* Right: logout button */}
                    <button
                        type="button"
                        onClick={logout}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all text-sm"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;