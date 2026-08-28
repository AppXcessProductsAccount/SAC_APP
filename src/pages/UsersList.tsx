import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { 
    Search, 
    Filter, 
    UserPlus,
    Shield,
    BadgeCheck,
    ChevronRight
} from "lucide-react";
import UserDetailsModal from "../components/UserDetailsModal";
import AddParticipantModal from "../components/AddParticipantModal";

interface User {
    id: string;
    full_name: string;
    nickname?: string;
    email: string;
    phone_number?: string;
    role: string;
    gender?: string;
    dob?: string;
    age?: number;
    occupation?: string;
    address?: string;
    is_active: boolean;
    is_verified: boolean;
    profile_image_url?: string;
    created_at: string;
}

export default function UsersList() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    /* Seeded from ?q=, which is how the header's global search hands a term
       over: People have no detail route, so a hit navigates here and this page
       does the filtering it already knows how to do. */
    const [searchQuery, setSearchQuery] = useState(
        () => new URLSearchParams(window.location.search).get("q") ?? "",
    );
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [notice, setNotice] = useState("");
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(searchQuery);
        }, 300); // 300ms debounce
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchUsers = async (q?: string) => {
        try {
            setLoading(true);
            const data = await api.admin.users.list(q);
            setUsers(data);
        } catch (err) {
            console.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const handlePromote = async (userId: string, name: string) => {
        if (!confirm(`Are you sure you want to promote ${name} to ADMIN?`)) return;
        try {
            await api.admin.users.promote(userId);
            setUsers(users.map(u => u.id === userId ? { ...u, role: "ADMIN" } : u));
        } catch (err: any) {
            alert(err.message || "Failed to promote user");
        }
    };

    if (loading) return <div className="flex justify-center p-12 text-gray-500">Loading users...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-black">Participants</h1>
                    <p className="text-gray-400 font-medium mt-1">Detailed view and management of members.</p>
                </div>
                <button
                    onClick={() => setAddOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
                >
                    <UserPlus className="w-4 h-4" />
                    Add Participant
                </button>
            </div>

            {notice && (
                <div className="px-6 py-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-bold">
                    {notice}
                </div>
            )}

            <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between gap-4">
                    <div className="flex-1 max-w-md relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                        <input 
                            type="text" 
                            placeholder="Search by name, email or phone..." 
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-transparent rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-black/5 focus:border-gray-200 outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 hover:text-black hover:bg-gray-100 transition-all">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 text-left border-b border-gray-50">
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Participant</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Verification</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Joined</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/30 transition-colors group cursor-pointer" onClick={() => setSelectedUser(user)}>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-black font-bold border border-gray-200 overflow-hidden">
                                                {user.profile_image_url ? (
                                                    <img src={user.profile_image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    user.full_name[0]
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-black">{user.full_name}</p>
                                                <p className="text-xs text-gray-400 font-medium">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <Shield className={`w-3.5 h-3.5 ${user.role !== 'USER' ? 'text-[#00BA71]' : 'text-black/30'}`} />
                                            <span className={`text-xs font-bold ${user.role === "SUPER_ADMIN" ? "text-black" : "text-gray-600"}`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            {user.is_verified ? (
                                                <BadgeCheck className="w-4 h-4 text-blue-500" />
                                            ) : (
                                                <div className="w-4 h-4 border-2 border-gray-200 rounded-full"></div>
                                            )}
                                            <span className="text-xs font-bold text-gray-500">{user.is_verified ? 'Verified' : 'Pending'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-sm font-bold text-gray-400">
                                        {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                onClick={() => setSelectedUser(user)}
                                                className="px-4 py-1.5 bg-gray-50 border border-gray-100 text-black rounded-lg text-[10px] font-bold hover:bg-black hover:text-white transition-all flex items-center gap-2"
                                            >
                                                Details
                                                <ChevronRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddParticipantModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onCreated={(name) => {
                    setAddOpen(false);
                    setNotice(`${name} was added.`);
                    // Re-run the current search so the new row appears in context.
                    fetchUsers(searchQuery);
                    setTimeout(() => setNotice(""), 4000);
                }}
            />

            {/* User Details Modal */}
            <UserDetailsModal 
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
                onPromote={handlePromote}
                currentUserRole={currentUser.role}
            />
        </div>
    );
}
