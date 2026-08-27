import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { routeForPage } from "../lib/websiteRoutes";
import Toast, { type ToastState } from "../components/Toast";
import {
    Layout,
    Trash2,
    Edit3,
    ChevronRight,
    Loader2
} from "lucide-react";

interface Page {
    id: number;
    name: string;
}

export default function CMSPages() {
    const [pages, setPages] = useState<Page[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingPage, setEditingPage] = useState<Page | null>(null);
    const [toast, setToast] = useState<ToastState>(null);

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            const data = await api.cms.pages.list();
            setPages(data);
        } catch (err) {
            setError("Failed to load pages");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPage || !editingPage.name.trim()) return;

        try {
            const updated = await api.cms.pages.update(editingPage.id, { name: editingPage.name.trim() });
            setPages(pages.map(p => p.id === updated.id ? updated : p));
            setEditingPage(null);
            /* Sections stay attached through the rename — they reference the page by
               id, not by name — so the website keeps rendering the same content. */
            setToast({ message: `Renamed to "${updated.name}" — content kept`, tone: "success" });
        } catch (err) {
            setToast({ message: "Failed to rename page", tone: "error" });
        }
    };

    const handleDeletePage = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This will delete all sections associated with it.`)) return;

        try {
            await api.cms.pages.delete(id);
            setPages(pages.filter(p => p.id !== id));
        } catch (err) {
            alert("Failed to delete page");
        }
    };

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-black animate-spin" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs text-center">Loading your architecture...</p>
        </div>
    );

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-black">Website Structure</h1>
                    <p className="text-gray-400 font-medium mt-1">Manage pages and their content architecture.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-3">
                    <span className="text-sm font-bold">{error}</span>
                </div>
            )}

            {/* Edit Page Modal Overlay */}
            {editingPage && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-bold text-black mb-2">Rename Page</h3>
                        <p className="text-gray-400 text-sm mb-6">Update the label for this page.</p>

                        <form onSubmit={handleUpdatePage} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Page Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-medium"
                                    value={editingPage.name}
                                    onChange={(e) => setEditingPage({...editingPage, name: e.target.value})}
                                />
                            </div>

                            {/* Renaming is safe but it is not a way to change the URL — say so
                                here, because that is what people expect it to do. */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    The name is a label for this admin only. All blocks inside stay
                                    attached and keep showing on the website.
                                </p>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    {routeForPage(editingPage) ? (
                                        <>
                                            The website address stays{" "}
                                            <code className="bg-white px-1.5 py-0.5 rounded-md text-black font-mono text-[10px] border border-gray-200">
                                                {routeForPage(editingPage)}
                                            </code>{" "}
                                            — renaming does not change it.
                                        </>
                                    ) : (
                                        "This page is not wired to a website address yet, so its blocks are not shown to visitors."
                                    )}
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setEditingPage(null)}
                                    className="flex-1 py-4 bg-gray-50 text-gray-400 font-bold rounded-2xl hover:bg-gray-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-lg shadow-black/20"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pages.map((page) => (
                    <div key={page.id} className="group bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-black/5 transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 flex gap-2 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                            <button 
                                onClick={() => setEditingPage(page)}
                                className="p-2 bg-gray-50 text-gray-400 hover:text-black rounded-lg transition-colors"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleDeletePage(page.id, page.name)}
                                className="p-2 bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 text-black group-hover:bg-black group-hover:text-white transition-all duration-500">
                            <Layout className="w-6 h-6" />
                        </div>
                        
                        <h3 className="text-xl font-bold text-black capitalize mb-1">{page.name.replace(/_/g, ' ')}</h3>
                        <p className="text-gray-400 text-sm font-medium mb-3">Identifier: <code className="bg-gray-50 px-1.5 py-0.5 rounded-md text-gray-500 font-mono text-[10px]">{page.name}</code></p>

                        {/* Makes the page-to-URL binding visible, so it is obvious which
                            part of the live site a block will show up on. */}
                        <div className="mb-8">
                            {routeForPage(page) ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-100">
                                    Live at
                                    <code className="font-mono">{routeForPage(page)}</code>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-400 rounded-lg text-[11px] font-bold border border-gray-100">
                                    Not shown on the website
                                </span>
                            )}
                        </div>

                        <Link 
                            to={`/sections?page_id=${page.id}&page_name=${page.name}`}
                            className="flex items-center justify-between w-full p-4 bg-gray-50 text-black rounded-2xl font-bold text-sm hover:bg-black hover:text-white transition-all group/btn"
                        >
                            Manage Content
                            <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                ))}

                {pages.length === 0 && !loading && (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto">
                            <Layout className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-black">No pages defined</h3>
                            <p className="text-gray-400 max-w-xs mx-auto text-sm mt-1">Start by creating your first website page to organize your content sections.</p>
                        </div>
                    </div>
                )}
            </div>

            <Toast toast={toast} onDismiss={() => setToast(null)} />
        </div>
    );
}
