import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { 
    CreditCard, 
    Plus, 
    ArrowRight,
    Search,
    Edit3,
    Trash2,
    Users
} from "lucide-react";

interface Membership {
    id: string;
    name: string;
    is_active: boolean;
    created_at: string;
}

export default function MembershipsList() {
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMemberships();
    }, []);

    const fetchMemberships = async () => {
        try {
            const data = await api.admin.memberships.list();
            setMemberships(data);
        } catch (err) {
            console.error("Failed to load memberships");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            await api.admin.memberships.delete(id);
            setMemberships(memberships.filter(m => m.id !== id));
        } catch (err: any) {
            alert(err.message || "Failed to delete membership");
        }
    };

    if (loading) return <div className="flex justify-center p-12 text-gray-500 font-bold">Loading memberships...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-black tracking-tight">Memberships</h1>
                    <p className="text-gray-400 font-medium mt-1">Configure membership tiers and review applications.</p>
                </div>
                <div className="flex gap-4">
                    <Link 
                        to="/memberships/applications" 
                        className="flex items-center gap-2 px-6 py-3 bg-white text-black border border-gray-100 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <Users className="w-4 h-4" />
                        Applications
                    </Link>
                    <Link 
                        to="/memberships/new" 
                        className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
                    >
                        <Plus className="w-4 h-4" />
                        New Membership
                    </Link>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm max-w-md">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                    <input 
                        type="text" 
                        placeholder="Search memberships..." 
                        className="w-full pl-11 pr-4 py-2 text-sm border-none outline-none text-black font-medium"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {memberships.map((membership) => (
                    <div key={membership.id} className="bg-white rounded-[1.5rem] border border-gray-100 p-8 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all group flex flex-col h-full">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-black font-bold border border-gray-100 group-hover:bg-black group-hover:text-white transition-all">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-black">{membership.name}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Created {new Date(membership.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Link 
                                    to={`/memberships/edit/${membership.id}`}
                                    className="p-2 text-black/40 hover:text-black transition-colors rounded-lg hover:bg-gray-50"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </Link>
                                <button 
                                    onClick={() => handleDelete(membership.id, membership.name)}
                                    className="p-2 text-black/40 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                            <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                membership.is_active 
                                    ? "bg-green-50 text-[#00BA71] border-green-100" 
                                    : "bg-gray-50 text-gray-400 border-gray-100"
                            }`}>
                                <div className={`w-1 h-1 rounded-full ${membership.is_active ? 'bg-[#00BA71]' : 'bg-gray-400'}`}></div>
                                {membership.is_active ? 'Active' : 'Inactive'}
                            </span>
                            
                            <Link 
                                to={`/memberships/applications?membership_id=${membership.id}`}
                                className="flex items-center gap-2 text-black font-bold text-xs hover:gap-3 transition-all"
                            >
                                View Applications
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {memberships.length === 0 && (
                <div className="bg-white rounded-[1.5rem] border border-gray-100 p-20 text-center shadow-sm">
                    <CreditCard className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-black">No memberships created</h3>
                    <p className="text-gray-400 text-sm mt-1">Define your first membership tier to start accepting members.</p>
                </div>
            )}
        </div>
    );
}
