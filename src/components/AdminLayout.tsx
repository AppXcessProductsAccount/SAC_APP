import { Link, useLocation, useNavigate } from "react-router-dom";
import React from "react";
import {
    LayoutDashboard,
    Users,
    Calendar,
    Layers,
    LogOut,
    Settings,
    Mail,
    CreditCard
} from "lucide-react";
import { clearSession } from "../lib/session";
import { useSettings } from "../lib/settings";
import NotificationBell from "./NotificationBell";
import GlobalSearch from "./GlobalSearch";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname;

    const handleLogout = () => {
        // clearSession, not two removeItem calls: logging out must drop the refresh
        // token too, or the next visitor's first 401 would silently sign them back in.
        clearSession();
        navigate("/login");
    };

    /* A corrupt "user" entry used to take the whole panel down here, before any
       route rendered — there is nothing to show but the header, so fall back to an
       empty object and let the name area render blank. */
    let user: Record<string, any> = {};
    try {
        user = JSON.parse(localStorage.getItem("user") || "{}") || {};
    } catch {
        user = {};
    }

    const { settings } = useSettings();

    const menuItems = [
        { label: "Dashboard", icon: LayoutDashboard, path: "/" },
        { label: "Users", icon: Users, path: "/users" },
        { label: "Programs", icon: Calendar, path: "/programs" },
        { label: "Memberships", icon: CreditCard, path: "/memberships" },
        { label: "Enquiries", icon: Mail, path: "/enquiries" },
        { label: "Website", icon: Layers, path: "/cms/pages" },
        { label: "Settings", icon: Settings, path: "/settings" },
    ];

    return (
        <div className="flex min-h-screen bg-[#F7F7F7]">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col sticky top-0 h-screen z-20">
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
                            <Layers className="w-5 h-5" />
                        </div>
                        {/* The fallback is a neutral word, not the agency's name:
                            it shows on every install whose settings have no
                            organisation name yet, which is not the vendor's. */}
                        <h2 className="text-xl font-bold tracking-tight text-black truncate">
                            {settings.organisation_name || "Console"}
                        </h2>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.path === "/"
                            ? pathname === "/"
                            : pathname.startsWith(item.path);

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold group ${isActive
                                        ? "bg-gray-100 text-black shadow-sm"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-black"
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? "text-black" : "text-black/70 group-hover:text-black"}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-50">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                        <LogOut className="w-5 h-5 text-black/70 group-hover:text-red-600" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                {/* z-30, not z-10. Page content routinely carries z-10 of its own
                    (the delete badge on a CMS list item, for one), and on equal
                    z-index the later element in the DOM wins - so scrolling a
                    section editor sent a lone red ✕ floating across the header.
                    The header outranks page content and stays under the modals. */}
                <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-12 sticky top-0 z-30">
                    <div className="flex items-center flex-1 max-w-md">
                        <GlobalSearch />
                    </div>

                    <div className="flex items-center gap-6">
                        <NotificationBell />

                        <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
                            <Link to="/settings" className="flex items-center gap-3 group">
                                <div className="text-right">
                                    <p className="text-sm font-bold text-black group-hover:text-[#101848] transition-colors">
                                        {user.full_name}
                                    </p>
                                    <p className="text-xs text-gray-400 font-medium">
                                        {user.role === "SUPER_ADMIN" ? "Super Admin" : "Administrator"}
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-black font-bold border border-gray-200 overflow-hidden group-hover:border-[#101848] transition-colors">
                                    {user.profile_image_url ? (
                                        <img src={user.profile_image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        user.full_name?.[0]
                                    )}
                                </div>
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="p-12">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
