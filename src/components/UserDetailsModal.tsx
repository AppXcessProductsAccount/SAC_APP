import { motion, AnimatePresence } from "framer-motion";
import { X, BadgeCheck } from "lucide-react";

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

interface UserDetailsModalProps {
    user: User | null;
    onClose: () => void;
    onPromote?: (userId: string, name: string) => void;
    currentUserRole?: string;
}

export default function UserDetailsModal({ user, onClose, onPromote, currentUserRole }: UserDetailsModalProps) {
    if (!user) return null;

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
                    className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto rounded-lg max-h-[90vh] z-[101]"
                >
                    <div className="p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">User Information</h2>
                            <button 
                                onClick={onClose}
                                className="p-1 hover:bg-gray-100 rounded transition-all"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 p-3 bg-gray-50 border border-gray-100 rounded">
                            <div className="w-12 h-12 rounded bg-white border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">
                                {user.profile_image_url ? (
                                    <img src={user.profile_image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-lg font-bold text-black">{user.full_name[0]}</div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-black truncate">{user.full_name}</h3>
                                    {user.is_verified && <BadgeCheck className="w-3 h-3 text-blue-500" />}
                                </div>
                                <p className="text-xs text-gray-400 font-medium truncate">{user.email}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-px bg-gray-100 border border-gray-100 rounded overflow-hidden">
                            <RectDetail label="Nickname" value={user.nickname || "-"} />
                            <RectDetail label="Phone" value={user.phone_number || "-"} />
                            <RectDetail label="Gender" value={user.gender || "-"} />
                            <RectDetail label="Occupation" value={user.occupation || "-"} />
                            <RectDetail label="Birthday" value={user.dob ? `${user.dob} (${user.age}y)` : "-"} />
                            <RectDetail label="Role" value={user.role} />
                            <RectDetail label="Account" value={user.is_active ? 'Active' : 'Inactive'} />
                            <RectDetail label="Verified" value={user.is_verified ? 'Yes' : 'No'} />
                        </div>

                        <div className="p-3 bg-gray-50 border border-gray-100 rounded">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Residential Address</p>
                            <p className="text-xs font-medium text-black leading-relaxed">{user.address || "No address provided"}</p>
                        </div>

                        <div className="flex gap-2 pt-2">
                            {currentUserRole === "SUPER_ADMIN" && user.role === "USER" && onPromote && (
                                <button 
                                    onClick={() => onPromote(user.id, user.full_name)}
                                    className="flex-1 py-2 bg-black text-white rounded font-bold text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md"
                                >
                                    Promote
                                </button>
                            )}
                            <button 
                                onClick={onClose}
                                className="flex-1 py-2 bg-gray-100 text-black rounded font-bold text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all border border-gray-200"
                            >
                                Close
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
