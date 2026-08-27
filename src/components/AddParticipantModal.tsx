import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import PhoneField, { isValidPhone, phoneErrorMessage } from "./PhoneField";
import { isValidEmail, emailErrorMessage } from "../lib/email";

interface AddParticipantModalProps {
    open: boolean;
    onClose: () => void;
    /** Called after a successful create so the list can refresh. */
    onCreated: (fullName: string) => void;
}

const EMPTY = {
    full_name: "",
    email: "",
    phone_number: "",
    nickname: "",
    gender: "",
    dob: "",
    occupation: "",
    address: "",
};

export default function AddParticipantModal({ open, onClose, onCreated }: AddParticipantModalProps) {
    const [form, setForm] = useState({ ...EMPTY });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    if (!open) return null;

    const set = (field: keyof typeof EMPTY, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const close = () => {
        if (saving) return;
        setForm({ ...EMPTY });
        setError("");
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!form.full_name.trim()) {
            setError("Enter the participant's full name.");
            return;
        }
        // Mirrors the server rule: both columns are optional, but a participant
        // with neither can never be found or signed in as.
        if (!form.email.trim() && !form.phone_number.trim()) {
            setError("Enter an email address or a phone number.");
            return;
        }

        if (form.phone_number.trim() && !isValidPhone(form.phone_number)) {
            setError(phoneErrorMessage(form.phone_number));
            return;
        }

        /* The server types this as EmailStr and will refuse anything unreachable,
           so catching it here is the difference between a named problem and a
           422 surfacing as "failed to add participant". */
        if (form.email.trim() && !isValidEmail(form.email)) {
            setError(emailErrorMessage(form.email));
            return;
        }

        setSaving(true);
        try {
            // Empty strings would fail the server's EmailStr/date parsing, so send
            // only the fields that were actually filled in.
            const payload: Record<string, string> = { full_name: form.full_name.trim() };
            (["email", "phone_number", "nickname", "gender", "dob", "occupation", "address"] as const)
                .forEach((field) => {
                    const value = form[field].trim();
                    if (value) payload[field] = value;
                });

            await api.admin.users.create(payload);
            const name = form.full_name.trim();
            setForm({ ...EMPTY });
            onCreated(name);
        } catch (err: any) {
            setError(err?.message || "Could not add the participant.");
        } finally {
            setSaving(false);
        }
    };

    const inputClass =
        "w-full px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm text-black " +
        "focus:bg-white focus:ring-4 focus:ring-black/5 focus:border-gray-200 outline-none transition-all";
    const labelClass =
        "block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5";

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={close}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto rounded-lg max-h-[90vh] z-[101]"
                >
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                Add Participant
                            </h2>
                            <button
                                type="button"
                                onClick={close}
                                className="p-1 hover:bg-gray-100 rounded transition-all"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed">
                            The participant is added straight away and does not need to confirm a code.
                            They can sign in later with the email or phone number you enter here.
                        </p>

                        <div>
                            <label className={labelClass}>Full Name</label>
                            <input
                                autoFocus
                                value={form.full_name}
                                onChange={(e) => set("full_name", e.target.value)}
                                className={inputClass}
                                placeholder="Full name"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => set("email", e.target.value)}
                                    className={inputClass}
                                    placeholder="name@example.com"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Phone</label>
                                <PhoneField
                                    value={form.phone_number}
                                    onChange={(v) => set("phone_number", v ?? "")}
                                    placeholder="Phone number"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Nickname</label>
                                <input
                                    value={form.nickname}
                                    onChange={(e) => set("nickname", e.target.value)}
                                    className={inputClass}
                                    placeholder="Optional"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Gender</label>
                                <select
                                    value={form.gender}
                                    onChange={(e) => set("gender", e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">Not specified</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Date of Birth</label>
                                <input
                                    type="date"
                                    value={form.dob}
                                    onChange={(e) => set("dob", e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Occupation</label>
                                <input
                                    value={form.occupation}
                                    onChange={(e) => set("occupation", e.target.value)}
                                    className={inputClass}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Address</label>
                            <textarea
                                value={form.address}
                                onChange={(e) => set("address", e.target.value)}
                                rows={2}
                                className={inputClass}
                                placeholder="Optional"
                            />
                        </div>

                        {error && (
                            <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                                {error}
                            </p>
                        )}

                        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                            <button
                                type="button"
                                onClick={close}
                                disabled={saving}
                                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {saving ? "Adding..." : "Add Participant"}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
