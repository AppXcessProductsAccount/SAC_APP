import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { 
    Layers, 
    Plus, 
    Trash2, 
    Edit3, 
    ChevronLeft,
    Search,
    Loader2
} from "lucide-react";

interface Section {
    id: number;
    section_id: string;
    template_id: string;
    content: any;
    page_id?: number;
}

export default function SectionsList() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const pageId = searchParams.get("page_id");
    const pageName = searchParams.get("page_name");
    
    const [sections, setSections] = useState<Section[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchSections();
    }, [pageId]);

    const fetchSections = async () => {
        setLoading(true);
        try {
            const data = await api.cms.listSections(pageId ? parseInt(pageId) : undefined);
            setSections(data);
        } catch (err) {
            setError("Failed to load sections");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (section_id: string) => {
        if (!confirm(`Are you sure you want to delete the section "${section_id}"?`)) return;
        
        try {
            await api.cms.deleteSection(section_id);
            setSections(sections.filter(s => s.section_id !== section_id));
        } catch (err) {
            alert("Failed to delete section");
        }
    };

    const filteredSections = sections.filter(s => 
        (s.section_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.template_id || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-black animate-spin" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Fetching content blocks...</p>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate("/cms/pages")}
                        className="p-3 bg-white hover:bg-gray-50 text-black rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-95"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-black capitalize">
                            {pageName ? `${pageName.replace(/_/g, ' ')} Content` : "All Website Content"}
                        </h1>
                        <p className="text-gray-400 font-medium mt-1">
                            {pageId ? `Managing ${sections.length} blocks for this page` : "Total control over all website modules"}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                        <input 
                            type="text"
                            placeholder="Filter sections..."
                            className="pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-black/5 outline-none w-64 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Link 
                        to={`/sections/new${pageId ? `?page_id=${pageId}` : ""}`}
                        className="px-6 py-3 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-black/10 flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        Add Section
                    </Link>
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
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">Section Information</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">Rendering Logic</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredSections.map((section) => (
                                <tr key={section.id} className="group hover:bg-gray-50/30 transition-all">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-all">
                                                <Layers className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-black capitalize">{section.section_id.replace(/_/g, ' ')}</p>
                                                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter mt-1">{section.section_id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                                                {section.template_id}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-300">#{section.id}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex justify-end gap-2">
                                            <Link 
                                                to={`/sections/edit/${section.page_id}/${section.section_id}`}
                                                className="p-3 bg-gray-50 text-gray-400 hover:text-black hover:bg-white hover:shadow-md rounded-xl transition-all"
                                                title="Edit Content"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </Link>
                                            <button 
                                                onClick={() => handleDelete(section.section_id)}
                                                className="p-3 bg-red-50 text-red-400 hover:text-red-600 hover:bg-white hover:shadow-md rounded-xl transition-all"
                                                title="Delete Section"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {filteredSections.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto">
                            <Layers className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-black">No matching modules</h3>
                            <p className="text-gray-400 max-w-xs mx-auto text-sm mt-1">Adjust your search or add a new content block to this page.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
