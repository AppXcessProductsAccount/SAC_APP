import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, ShieldAlert, Phone, Globe, Info, CreditCard } from "lucide-react";

interface Registration {
    id: string;
    user_id: string;
    program_id: string;
    nric_last_4: string;
    preferred_language: string;
    meal_preference: string;
    health_issues: string;
    referred_by: string;
    introducer_name?: string;
    introducer_phone?: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    emergency_contact_relation: string;
    discovery_source: string;
    status: string;
    amount_paid: number;
    balance_amount: number;
    payment_status: string;
    due_date?: string;
    payment_url?: string;
    payment_request_id?: string;
    hitpay_payment_id?: string;
    currency?: string;
    created_at: string;
}

interface RegistrationDetailsModalProps {
    registration: Registration | null;
    onClose: () => void;
}

export default function RegistrationDetailsModal({ registration, onClose }: RegistrationDetailsModalProps) {
    if (!registration) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="relative w-full max-w-5xl bg-white shadow-2xl overflow-y-auto rounded-lg max-h-[90vh] z-[101]"
                >
                    <div className="p-8 space-y-8">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Registration Profile</h2>
                                <h1 className="text-xl font-bold text-black mt-1">Full Record Details</h1>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column: Basic Info & Health */}
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Info className="w-3 h-3" />
                                        Personal Preferences
                                    </h3>
                                    <div className="grid grid-cols-1 gap-px bg-gray-100 border border-gray-100 rounded overflow-hidden shadow-sm">
                                        <RectDetail label="Preferred Language" value={registration.preferred_language} />
                                        <RectDetail label="Meal Preference" value={registration.meal_preference} />
                                        <RectDetail label="NRIC (Last 4)" value={registration.nric_last_4} />
                                        <RectDetail label="Status" value={registration.status} />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Heart className="w-3 h-3 text-red-500" />
                                        Health Information
                                    </h3>
                                    <div className="p-4 bg-red-50/30 border border-red-100 rounded-xl text-xs font-bold text-red-900 leading-relaxed min-h-[100px]">
                                        {registration.health_issues || "No health issues reported."}
                                    </div>
                                </div>
                            </div>

                            {/* Middle Column: Payment & Marketing */}
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <CreditCard className="w-3 h-3" />
                                        Payment Summary
                                    </h3>
                                    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100">
                                        <div className="grid grid-cols-2 divide-x divide-gray-100">
                                            <div className="p-4">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Amount Paid</p>
                                                <p className="text-sm font-bold text-green-600 mt-1">{registration.currency || "RM"} {registration.amount_paid.toFixed(2)}</p>
                                            </div>
                                            <div className="p-4">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Balance Due</p>
                                                <p className={`text-sm font-bold mt-1 ${registration.balance_amount > 0 ? "text-red-600" : "text-gray-300"}`}>
                                                    {registration.currency || "RM"} {registration.balance_amount.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 divide-x divide-gray-100">
                                            <div className="p-4">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Payment Status</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className={`w-2 h-2 rounded-full ${
                                                        registration.payment_status === 'Completed' ? 'bg-green-500' : 
                                                        registration.payment_status === 'Partial' ? 'bg-orange-500' : 'bg-gray-300'
                                                    }`} />
                                                    <p className="text-xs font-bold text-black">{registration.payment_status}</p>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Due Date</p>
                                                <p className="text-xs font-bold text-black mt-1">
                                                    {registration.due_date ? new Date(registration.due_date).toLocaleDateString() : "NA"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Globe className="w-3 h-3" />
                                        Source & Referrals
                                    </h3>
                                    <div className="grid grid-cols-1 gap-px bg-gray-100 border border-gray-100 rounded overflow-hidden shadow-sm">
                                        <RectDetail label="Discovery Source" value={registration.discovery_source} />
                                        <RectDetail label="Referred By" value={registration.referred_by || "-"} />
                                    </div>
                                    {registration.discovery_source === "Introducer" && (
                                        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Introducer Details</p>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400">NAME</p>
                                                    <p className="text-xs font-bold text-black">{registration.introducer_name || "Not provided"}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-gray-400">PHONE</p>
                                                    <p className="text-xs font-bold text-black">{registration.introducer_phone || "Not provided"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Emergency & System */}
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <ShieldAlert className="w-3 h-3" />
                                        Emergency Contact
                                    </h3>
                                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-4 shadow-sm">
                                        <div className="flex justify-between">
                                            <div>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Contact Name</p>
                                                <p className="text-xs font-bold text-black">{registration.emergency_contact_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Relation</p>
                                                <p className="text-xs font-bold text-gray-600">{registration.emergency_contact_relation}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                                            <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center">
                                                <Phone className="w-3.5 h-3.5 text-black" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</p>
                                                <p className="text-xs font-bold text-black">{registration.emergency_contact_phone}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Info className="w-3 h-3" />
                                        Technical Metadata
                                    </h3>
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 text-[10px]">
                                        <div className="p-3 flex justify-between">
                                            <span className="font-bold text-gray-400 uppercase tracking-widest">Applied On</span>
                                            <span className="font-bold text-black">{new Date(registration.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="p-3">
                                            <p className="font-bold text-gray-400 uppercase tracking-widest mb-1">Registration ID</p>
                                            <p className="font-mono text-gray-600 break-all">{registration.id}</p>
                                        </div>
                                        {registration.payment_request_id && (
                                            <div className="p-3">
                                                <p className="font-bold text-gray-400 uppercase tracking-widest mb-1">Payment ID</p>
                                                <p className="font-mono text-gray-600 break-all">{registration.payment_request_id}</p>
                                            </div>
                                        )}
                                        {registration.payment_url && (
                                            <div className="p-3">
                                                <p className="font-bold text-gray-400 uppercase tracking-widest mb-1">Checkout Link</p>
                                                <a href={registration.payment_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all block">View Portal</a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-50">
                            <button 
                                onClick={onClose}
                                className="w-full py-4 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
                            >
                                Close Record
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function RectDetail({ label, value }: { label: string, value: string }) {
    return (
        <div className="p-3 bg-white">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-xs font-bold text-black truncate">{value}</p>
        </div>
    );
}
