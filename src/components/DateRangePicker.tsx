import { useState, useRef, useEffect } from "react";
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    isSameMonth, 
    isSameDay, 
    addDays, 
    isWithinInterval,
    startOfToday,
    subDays,
    subWeeks,
    subQuarters
} from "date-fns";

interface DateRangePickerProps {
    onChange: (range: { start: Date | null, end: Date | null }) => void;
    value: { start: Date | null, end: Date | null };
}

export default function DateRangePicker({ onChange, value }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    const presets = [
        { label: "Today", getValue: () => ({ start: startOfToday(), end: startOfToday() }) },
        { label: "Yesterday", getValue: () => ({ start: subDays(startOfToday(), 1), end: subDays(startOfToday(), 1) }) },
        { label: "Last week", getValue: () => ({ start: subWeeks(startOfToday(), 1), end: startOfToday() }) },
        { label: "Last month", getValue: () => ({ start: subMonths(startOfToday(), 1), end: startOfToday() }) },
        { label: "Last quarter", getValue: () => ({ start: subQuarters(startOfToday(), 1), end: startOfToday() }) },
    ];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDateClick = (day: Date) => {
        if (!value.start || (value.start && value.end)) {
            onChange({ start: day, end: null });
        } else {
            if (day < value.start) {
                onChange({ start: day, end: value.start });
            } else {
                onChange({ start: value.start, end: day });
            }
        }
    };

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between px-4 py-4">
                <span className="text-sm font-bold text-[#101848]">
                    {format(currentMonth, "MMMM yyyy")}
                </span>
                <div className="flex gap-2">
                    <button 
                        type="button"
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button 
                        type="button"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
        return (
            <div className="grid grid-cols-7 mb-2">
                {days.map((day) => (
                    <div key={day} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const cloneDay = day;
                const isSelected = (value.start && isSameDay(day, value.start)) || (value.end && isSameDay(day, value.end));
                const isInRange = value.start && value.end && isWithinInterval(day, { start: value.start, end: value.end });
                const isStart = value.start && isSameDay(day, value.start);
                const isEnd = value.end && isSameDay(day, value.end);

                days.push(
                    <div
                        key={day.toString()}
                        className={`relative h-10 flex items-center justify-center cursor-pointer text-sm font-medium transition-all
                            ${!isSameMonth(day, monthStart) ? "text-gray-300" : "text-[#101848]"}
                            ${isInRange ? "bg-blue-50/80" : ""}
                            ${isStart ? "rounded-l-full" : ""}
                            ${isEnd ? "rounded-r-full" : ""}
                        `}
                        onClick={() => handleDateClick(cloneDay)}
                    >
                        <div className={`
                            w-8 h-8 flex items-center justify-center rounded-full transition-all
                            ${isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110 z-10" : "hover:bg-gray-100"}
                        `}>
                            {format(day, "d")}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="px-2">{rows}</div>;
    };

    return (
        <div className="relative" ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer hover:border-blue-400 transition-all focus:ring-4 focus:ring-blue-500/5 group"
            >
                <span className={`font-medium ${value.start ? "text-[#101848]" : "text-gray-400"}`}>
                    {value.start ? (
                        <>
                            {format(value.start, "d MMM yy")} 
                            {value.end ? ` – ${format(value.end, "d MMM yy")}` : " – Select end date"}
                        </>
                    ) : "Select date range"}
                </span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-4 bg-white rounded-[2rem] shadow-2xl border border-gray-100 flex overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
                    {/* Sidebar Presets */}
                    <div className="w-40 border-r border-gray-50 p-6 flex flex-col gap-1">
                        {presets.map((preset) => (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                    onChange(preset.getValue());
                                    setIsOpen(false);
                                }}
                                className="text-left px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-[#101848] transition-all"
                            >
                                {preset.label}
                            </button>
                        ))}
                        <div className="mt-auto pt-6">
                            <button 
                                type="button"
                                onClick={() => {
                                    onChange({ start: null, end: null });
                                    setIsOpen(false);
                                }}
                                className="text-blue-600 font-bold text-sm hover:underline px-4"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    {/* Calendar Area */}
                    <div className="w-80 p-4">
                        {renderHeader()}
                        {renderDays()}
                        {renderCells()}
                    </div>
                </div>
            )}
        </div>
    );
}
