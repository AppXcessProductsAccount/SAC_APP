import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { 
    CreditCard, 
    ChevronLeft, 
    Save, 
    Plus, 
    Trash2,
    CheckCircle2
} from "lucide-react";

export default function CreateMembership() {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        is_active: true,
        attended_programs_options: ["7DTJ", "Enhance Prosperity and Abundance", "Soul Nourishment Conference", "Being With Guru", "Dark Side Conference", "Other"],
        membership_types: [
            { name: "Principle", price: 25, allow_donation: true, description: "Standard principle membership." },
            { name: "Associate", price: 15, allow_donation: false, description: "Applicable only for immediate family members of active Principle members, housewives or retirees." },
            { name: "Student", price: 15, allow_donation: false, description: "For full-time students." }
        ],
        custom_questions: [
            { question: "Let us know how much you will like to contribute monthly.", type: "text" }
        ],
        interest_options: ["Movies", "Dance & Music", "Singing", "Sports", "Hiking", "Yoga", "Healthy Cooking", "Spiritual Retreats", "Educational Courses", "Technology Courses", "Motivational Talks", "Public Speaking", "Spiritual Talks", "Other"],
        terms_and_conditions: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.admin.memberships.create(formData);
            navigate("/memberships");
        } catch (err: any) {
            alert(err.message || "Failed to create membership");
        } finally {
            setSubmitting(false);
        }
    };

    const addType = () => {
        setFormData({
            ...formData,
            membership_types: [...formData.membership_types, { name: "", price: 0, allow_donation: false, description: "" }]
        });
    };

    const removeType = (index: number) => {
        setFormData({
            ...formData,
            membership_types: formData.membership_types.filter((_, i) => i !== index)
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <button 
                onClick={() => navigate("/memberships")}
                className="flex items-center gap-2 text-gray-400 font-bold text-sm hover:text-black transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                Back to Memberships
            </button>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-black tracking-tight">Create Membership</h1>
                    <p className="text-gray-400 font-medium mt-1">Define membership tiers and custom application fields.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 pb-20">
                {/* Basic Info */}
                <div className="bg-white rounded-[1.5rem] border border-gray-100 p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
                            <CreditCard className="w-4 h-4" />
                        </div>
                        <h2 className="text-xl font-bold text-black">General Information</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Membership Name</label>
                            <input 
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="e.g. SASS Singapore"
                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-black focus:ring-4 focus:ring-black/5 outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-center pt-8">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div 
                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.is_active ? 'bg-black' : 'bg-gray-200'}`}
                                    onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.is_active ? 'left-7' : 'left-1'}`}></div>
                                </div>
                                <span className="text-sm font-bold text-black">Active Status</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Membership Types */}
                <div className="bg-white rounded-[1.5rem] border border-gray-100 p-8 shadow-sm space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
                                <Plus className="w-4 h-4" />
                            </div>
                            <h2 className="text-xl font-bold text-black">Membership Types & Pricing</h2>
                        </div>
                        <button 
                            type="button"
                            onClick={addType}
                            className="text-sm font-bold text-black hover:underline"
                        >
                            + Add Tier
                        </button>
                    </div>

                    <div className="space-y-4">
                        {formData.membership_types.map((type, i) => (
                            <div key={i} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                                <button 
                                    type="button"
                                    onClick={() => removeType(i)}
                                    className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tier Name</label>
                                        <input 
                                            type="text"
                                            value={type.name}
                                            onChange={(e) => {
                                                const types = [...formData.membership_types];
                                                types[i].name = e.target.value;
                                                setFormData({...formData, membership_types: types});
                                            }}
                                            className="w-full px-4 py-2 bg-white border-gray-100 border rounded-xl text-sm font-bold text-black outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Monthly Price</label>
                                        <input 
                                            type="number"
                                            value={type.price}
                                            onChange={(e) => {
                                                const types = [...formData.membership_types];
                                                types[i].price = parseFloat(e.target.value);
                                                setFormData({...formData, membership_types: types});
                                            }}
                                            className="w-full px-4 py-2 bg-white border-gray-100 border rounded-xl text-sm font-bold text-black outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center pt-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox"
                                                checked={type.allow_donation}
                                                onChange={(e) => {
                                                    const types = [...formData.membership_types];
                                                    types[i].allow_donation = e.target.checked;
                                                    setFormData({...formData, membership_types: types});
                                                }}
                                                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                                            />
                                            <span className="text-xs font-bold text-gray-600">Allow Donation</span>
                                        </label>
                                    </div>
                                    <div className="md:col-span-3 space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</label>
                                        <textarea 
                                            value={type.description}
                                            onChange={(e) => {
                                                const types = [...formData.membership_types];
                                                types[i].description = e.target.value;
                                                setFormData({...formData, membership_types: types});
                                            }}
                                            className="w-full px-4 py-2 bg-white border-gray-100 border rounded-xl text-xs font-medium text-black outline-none h-16"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dynamic Fields */}
                <div className="bg-white rounded-[1.5rem] border border-gray-100 p-8 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
                            <Plus className="w-4 h-4" />
                        </div>
                        <h2 className="text-xl font-bold text-black">Form Options (Dynamic Fields)</h2>
                    </div>

                    {/* Attended Programs */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Programs Attended Options</label>
                        <div className="flex flex-wrap gap-2">
                            {formData.attended_programs_options.map((opt, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-sm font-bold text-black group">
                                    {opt}
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData, 
                                            attended_programs_options: formData.attended_programs_options.filter((_, idx) => idx !== i)
                                        })}
                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                            <input 
                                type="text"
                                placeholder="+ Add Program"
                                className="px-4 py-2 bg-white border border-dashed border-gray-200 rounded-xl text-xs font-bold text-black outline-none focus:border-black transition-all w-32"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = (e.target as HTMLInputElement).value;
                                        if (val) {
                                            setFormData({...formData, attended_programs_options: [...formData.attended_programs_options, val]});
                                            (e.target as HTMLInputElement).value = '';
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Interests */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Interest Options</label>
                        <div className="flex flex-wrap gap-2">
                            {formData.interest_options.map((opt, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-sm font-bold text-black group">
                                    {opt}
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData, 
                                            interest_options: formData.interest_options.filter((_, idx) => idx !== i)
                                        })}
                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                            <input 
                                type="text"
                                placeholder="+ Add Interest"
                                className="px-4 py-2 bg-white border border-dashed border-gray-200 rounded-xl text-xs font-bold text-black outline-none focus:border-black transition-all w-32"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = (e.target as HTMLInputElement).value;
                                        if (val) {
                                            setFormData({...formData, interest_options: [...formData.interest_options, val]});
                                            (e.target as HTMLInputElement).value = '';
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Custom Questions */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Custom Questions</label>
                        <div className="space-y-3">
                            {formData.custom_questions.map((q, i) => (
                                <div key={i} className="flex gap-4 items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <input 
                                        type="text"
                                        value={q.question}
                                        onChange={(e) => {
                                            const qs = [...formData.custom_questions];
                                            qs[i].question = e.target.value;
                                            setFormData({...formData, custom_questions: qs});
                                        }}
                                        className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold text-black outline-none"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            custom_questions: formData.custom_questions.filter((_, idx) => idx !== i)
                                        })}
                                        className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button 
                                type="button"
                                onClick={() => setFormData({
                                    ...formData,
                                    custom_questions: [...formData.custom_questions, { question: "", type: "text" }]
                                })}
                                className="text-xs font-bold text-black hover:underline"
                            >
                                + Add Question
                            </button>
                        </div>
                    </div>
                </div>

                {/* Terms & Conditions */}
                <div className="bg-white rounded-[1.5rem] border border-gray-100 p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <h2 className="text-xl font-bold text-black">Terms & Conditions</h2>
                    </div>
                    <textarea 
                        value={formData.terms_and_conditions}
                        onChange={(e) => setFormData({...formData, terms_and_conditions: e.target.value})}
                        placeholder="Enter membership terms..."
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium text-black focus:ring-4 focus:ring-black/5 outline-none transition-all h-60"
                    />
                </div>

                <div className="flex justify-end gap-4">
                    <button 
                        type="button"
                        onClick={() => navigate("/memberships")}
                        className="px-8 py-4 text-sm font-bold text-gray-400 hover:text-black transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        disabled={submitting}
                        className="px-12 py-4 bg-black text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all shadow-xl shadow-black/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? "Creating..." : "Launch Membership"}
                        {!submitting && <Save className="w-4 h-4" />}
                    </button>
                </div>
            </form>
        </div>
    );
}
