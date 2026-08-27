import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { 
    Calendar, 
    MapPin, 
    Clock, 
    Plus, 
    ArrowRight,
    Search,
    Edit3,
    Trash2
} from "lucide-react";

interface Program {
    id: string;
    program_name?: string;
    city: string;
    address: string;
    class_id: string;
    date_range: string;
    is_active: boolean;
    order_id: number;
    created_at: string;
}

export default function ProgramsList() {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPrograms();
    }, []);

    const fetchPrograms = async () => {
        try {
            const data = await api.admin.programs.list();
            setPrograms(data);
        } catch (err) {
            console.error("Failed to load programs");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (programId: string) => {
        try {
            await api.admin.programs.toggleStatus(programId);
            setPrograms(programs.map(p => p.id === programId ? { ...p, is_active: !p.is_active } : p));
        } catch (err) {
            alert("Failed to update program status");
        }
    };

    const handleDelete = async (programId: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This will permanently remove all registrations for this program.`)) return;
        try {
            await api.admin.programs.delete(programId);
            setPrograms(programs.filter(p => p.id !== programId));
        } catch (err: any) {
            alert(err.message || "Failed to delete program");
        }
    };

    if (loading) return <div className="flex justify-center p-12 text-gray-500">Loading programs...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-black">Programs</h1>
                    <p className="text-gray-400 font-medium mt-1">Manage class schedules and registration status.</p>
                </div>
                <Link 
                    to="/programs/new" 
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
                >
                    <Plus className="w-4 h-4" />
                    New Program
                </Link>
            </div>

            <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm max-w-md">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                    <input 
                        type="text" 
                        placeholder="Search locations..." 
                        className="w-full pl-11 pr-4 py-2 text-sm border-none outline-none text-black font-medium"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {programs.map((program) => (
                    <div key={program.id} className="bg-white rounded-[1.5rem] border border-gray-100 p-8 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all group flex flex-col h-full">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-black font-bold border border-gray-100 group-hover:bg-black group-hover:text-white transition-all">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-black">{program.program_name || program.city}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{program.class_id} {program.program_name && `• ${program.city}`}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Link 
                                    to={`/programs/edit/${program.id}`}
                                    className="p-2 text-black/40 hover:text-black transition-colors rounded-lg hover:bg-gray-50"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </Link>
                                <button 
                                    onClick={() => handleDelete(program.id, program.program_name || program.city)}
                                    className="p-2 text-black/40 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="flex gap-3 text-black/60">
                                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-medium leading-relaxed line-clamp-2">{program.address}</p>
                            </div>
                            <div className="flex gap-3 text-black/60">
                                <Clock className="w-4 h-4 flex-shrink-0" />
                                <p className="text-xs font-bold text-black">{program.date_range}</p>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                            <button 
                                onClick={() => handleToggleStatus(program.id)}
                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                    program.is_active 
                                        ? "bg-green-50 text-[#00BA71] border-green-100" 
                                        : "bg-gray-50 text-gray-400 border-gray-100"
                                }`}
                            >
                                <div className={`w-1 h-1 rounded-full ${program.is_active ? 'bg-[#00BA71]' : 'bg-gray-400'}`}></div>
                                {program.is_active ? 'Open' : 'Closed'}
                            </button>
                            
                            <Link 
                                to={`/programs/${program.id}`}
                                className="flex items-center gap-2 text-black font-bold text-xs hover:gap-3 transition-all"
                            >
                                Registrants
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {programs.length === 0 && (
                <div className="bg-white rounded-[1.5rem] border border-gray-100 p-20 text-center shadow-sm">
                    <Calendar className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-black">No programs created</h3>
                    <p className="text-gray-400 text-sm mt-1">Start by launching your first meditation program.</p>
                </div>
            )}
        </div>
    );
}
