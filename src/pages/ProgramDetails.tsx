import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

import UserDetailsModal from "../components/UserDetailsModal";
import RegistrationDetailsModal from "../components/RegistrationDetailsModal";
import { ExternalLink, Download, FileText } from "lucide-react";

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

/** Only the user fields the export sheet needs; the endpoint returns more. */
interface ExportUser {
    id: string;
    full_name?: string;
    email?: string;
    phone_number?: string;
    gender?: string;
    age?: number;
    occupation?: string;
    address?: string;
}

/** One sheet row. Values stay typed so numbers and dates reach Excel as such. */
type ExportRow = Record<string, string | number | Date>;

interface ProgramDetails {
    id: string;
    city: string;
    address: string;
    class_id: string;
    date_range: string;
    is_active: boolean;
    currency: string;
    registrations: Registration[];
}

export default function ProgramDetails() {
    const { program_id } = useParams();
    const navigate = useNavigate();
    const [program, setProgram] = useState<ProgramDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
    const [fetchingUser, setFetchingUser] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (program_id) fetchDetails();
    }, [program_id]);

    const fetchDetails = async () => {
        try {
            const data = await api.admin.programs.get(program_id!);
            setProgram(data);
        } catch (err) {
            setError("Failed to load program details");
        } finally {
            setLoading(false);
        }
    };

    const handleViewUser = async (userId: string) => {
        try {
            setFetchingUser(true);
            // We use the search API to find the user by their ID
            const users = await api.admin.users.list(userId);
            if (users && users.length > 0) {
                setSelectedUser(users[0]);
            } else {
                alert("User details not found");
            }
        } catch (err) {
            alert("Failed to load user profile");
        } finally {
            setFetchingUser(false);
        }
    };

    /* A date Excel can sort and filter, not a string that looks like one. An
       unparseable value is passed through as text rather than becoming
       "Invalid Date" in the sheet. */
    const asDate = (value?: string) => {
        if (!value) return "";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date;
    };

    const handleExport = async () => {
        if (!program || program.registrations.length === 0) return;

        setExporting(true);
        try {
            /* Loaded on the press, not with the page. The workbook writer is
               ~430kB minified - a third of the whole admin bundle - and only
               this one button ever needs it, so it stays out of the initial
               download for every screen that does not export. */
            const XLSX = await import("xlsx");
            /* The table shows a user id because a name costs a lookup. An export
               of ids is not a register anybody can use, so names, emails and
               phone numbers are joined in here - one request for the whole user
               list, indexed by id, rather than one request per registrant. A
               failure is not fatal: the sheet is still worth having without the
               contact columns filled in. */
            const byUserId = new Map<string, ExportUser>();
            try {
                const users = (await api.admin.users.list()) as ExportUser[] | null;
                for (const user of users ?? []) byUserId.set(String(user.id), user);
            } catch {
                console.warn("Export: user lookup failed, writing registration fields only");
            }

            const rows: ExportRow[] = program.registrations.map((reg) => {
                const user = byUserId.get(String(reg.user_id));
                return {
                    "Name": user?.full_name ?? "",
                    "Email": user?.email ?? "",
                    "Phone": user?.phone_number ?? "",
                    "Gender": user?.gender ?? "",
                    "Age": user?.age ?? "",
                    "Occupation": user?.occupation ?? "",
                    "Address": user?.address ?? "",
                    "NRIC (Last 4)": reg.nric_last_4 ?? "",
                    "Preferred Language": reg.preferred_language ?? "",
                    "Meal Preference": reg.meal_preference ?? "",
                    "Health Issues": reg.health_issues ?? "",
                    "Emergency Contact": reg.emergency_contact_name ?? "",
                    "Emergency Phone": reg.emergency_contact_phone ?? "",
                    "Emergency Relation": reg.emergency_contact_relation ?? "",
                    "Referred By": reg.referred_by ?? "",
                    "Introducer Name": reg.introducer_name ?? "",
                    "Introducer Phone": reg.introducer_phone ?? "",
                    "Discovery Source": reg.discovery_source ?? "",
                    "Status": reg.status ?? "",
                    "Payment Status": reg.payment_status ?? "",
                    "Currency": reg.currency ?? program.currency ?? "",
                    /* Numbers, not pre-formatted strings, so the columns total
                       in Excel. */
                    "Amount Paid": reg.amount_paid ?? 0,
                    "Balance": reg.balance_amount ?? 0,
                    "Due Date": asDate(reg.due_date),
                    "Applied": asDate(reg.created_at),
                    "HitPay Payment ID": reg.hitpay_payment_id ?? "",
                    "Payment Request ID": reg.payment_request_id ?? "",
                    "Registration ID": reg.id ?? "",
                    "User ID": reg.user_id ?? "",
                };
            });

            const sheet = XLSX.utils.json_to_sheet(rows, { cellDates: true });
            /* Widths from the longest value in each column, so the sheet opens
               readable instead of as a wall of ####. Capped so a long address
               cannot push the payment columns off the screen. */
            const headers = Object.keys(rows[0]);
            sheet["!cols"] = headers.map((header) => ({
                wch: Math.min(
                    40,
                    Math.max(header.length + 2, ...rows.map((row) => String(row[header] ?? "").length + 2))
                ),
            }));
            sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: rows.length } }) };
            sheet["!freeze"] = "A2";

            const book = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(book, sheet, "Registrants");

            /* Excel rejects \ / ? * [ ] : in a filename, and the city or class id
               is free text from the admin, so anything outside a safe set goes. */
            const slug = (value: string) => (value || "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
            const stamp = new Date().toISOString().slice(0, 10);
            const name = ["registrants", slug(program.class_id), slug(program.city), stamp].filter(Boolean).join("-");
            XLSX.writeFile(book, `${name}.xlsx`);
        } catch (err) {
            console.error(err);
            alert("Failed to export the registrant list");
        } finally {
            setExporting(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12 text-gray-500">Loading details...</div>;
    if (!program) return <div className="text-center p-12 text-red-500">{error || "Program not found"}</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <button 
                        onClick={() => navigate("/programs")}
                        className="flex items-center gap-2 text-gray-400 hover:text-[#101848] font-bold text-sm mb-4 transition-colors"
                    >
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Programs
                    </button>
                    <div className="flex items-center gap-4 mb-2">
                        <h1 className="text-4xl font-serif font-bold text-[#101848] tracking-tight">{program.city}</h1>
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100 uppercase tracking-widest">{program.class_id}</span>
                    </div>
                    <p className="text-black text-lg flex items-center gap-2">
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {program.date_range}
                    </p>
                </div>
                <div className="flex items-center gap-6 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="text-center px-4 border-r border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Registrants</p>
                        <p className="text-3xl font-serif font-bold text-[#101848]">{program.registrations.length}</p>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${program.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                            {program.is_active ? 'Active' : 'Closed'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-[#101848]">Registrant List</h2>
                    {/* This button had no onClick at all - it looked like an export
                        and did nothing when pressed. Disabled on an empty program
                        rather than handing back a sheet with only headings. */}
                    <button
                        onClick={handleExport}
                        disabled={exporting || program.registrations.length === 0}
                        title={program.registrations.length === 0 ? "No registrants to export" : "Download as an Excel workbook"}
                        className="text-sm font-bold text-black hover:text-gray-600 transition-colors flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-black"
                    >
                        <Download className={`w-4 h-4 ${exporting ? "animate-pulse" : ""}`} />
                        {exporting ? "Preparing..." : "Export Excel"}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 text-left">
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Registrant</th>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">NRIC (Last 4)</th>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Language</th>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Meal Preference</th>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Payment</th>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Applied</th>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {program.registrations.map((reg) => (
                                <tr key={reg.id} className="hover:bg-gray-50/30 transition-colors">
                                    <td className="px-8 py-6">
                                        <button 
                                            onClick={() => handleViewUser(reg.user_id)}
                                            className="group flex flex-col text-left"
                                            disabled={fetchingUser}
                                        >
                                            <div className="font-bold text-black flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                                                #{reg.user_id.toString().substring(0, 8)}
                                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" />
                                            </div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Click to view profile</div>
                                        </button>
                                    </td>
                                    <td className="px-8 py-6 text-sm font-bold text-gray-600">
                                        •••• {reg.nric_last_4}
                                    </td>
                                    <td className="px-8 py-6 text-sm font-medium text-gray-600">
                                        {reg.preferred_language}
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                            reg.meal_preference === 'VEGETARIAN' 
                                                ? 'bg-green-50 text-green-600' 
                                                : 'bg-orange-50 text-orange-600'
                                        }`}>
                                            {reg.meal_preference}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                            reg.status === 'CONFIRMED' 
                                                ? 'bg-blue-50 text-blue-600' 
                                                : 'bg-yellow-50 text-yellow-600'
                                        }`}>
                                            {reg.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className="text-xs font-bold text-black">{program.currency} {reg.amount_paid.toFixed(2)}</p>
                                        <p className={`text-[10px] font-bold uppercase ${reg.balance_amount > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                                            {reg.balance_amount > 0 ? `Bal: ${program.currency} ${reg.balance_amount.toFixed(2)}` : 'Paid'}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6 text-sm text-gray-500 font-medium whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span>{new Date(reg.created_at).toLocaleDateString()}</span>
                                            <span className="text-[10px] text-gray-300">{new Date(reg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex justify-end">
                                            <button 
                                                onClick={() => setSelectedRegistration(reg)}
                                                className="px-4 py-1.5 bg-gray-50 border border-gray-100 text-black rounded text-[10px] font-bold hover:bg-black hover:text-white transition-all flex items-center gap-2 uppercase tracking-widest"
                                            >
                                                <FileText className="w-3 h-3" />
                                                More Details
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {program.registrations.length === 0 && (
                    <div className="p-20 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-[#101848]">No registrations yet</h3>
                        <p className="text-gray-400 mt-1">When participants sign up, they will appear here.</p>
                    </div>
                )}
            </div>

            <UserDetailsModal 
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
            />

            <RegistrationDetailsModal 
                registration={selectedRegistration ? { ...selectedRegistration, currency: program?.currency } : null}
                onClose={() => setSelectedRegistration(null)}
            />
        </div>
    );
}
