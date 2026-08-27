import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { 
    Mail, 
    Phone, 
    MapPin, 
    MessageSquare,
    Search,
    Loader2,
    Clock,
    ChevronRight
} from "lucide-react";

interface ContactSubmission {
    id: number;
    full_name: string;
    phone: string | null;
    email: string;
    address: string | null;
    subject: string | null;
    message: string;
    created_at: string;
}

export default function ContactSubmissions() {
    const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const fetchSubmissions = async () => {
        try {
            const data = await api.contacts.list();
            setSubmissions(data);
        } catch (err) {
            setError("Failed to load submissions");
        } finally {
            setLoading(false);
        }
    };

    const filteredSubmissions = submissions.filter(s => 
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.message.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-black animate-spin" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Accessing enquiry logs...</p>
        </div>
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-black">Contact Enquiries</h1>
                    <p className="text-gray-400 font-medium mt-1">Review and manage messages from your community.</p>
                </div>
                
                <div className="relative group w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                    <input 
                        type="text"
                        placeholder="Search by name, email or message..."
                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-black/5 outline-none transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-3">
                    <span className="text-sm font-bold">{error}</span>
                </div>
            )}

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">Sender Info</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">Subject & Message Preview</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">Received At</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredSubmissions.map((s) => (
                                <tr key={s.id} className="group hover:bg-gray-50/30 transition-all cursor-pointer" onClick={() => setSelectedSubmission(s)}>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-black font-bold border border-gray-100 group-hover:bg-black group-hover:text-white transition-all">
                                                {s.full_name[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-black">{s.full_name}</p>
                                                <p className="text-xs text-gray-400 font-medium">{s.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 max-w-md">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-black truncate">{s.subject || "No Subject"}</p>
                                            <p className="text-xs text-gray-400 line-clamp-1">{s.message}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                                            <Clock className="w-3.5 h-3.5 text-gray-300" />
                                            {formatDate(s.created_at)}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="p-2 bg-gray-50 text-gray-400 group-hover:text-black group-hover:bg-white group-hover:shadow-md rounded-lg transition-all">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredSubmissions.length === 0 && (
                    <div className="py-24 text-center space-y-4">
                        <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto">
                            <Mail className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-black">No enquiries found</h3>
                            <p className="text-gray-400 max-w-xs mx-auto text-sm mt-1">Wait for your community to reach out or adjust your search.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Detailed View Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-10 space-y-8">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-black rounded-[1.5rem] flex items-center justify-center text-white text-2xl font-bold">
                                        {selectedSubmission.full_name[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-black">{selectedSubmission.full_name}</h3>
                                        <p className="text-gray-400 font-medium">{selectedSubmission.email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Received On</p>
                                    <p className="text-sm font-bold text-black">{formatDate(selectedSubmission.created_at)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 p-6 bg-gray-50 rounded-[2rem]">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Phone className="w-3 h-3" /> Phone
                                    </p>
                                    <p className="text-sm font-bold text-black">{selectedSubmission.phone || "Not provided"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin className="w-3 h-3" /> Address
                                    </p>
                                    <p className="text-sm font-bold text-black">{selectedSubmission.address || "Not provided"}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <MessageSquare className="w-3 h-3" /> Subject
                                    </p>
                                    <h4 className="text-lg font-bold text-black">{selectedSubmission.subject || "General Enquiry"}</h4>
                                </div>
                                <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 min-h-[150px]">
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedSubmission.message}</p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setSelectedSubmission(null)}
                                className="w-full py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl shadow-black/20"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
