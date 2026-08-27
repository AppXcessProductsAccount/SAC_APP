import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { 
    Users, 
    CheckCircle, 
    XCircle, 
    Clock,
    CreditCard
} from "lucide-react";

interface Application {
    id: string;
    user_id: string;
    membership_id: string;
    membership_type: string;
    monthly_contribution: number;
    status: string;
    created_at: string;
    membership?: { name: string };
    custom_answers: Record<string, any>;
    interests: string[];
    attended_programs: string[];
}

export default function MembershipApplications() {
    const [searchParams] = useSearchParams();
    const membershipId = searchParams.get("membership_id");
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetchApplications();
    }, [membershipId]);

    const fetchApplications = async () => {
        try {
            const data = await api.admin.memberships.listApplications(membershipId || undefined);
            setApplications(data);
        } catch (err) {
            console.error("Failed to load applications");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await api.admin.memberships.updateStatus(id, status);
            setApplications(applications.map(app => app.id === id ? { ...app, status } : app));
            setMessage(`Application ${status.toLowerCase()} successfully`);
            setTimeout(() => setMessage(""), 3000);
        } catch (err: any) {
            alert(err.message || "Failed to update status");
        }
    };

    if (loading) return <div className="flex justify-center p-12 text-gray-500 font-bold">Loading applications...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-black tracking-tight">Membership Applications</h1>
                    <p className="text-gray-400 font-medium mt-1">Review and manage member join requests.</p>
                </div>
            </div>

            <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Applicant</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Membership</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tier & Contribution</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {applications.map((app) => (
                                <tr key={app.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-black font-bold border border-gray-100">
                                                {app.user_id.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-black">User ID</p>
                                                <p className="text-[10px] font-medium text-gray-400">{app.user_id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-gray-400" />
                                            <p className="text-sm font-bold text-black">{app.membership?.name || "N/A"}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-bold text-black">${app.monthly_contribution}/mo</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{app.membership_type}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            <p className="text-xs font-medium">{new Date(app.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                            app.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-100' :
                                            app.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                            'bg-yellow-50 text-yellow-600 border-yellow-100'
                                        }`}>
                                            <div className={`w-1 h-1 rounded-full ${
                                                app.status === 'Approved' ? 'bg-green-600' :
                                                app.status === 'Rejected' ? 'bg-red-600' : 'bg-yellow-600'
                                            }`}></div>
                                            {app.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            {app.status === 'Pending' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(app.id, 'Approved')}
                                                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(app.id, 'Rejected')}
                                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                        title="Reject"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {applications.length === 0 && (
                    <div className="p-20 text-center">
                        <Users className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-black">No applications found</h3>
                        <p className="text-gray-400 text-sm mt-1">Pending membership requests will appear here.</p>
                    </div>
                )}
            </div>

            {message && (
                <div className="fixed bottom-8 right-8 bg-black text-white px-6 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 font-bold text-sm">
                    {message}
                </div>
            )}
        </div>
    );
}
