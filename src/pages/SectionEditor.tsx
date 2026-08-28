import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, getApiBaseUrl } from "../lib/api";
import Toast, { type ToastState } from "../components/Toast";
import { SECTION_DEFAULTS } from "../lib/sectionDefaults";

/* Fields that hold prose. They get a <textarea> no matter how short the current
   value is — an <input type="text"> silently swallows the Enter key, so on a
   short description there was no way to type a line break at all. */
const PROSE_FIELDS = new Set([
    "description", "content", "text", "subtitle", "summary", "excerpt", "bio",
    "quote", "answer", "message", "address", "details", "body", "paragraph",
    "caption", "intro", "about", "testimonial", "note",
]);

const isProseField = (label: string, value: string) => {
    const key = label.trim().toLowerCase();
    return (
        PROSE_FIELDS.has(key) ||
        key.endsWith("_description") ||
        key.endsWith("_content") ||
        key.endsWith("_bio") ||
        value.includes("\n") ||
        value.length > 50
    );
};

/* ---------------------------------------------------------------------------
 * Loading a section's website defaults.
 *
 * This editor has no schema: it walks the stored JSON and draws one field per
 * key it finds. That is what lets it edit every section without knowing about
 * any of them - and also why a section that was never seeded is a dead end. The
 * home hero was the case that bit. The website renders `content.slides` (see
 * HeroClassic.tsx) and falls back to four slides hardcoded in that component
 * when the key is absent; the stored JSON only ever had `title` and `subtitle`,
 * so the admin drew two boxes nothing reads, offered no way to make a slide,
 * and the four slides actually on the page were editable nowhere.
 *
 * SECTION_DEFAULTS carries those fallbacks (generated from the frontend's own
 * seed file) so the editor can write them into the section and make them real.
 * ------------------------------------------------------------------------- */

/** One entry in a repeatable list - a slide, a testimonial, an FAQ. */
type BlockItem = Record<string, unknown>;

/**
 * A blank item for a list, taken from the shape of the section's own default.
 *
 * Used when the last item is deleted: the array editor builds a new item by
 * cloning the first one, and an empty array has nothing to clone. Without this
 * it added a bare "" - a lone text box where a slide should be, with no way
 * back except the JSON tab.
 */
const blankItemFor = (sectionId: string, key: string): BlockItem | "" => {
    const template = SECTION_DEFAULTS[sectionId.trim().toLowerCase()]?.content?.[key];
    if (!Array.isArray(template) || !template.length || typeof template[0] !== "object") return "";
    const blank: BlockItem = {};
    Object.entries(template[0] as BlockItem).forEach(([field, value]) => {
        blank[field] = typeof value === "number" ? 0 : "";
    });
    return blank;
};

