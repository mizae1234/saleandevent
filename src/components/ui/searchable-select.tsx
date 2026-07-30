'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

export interface SearchableSelectOption {
    value: string;
    label: string;
    sublabel?: string;
}

interface Props {
    readonly options: SearchableSelectOption[];
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly placeholder?: string;
    readonly disabled?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder = 'เลือก...', disabled = false }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(o => o.value === value);

    const filtered = options.filter(o => {
        if (!search) return true;
        const term = search.toLowerCase();
        return o.label.toLowerCase().includes(term) || (o.sublabel && o.sublabel.toLowerCase().includes(term));
    });

    // Close on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearch('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearch('');
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
                disabled={disabled}
                className={`w-full flex items-center justify-between border rounded-lg px-3 py-2.5 text-sm text-left transition-colors ${
                    disabled
                        ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                        : isOpen
                            ? 'border-indigo-500 ring-1 ring-indigo-500/20'
                            : 'border-slate-200 hover:border-slate-300'
                }`}
            >
                <span className={selectedOption ? 'text-slate-900' : 'text-slate-400'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <div className="flex items-center gap-1">
                    {selectedOption && !disabled && (
                        <span
                            onClick={handleClear}
                            className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                            <X className="h-3.5 w-3.5" />
                        </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="พิมพ์ค้นหา..."
                                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div className="max-h-[240px] overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-slate-400">ไม่พบรายการ</div>
                        ) : (
                            filtered.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 transition-colors ${
                                        option.value === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'
                                    }`}
                                >
                                    <span>{option.label}</span>
                                    {option.sublabel && (
                                        <span className="block text-xs text-slate-400 mt-0.5">{option.sublabel}</span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