// Helper to render dynamic form fields
const DynamicField = ({ label, value, onChange, path, sectionId }: { label: string, value: any, onChange: (path: string, val: any) => void, path: string, sectionId: string }) => {
    const [uploading, setUploading] = useState(false);

    /* Latched: once a field renders as a textarea it stays one. Deciding purely on
       the live value meant crossing the length threshold swapped the element
       mid-keystroke, which remounts it and drops focus. */
    const multiline = useRef(false);
    if (typeof value === "string" && isProseField(label, value)) multiline.current = true;

    // Detect if this is an image field
    const isImageField = label.toLowerCase().includes("image_url") || label.toLowerCase().includes("logo_url") || (typeof value === "string" && (value.endsWith(".png") || value.endsWith(".jpg") || value.endsWith(".jpeg") || value.endsWith(".webp")));

    const handleInlineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const data = await api.upload(file);
            onChange(path, data.url);
        } catch (err) {
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    if (isImageField && typeof value === "string") {
        const fullUrl = value.startsWith("/") ? `${getApiBaseUrl()}${value}` : value;
        return (
            <div className="space-y-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{label.replace(/_/g, ' ')}</label>
                <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="w-32 h-32 rounded-xl overflow-hidden border border-gray-200 bg-white flex-shrink-0 shadow-sm">
                        {value ? (
                            <img src={fullUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-3 w-full">
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-xs font-mono"
                            value={value}
                            onChange={(e) => onChange(path, e.target.value)}
                            placeholder="https://..."
                        />
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleInlineUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={uploading}
                            />
                            <button 
                                type="button"
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                    uploading ? "bg-blue-50 text-blue-400" : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20"
                                }`}
                            >
                                {uploading ? (
                                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                )}
                                {uploading ? "Uploading..." : value ? "Change Image" : "Upload Image"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (typeof value === "string") {
        return (
            <div className="space-y-1">
                {label && <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{label.replace(/_/g, ' ')}</label>}
                {multiline.current ? (
                    <>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/30 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-sm min-h-[100px] leading-relaxed whitespace-pre-wrap"
                            value={value}
                            onChange={(e) => onChange(path, e.target.value)}
                        />
                        <p className="text-[10px] text-gray-400 ml-1">
                            Press Enter for a new line, twice for a blank line — line breaks are kept on the website.
                        </p>
                    </>
                ) : (
                    <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/30 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-sm"
                        value={value}
                        onChange={(e) => onChange(path, e.target.value)}
                    />
                )}
            </div>
        );
    }

    if (typeof value === "number") {
        return (
            <div className="space-y-1">
                {label && <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{label.replace(/_/g, ' ')}</label>}
                <input
                    type="number"
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/30 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-sm"
                    value={value}
                    onChange={(e) => onChange(path, parseFloat(e.target.value))}
                />
            </div>
        );
    }

    if (Array.isArray(value)) {
        return (
            <div className="space-y-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">{label.replace(/_/g, ' ')} ({value.length})</label>
                    <button 
                        type="button"
                        onClick={() => {
                            /* Cloning item[0] is what makes this work for any list
                               without a schema. An EMPTY list has nothing to clone,
                               and used to add "" — a bare text box where a slide
                               should be, and no way back except the JSON tab. A
                               known key rebuilds its proper shape instead. */
                            const newItem = value.length > 0
                                ? JSON.parse(JSON.stringify(value[0]))
                                : blankItemFor(sectionId, label.trim());
                            
                            // Clear values for new item if it's an object
                            const clearValues = (obj: any) => {
                                if (typeof obj !== 'object' || obj === null) return typeof obj === 'number' ? 0 : "";
                                
                                const newObj = { ...obj };
                                Object.keys(newObj).forEach(key => {
                                    if (typeof newObj[key] === 'object' && newObj[key] !== null) newObj[key] = clearValues(newObj[key]);
                                    else newObj[key] = typeof newObj[key] === 'number' ? 0 : "";
                                });
                                return newObj;
                            };
                            
                            onChange(path, [...value, clearValues(newItem)]);
                        }}
                        className="text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors"
                    >
                        + Add {label.replace(/_/g, " ").replace(/s$/, "") || "item"}
                    </button>
                </div>
                <div className="space-y-6">
                    {value.map((item, index) => (
                        <div key={index} className="relative p-4 bg-white rounded-xl border border-gray-100 shadow-sm space-y-4">
                            <button 
                                type="button"
                                onClick={() => {
                                    const newList = [...value];
                                    newList.splice(index, 1);
                                    onChange(path, newList);
                                }}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-md z-10"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <RecursiveFields obj={item} onChange={onChange} path={`${path}[${index}]`} sectionId={sectionId} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (typeof value === "object" && value !== null) {
        return (
            <div className="space-y-4 border-l-2 border-blue-50 pl-4 py-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label.replace(/_/g, ' ')}</label>
                <RecursiveFields obj={value} onChange={onChange} path={path} sectionId={sectionId} />
            </div>
        );
    }

    return null;
};

const RecursiveFields = ({ obj, onChange, path, sectionId }: { obj: any, onChange: (path: string, val: any) => void, path: string, sectionId: string }) => {
    // If obj is a primitive value (like in an array of strings), render it directly as a field
    if (typeof obj !== "object" || obj === null) {
        return (
            <DynamicField 
                label="" 
                value={obj} 
                onChange={onChange} 
                path={path} 
            sectionId={sectionId}
            />
        );
    }

    return (
        <div className="space-y-6">
            {Object.keys(obj).map((key) => (
                <DynamicField 
                    key={key} 
                    label={key} 
                    value={obj[key]} 
                    onChange={onChange} 
                    path={path ? `${path}.${key}` : key} 
                sectionId={sectionId}
                />
            ))}
        </div>
    );
};

export default function SectionEditor() {
    const { page_id: paramPageId, section_id: paramSectionId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isEditing = Boolean(paramSectionId);

    const [sectionId, setSectionId] = useState("");
    const [templateId, setTemplateId] = useState("default");
    const [pageId, setPageId] = useState<number | "">(
        paramPageId ? parseInt(paramPageId) : 
        (searchParams.get("page_id") ? parseInt(searchParams.get("page_id")!) : "")
    );
    const [content, setContent] = useState("{}");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<"ui" | "json">("ui");
    const [pages, setPages] = useState<{id: number, name: string}[]>([]);
    const [toast, setToast] = useState<ToastState>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const pagesData = await api.cms.pages.list();
                setPages(pagesData);
                
                if (isEditing && paramSectionId && paramPageId) {
                    await fetchSection(parseInt(paramPageId), paramSectionId);
                }
            } catch (err) {
                setError("Failed to initialize editor");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [isEditing, paramSectionId, paramPageId]);

    const fetchSection = async (pId: number, sId: string) => {
        try {
            const data = await api.cms.getSectionContent(pId, sId);
            setSectionId(data.section_id);
            setTemplateId(data.template_id);
            setPageId(data.page_id || "");
            setContent(JSON.stringify(data.content, null, 2));
        } catch (err) {
            setError("Failed to load section content");
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pageId) {
            setError("Please select a page for this section");
            return;
        }
        
        setSaving(true);
        setError("");
        setToast(null);

        try {
            let parsedContent;
            try {
                parsedContent = JSON.parse(content);
            } catch (e) {
                throw new Error("Invalid JSON in content field");
            }

            const payload = {
                section_id: sectionId,
                template_id: templateId,
                page_id: pageId,
                content: parsedContent
            };

            if (isEditing && paramSectionId) {
                await api.cms.updateSection(paramSectionId, {
                    content: parsedContent,
                    page_id: pageId
                });
                /* Stay on the editor. Bouncing back to the section list after every
                   save meant re-opening the block to make the next tweak. */
                setToast({ message: "Changes applied and updated", tone: "success" });
            } else {
                await api.cms.createSection(payload);
                // A new section has nowhere to stay — send it to the list it now belongs to.
                navigate(`/sections?page_id=${pageId}`);
            }
        } catch (err: any) {
            const message = err.message || "Failed to save section";
            setError(message);
            setToast({ message, tone: "error" });
        } finally {
            setSaving(false);
        }
    };

    const updateNestedValue = (path: string, val: any) => {
        try {
            const currentContent = JSON.parse(content);
            const pathParts = path.split(/\.|\[|\]/).filter(Boolean);
            
            let temp = currentContent;
            for (let i = 0; i < pathParts.length - 1; i++) {
                const part = pathParts[i];
                // Handle array index if numeric
                const isArrayIndex = !isNaN(parseInt(pathParts[i+1]));
                if (isArrayIndex) {
                   // next is array, so current part must be an array
                }
                
                if (temp[part] === undefined) temp[part] = {};
                temp = temp[part];
            }
            
            const lastPart = pathParts[pathParts.length - 1];
            temp[lastPart] = val;
            
            setContent(JSON.stringify(currentContent, null, 2));
        } catch (e) {
            console.error("Failed to update nested value", e);
        }
    };

    const [uploading, setUploading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState("");

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError("");
        try {
            const data = await api.upload(file);
            setUploadedUrl(data.url);
        } catch (err: any) {
            setError(err.message || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12 text-gray-500 font-medium">Loading editor...</div>;

    const parsedContentForUI = (() => {
        try {
            return JSON.parse(content);
        } catch (e) {
            return null;
        }
    })();

    /* What this section is supposed to hold, and what it is actually missing. */
    const sectionDefault = SECTION_DEFAULTS[sectionId.trim().toLowerCase()];
    const missingKeys = sectionDefault
        ? Object.keys(sectionDefault.content).filter((key) => {
              const current = parsedContentForUI?.[key];
              /* An empty array counts as missing: a slides list somebody
                 emptied is the same dead end as one that never existed. */
              if (Array.isArray(current)) return current.length === 0;
              return current === undefined || current === null || current === "";
          })
        : [];
    const droppableKeys = (sectionDefault?.drops ?? [])
        .filter((key) => parsedContentForUI && key in parsedContentForUI);

    /** How many items each missing list would bring, for the panel's wording. */
    const describeMissing = (key: string) => {
        const value = sectionDefault?.content?.[key];
        return Array.isArray(value) ? `${key} (${value.length})` : key;
    };

    const loadDefaults = () => {
        if (!sectionDefault) return;
        const current = parsedContentForUI ?? {};
        /* Missing keys only. Anything already written is left exactly as it is,
           so this is safe to press on a section somebody has worked on - it
           fills the gaps rather than resetting the section. */
        const next: Record<string, unknown> = { ...current };
        missingKeys.forEach((key) => {
            next[key] = JSON.parse(JSON.stringify(sectionDefault.content[key]));
        });
        droppableKeys.forEach((key) => delete next[key]);
        setContent(JSON.stringify(next, null, 2));
    };

    return (
        <div className="max-w-[1400px] mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate("/sections")}
                        className="p-3 bg-white hover:bg-gray-50 text-[#101848] rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-95"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-[#101848]">
                            {isEditing ? `Edit Section` : "Create New Section"}
                        </h1>
                        <p className="text-gray-500 font-medium">{isEditing ? `Updating ${paramSectionId}` : "Configure section metadata and content JSON"}</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => navigate("/sections")}
                        className="px-6 py-3.5 bg-white text-gray-500 font-bold rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3.5 bg-[#101848] text-white rounded-2xl font-bold hover:bg-[#1a2560] transition-all disabled:opacity-50 shadow-xl shadow-[#101848]/20 flex items-center gap-2"
                    >
                        {saving ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : null}
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Editor */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 flex gap-1">
                        <button 
                            onClick={() => setActiveTab("ui")}
                            className={`flex-1 py-3 px-6 rounded-2xl font-bold text-sm transition-all ${
                                activeTab === "ui" 
                                    ? "bg-[#101848] text-white shadow-lg shadow-[#101848]/20" 
                                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                UI Editor
                            </div>
                        </button>
                        <button 
                            onClick={() => setActiveTab("json")}
                            className={`flex-1 py-3 px-6 rounded-2xl font-bold text-sm transition-all ${
                                activeTab === "json" 
                                    ? "bg-[#101848] text-white shadow-lg shadow-[#101848]/20" 
                                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                JSON Code
                            </div>
                        </button>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 min-h-[600px]">
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 pb-8 border-b border-gray-100">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-[#101848] uppercase tracking-[0.2em] ml-1">Page Location</label>
                                <select
                                    required
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-[#101848]/5 focus:border-[#101848] outline-none transition-all appearance-none font-medium"
                                    value={pageId}
                                    onChange={(e) => setPageId(e.target.value ? parseInt(e.target.value) : "")}
                                >
                                    <option value="">Select Page...</option>
                                    {pages.map(p => (
                                        <option key={p.id} value={p.id}>{p.name.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-[#101848] uppercase tracking-[0.2em] ml-1">Section Identifier</label>
                                <input
                                    type="text"
                                    required
                                    disabled={isEditing}
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-[#101848]/5 focus:border-[#101848] outline-none transition-all disabled:opacity-50 font-medium"
                                    placeholder="e.g. hero, about"
                                    value={sectionId}
                                    onChange={(e) => setSectionId(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-[#101848] uppercase tracking-[0.2em] ml-1">Render Template</label>
                                <select
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-[#101848]/5 focus:border-[#101848] outline-none transition-all appearance-none font-medium"
                                    value={templateId}
                                    onChange={(e) => setTemplateId(e.target.value)}
                                >
                                    <option value="default">Default Template</option>
                                    <option value="modern">Modern Theme</option>
                                    <option value="classic">Classic Theme</option>
                                </select>
                            </div>
                        </div>

                        {activeTab === "json" ? (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-[#101848] uppercase tracking-[0.2em] ml-1">Content Specification (JSON)</label>
                                <textarea
                                    required
                                    className="w-full h-[600px] px-6 py-6 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-[#101848]/5 focus:border-[#101848] outline-none transition-all font-mono text-sm leading-relaxed resize-none shadow-inner"
                                    placeholder='{ "title": "...", "subtitle": "..." }'
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                {parsedContentForUI ? (
                                    <>
                                        <RecursiveFields obj={parsedContentForUI} onChange={updateNestedValue} path="" sectionId={sectionId} />

                                        {/* Content the website is showing from its own
                                            built-in fallbacks, which is therefore on the
                                            page and editable nowhere. One press turns it
                                            into real content in this form. */}
                                        {(missingKeys.length > 0 || droppableKeys.length > 0) && (
                                            <div className="p-5 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 space-y-3">
                                                <div>
                                                    <h4 className="text-sm font-bold text-[#101848]">
                                                        {missingKeys.length > 0
                                                            ? `${sectionDefault?.name ?? "This section"} is using the website's built-in content`
                                                            : "This section has fields the website does not read"}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mt-1 max-w-xl leading-relaxed">
                                                        {missingKeys.length > 0 && (
                                                            <>
                                                                Load it here and it becomes editable - images included. Adds{" "}
                                                                <span className="font-semibold text-gray-700">{missingKeys.map(describeMissing).join(", ")}</span>.
                                                                Nothing you have already filled in is changed.
                                                            </>
                                                        )}
                                                        {droppableKeys.length > 0 && (
                                                            <>
                                                                {missingKeys.length > 0 ? " " : ""}
                                                                Removes <span className="font-semibold text-gray-700">{droppableKeys.join(", ")}</span>,
                                                                which nothing on the website reads.
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={loadDefaults}
                                                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all active:scale-95"
                                                >
                                                    Load website content
                                                </button>
                                                <p className="text-[10px] text-gray-400">Nothing is saved until you press Save below.</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                                        <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800">Invalid JSON Structure</h3>
                                            <p className="text-gray-500 max-w-sm">The UI editor cannot render because the JSON content is malformed. Please fix it in the Code tab first.</p>
                                        </div>
                                        <button 
                                            onClick={() => setActiveTab("json")}
                                            className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                                        >
                                            Switch to JSON Code
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Media Tool */}
                <div className="space-y-8">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 sticky top-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-serif font-bold text-[#101848]">Media Assets</h2>
                        </div>

                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                            Upload images to your library. Copy the generated URL and paste it into any image field in the editor.
                        </p>

                        <div className="relative group">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={uploading}
                            />
                            <div className={`p-8 border-2 border-dashed rounded-2xl text-center transition-all ${
                                uploading ? "border-blue-200 bg-blue-50/30" : "border-gray-100 group-hover:border-[#101848]/20 group-hover:bg-gray-50/50"
                            }`}>
                                {uploading ? (
                                    <div className="space-y-3">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                        <p className="text-sm font-bold text-blue-600">Uploading...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <svg className="w-8 h-8 text-gray-300 mx-auto group-hover:text-[#101848]/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <p className="text-sm font-bold text-gray-400 group-hover:text-[#101848]/60 transition-colors">Select image file</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {uploadedUrl && (
                            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-2">Ready to use</p>
                                    <div className="relative group">
                                        <input
                                            readOnly
                                            className="w-full text-xs font-mono bg-white px-3 py-3 rounded-lg border border-green-200 pr-10 overflow-hidden text-ellipsis"
                                            value={uploadedUrl}
                                        />
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(uploadedUrl);
                                                alert("URL Copied!");
                                            }}
                                            className="absolute right-2 top-1.5 p-1.5 bg-green-100 text-green-600 rounded-md hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                            title="Copy to clipboard"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="aspect-video w-full rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 shadow-inner">
                                    <img src={uploadedUrl.startsWith("/") ? `${getApiBaseUrl()}${uploadedUrl}` : uploadedUrl} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Toast toast={toast} onDismiss={() => setToast(null)} />
        </div>
    );
}
