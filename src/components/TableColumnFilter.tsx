import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Check, Filter, Search, X } from 'lucide-react';

export const EMPTY_CELL_TOKEN = '__EMPTY__';

export interface ColumnFilterSpec {
  searchText?: string;
  selectedValues?: string[]; // undefined = all selected (no value filter)
}

export type TableFilterState = Record<string, ColumnFilterSpec>;

export interface TableSortState {
  key: string;
  direction: 'asc' | 'desc';
}

export const normalizeFilterText = (val: unknown): string => {
  return String(val ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
};

export const toCellFilterToken = (raw: unknown): string => {
  const s = String(raw ?? '').trim();
  return s === '' ? EMPTY_CELL_TOKEN : s;
};

export const displayCellFilterToken = (token: string): string => {
  return token === EMPTY_CELL_TOKEN ? '(Trống)' : token;
};

export const isColumnFilterActive = (
  spec?: ColumnFilterSpec,
  sortState?: TableSortState | null,
  colKey?: string
): boolean => {
  const hasSearch = Boolean(spec?.searchText && spec.searchText.trim().length > 0);
  const hasValues = Array.isArray(spec?.selectedValues);
  const hasSort = Boolean(colKey && sortState && sortState.key === colKey);
  return hasSearch || hasValues || hasSort;
};

export const countActiveColumnFilters = (
  filters: TableFilterState,
  sortState?: TableSortState | null
): number => {
  const keys = new Set<string>(Object.keys(filters));
  if (sortState?.key) keys.add(sortState.key);
  let count = 0;
  keys.forEach((k) => {
    if (isColumnFilterActive(filters[k], sortState, k)) count++;
  });
  return count;
};

const parseComparableValue = (val: string): number | string => {
  if (val === EMPTY_CELL_TOKEN || val === '') return '';
  // Check numeric
  const cleanedNum = val.replace(/%$/, '').replace(/,/g, '').trim();
  if (/^-?\d+(\.\d+)?$/.test(cleanedNum)) {
    return parseFloat(cleanedNum);
  }
  // Check dd/mm/yyyy (optional HH:mm:ss)
  const dmY = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmY) {
    const d = new Date(
      parseInt(dmY[3], 10),
      parseInt(dmY[2], 10) - 1,
      parseInt(dmY[1], 10),
      dmY[4] ? parseInt(dmY[4], 10) : 0,
      dmY[5] ? parseInt(dmY[5], 10) : 0,
      dmY[6] ? parseInt(dmY[6], 10) : 0
    ).getTime();
    if (!isNaN(d)) return d;
  }
  return val.toLowerCase();
};

export const compareCellTokens = (a: string, b: string): number => {
  if (a === EMPTY_CELL_TOKEN && b !== EMPTY_CELL_TOKEN) return 1;
  if (b === EMPTY_CELL_TOKEN && a !== EMPTY_CELL_TOKEN) return -1;
  if (a === b) return 0;

  const pa = parseComparableValue(a);
  const pb = parseComparableValue(b);
  if (typeof pa === 'number' && typeof pb === 'number') {
    return pa - pb;
  }
  return displayCellFilterToken(a).localeCompare(displayCellFilterToken(b), 'vi', { numeric: true, sensitivity: 'base' });
};

export type ColumnValueExtractors<T> = Record<string, (row: T, index: number) => string | number | null | undefined>;

export function applyColumnFiltersAndSort<T>(
  rows: T[],
  extractors: ColumnValueExtractors<T>,
  filters: TableFilterState,
  sortState?: TableSortState | null,
  excludeColumnKey?: string
): T[] {
  const activeEntries = Object.entries(filters).filter(([key, spec]) => {
    if (excludeColumnKey && key === excludeColumnKey) return false;
    return Boolean(
      (spec?.searchText && spec.searchText.trim().length > 0) ||
      Array.isArray(spec?.selectedValues)
    );
  });

  const filtered = activeEntries.length === 0
    ? rows
    : rows.filter((row, idx) => {
        for (const [colKey, spec] of activeEntries) {
          const extractor = extractors[colKey];
          if (!extractor) continue;
          const rawVal = extractor(row, idx);
          const token = toCellFilterToken(rawVal);

          if (Array.isArray(spec.selectedValues)) {
            if (!spec.selectedValues.includes(token)) {
              return false;
            }
          }

          if (spec.searchText && spec.searchText.trim()) {
            const qNorm = normalizeFilterText(spec.searchText);
            const cellNorm = normalizeFilterText(displayCellFilterToken(token));
            if (!cellNorm.includes(qNorm)) {
              return false;
            }
          }
        }
        return true;
      });

  if (!excludeColumnKey && sortState && sortState.key && extractors[sortState.key]) {
    const ext = extractors[sortState.key];
    const dir = sortState.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const ta = toCellFilterToken(ext(a, 0));
      const tb = toCellFilterToken(ext(b, 0));
      return compareCellTokens(ta, tb) * dir;
    });
  }

  return filtered;
}

interface ColumnFilterHeaderProps<T> {
  label: React.ReactNode;
  columnKey: string;
  allRows: T[];
  extractors: ColumnValueExtractors<T>;
  filters: TableFilterState;
  onChangeFilters: (next: TableFilterState) => void;
  sortState?: TableSortState | null;
  onChangeSort?: (next: TableSortState | null) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function ColumnFilterHeader<T>({
  label,
  columnKey,
  allRows,
  extractors,
  filters,
  onChangeFilters,
  sortState,
  onChangeSort,
  align = 'left',
  className = ''
}: ColumnFilterHeaderProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; openAbove: boolean }>({
    top: 0,
    left: 0,
    openAbove: false
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Draft state inside popover before clicking "Áp dụng"
  const currentSpec = filters[columnKey];
  const [draftSearch, setDraftSearch] = useState('');
  const [draftSelected, setDraftSelected] = useState<Set<string> | null>(null); // null = ALL selected
  const [draftSort, setDraftSort] = useState<'asc' | 'desc' | null>(null);

  // Build available unique values (cascading from OTHER active filters like Excel)
  const { uniqueTokens, valueCounts } = useMemo(() => {
    const contextRows = applyColumnFiltersAndSort(allRows, extractors, filters, null, columnKey);
    const ext = extractors[columnKey];
    const counts = new Map<string, number>();
    if (ext) {
      contextRows.forEach((row, idx) => {
        const token = toCellFilterToken(ext(row, idx));
        counts.set(token, (counts.get(token) || 0) + 1);
      });
    }
    const tokens = Array.from(counts.keys()).sort(compareCellTokens);
    return { uniqueTokens: tokens, valueCounts: counts };
  }, [allRows, extractors, filters, columnKey]);

  const visibleTokens = useMemo(() => {
    if (!draftSearch.trim()) return uniqueTokens;
    const q = normalizeFilterText(draftSearch);
    return uniqueTokens.filter((t) => normalizeFilterText(displayCellFilterToken(t)).includes(q));
  }, [uniqueTokens, draftSearch]);

  const updatePopoverPosition = () => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const popoverWidth = 264;
    const estimatedHeight = 360;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left = rect.left;
    if (left + popoverWidth > viewportW - 12) {
      left = Math.max(12, rect.right - popoverWidth);
    }
    if (left < 12) left = 12;

    const spaceBelow = viewportH - rect.bottom;
    const openAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
    const top = openAbove ? Math.max(12, rect.top - 6) : Math.min(viewportH - 12, rect.bottom + 6);

    setPopoverPos({ top, left, openAbove });
  };

  const openPopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setDraftSearch(currentSpec?.searchText || '');
    setDraftSelected(Array.isArray(currentSpec?.selectedValues) ? new Set(currentSpec.selectedValues) : null);
    setDraftSort(sortState?.key === columnKey ? sortState.direction : null);
    updatePopoverPosition();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => searchInputRef.current?.focus(), 20);

    const handleClickOutside = (ev: MouseEvent) => {
      const target = ev.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setIsOpen(false);
    };

    const handleReposition = () => updatePopoverPosition();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen]);

  const active = isColumnFilterActive(currentSpec, sortState, columnKey);

  const isTokenChecked = (token: string): boolean => {
    if (draftSelected === null) return true;
    return draftSelected.has(token);
  };

  const allVisibleChecked =
    visibleTokens.length > 0 && visibleTokens.every((t) => isTokenChecked(t));

  const handleToggleAllVisible = () => {
    if (allVisibleChecked) {
      if (draftSelected === null) {
        const next = new Set(uniqueTokens);
        visibleTokens.forEach((t) => next.delete(t));
        setDraftSelected(next);
      } else {
        const next = new Set(draftSelected);
        visibleTokens.forEach((t) => next.delete(t));
        setDraftSelected(next);
      }
    } else {
      if (draftSelected === null) return;
      const next = new Set(draftSelected);
      visibleTokens.forEach((t) => next.add(t));
      if (next.size >= uniqueTokens.length && uniqueTokens.every((t) => next.has(t))) {
        setDraftSelected(null);
      } else {
        setDraftSelected(next);
      }
    }
  };

  const handleToggleToken = (token: string) => {
    let next: Set<string>;
    if (draftSelected === null) {
      next = new Set(uniqueTokens);
      next.delete(token);
    } else {
      next = new Set(draftSelected);
      if (next.has(token)) {
        next.delete(token);
      } else {
        next.add(token);
      }
    }
    if (next.size >= uniqueTokens.length && uniqueTokens.every((t) => next.has(t))) {
      setDraftSelected(null);
    } else {
      setDraftSelected(next);
    }
  };

  const handleApply = () => {
    const nextFilters = { ...filters };
    const cleanSearch = draftSearch.trim();
    const hasValueSubset = draftSelected !== null;

    if (!cleanSearch && !hasValueSubset) {
      delete nextFilters[columnKey];
    } else {
      nextFilters[columnKey] = {
        ...(cleanSearch ? { searchText: cleanSearch } : {}),
        ...(hasValueSubset ? { selectedValues: Array.from(draftSelected!) } : {})
      };
    }

    onChangeFilters(nextFilters);

    if (onChangeSort) {
      if (draftSort) {
        onChangeSort({ key: columnKey, direction: draftSort });
      } else if (sortState?.key === columnKey) {
        onChangeSort(null);
      }
    }
    setIsOpen(false);
  };

  const handleClearThisColumn = () => {
    const nextFilters = { ...filters };
    delete nextFilters[columnKey];
    onChangeFilters(nextFilters);
    if (onChangeSort && sortState?.key === columnKey) {
      onChangeSort(null);
    }
    setIsOpen(false);
  };

  const justifyClass =
    align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-between';

  return (
    <div className={`inline-flex items-center gap-1 w-full ${justifyClass} ${className}`}>
      <span className="truncate">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPopover}
        title={active ? 'Đang bật bộ lọc cột (bấm để chỉnh sửa)' : 'Lọc theo cột này'}
        aria-label="Mở phễu lọc cột"
        className={`shrink-0 p-1 rounded transition-colors cursor-pointer inline-flex items-center justify-center ${
          active
            ? 'bg-purple-700 text-white shadow-2xs hover:bg-purple-800'
            : 'text-slate-400 hover:text-purple-700 hover:bg-purple-100/70'
        }`}
      >
        <Filter className="w-3 h-3" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: popoverPos.top,
              left: popoverPos.left,
              transform: popoverPos.openAbove ? 'translateY(-100%)' : 'none',
              zIndex: 9999,
              width: 264
            }}
            className="bg-white rounded-xl border border-slate-200 shadow-2xl text-xs text-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header + Sort Controls */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <span className="font-bold text-slate-800 truncate flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">{label}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-0.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {onChangeSort && (
              <div className="px-2.5 py-2 border-b border-slate-100 grid grid-cols-2 gap-1.5 bg-white">
                <button
                  type="button"
                  onClick={() => setDraftSort(draftSort === 'asc' ? null : 'asc')}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                    draftSort === 'asc'
                      ? 'bg-purple-50 border-purple-400 text-purple-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ArrowUp className="w-3 h-3" />
                  <span>Tăng dần</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDraftSort(draftSort === 'desc' ? null : 'desc')}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                    draftSort === 'desc'
                      ? 'bg-purple-50 border-purple-400 text-purple-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ArrowDown className="w-3 h-3" />
                  <span>Giảm dần</span>
                </button>
              </div>
            )}

            {/* Column Search */}
            <div className="p-2.5 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApply();
                  }}
                  placeholder="Tìm giá trị trong cột..."
                  className="w-full pl-7 pr-7 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
                />
                {draftSearch && (
                  <button
                    type="button"
                    onClick={() => setDraftSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Select All + Unique Values List */}
            <div className="px-2.5 py-1.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-[11px] text-slate-700">
                <input
                  type="checkbox"
                  checked={allVisibleChecked}
                  onChange={handleToggleAllVisible}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span>Chọn tất cả ({visibleTokens.length})</span>
              </label>
              {draftSelected !== null && (
                <button
                  type="button"
                  onClick={() => setDraftSelected(null)}
                  className="text-[11px] font-semibold text-purple-700 hover:underline cursor-pointer"
                >
                  Đặt lại
                </button>
              )}
            </div>

            <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
              {visibleTokens.length === 0 ? (
                <div className="py-5 text-center text-[11px] text-slate-400 italic">
                  Không có giá trị phù hợp
                </div>
              ) : (
                visibleTokens.map((token) => {
                  const checked = isTokenChecked(token);
                  const count = valueCounts.get(token) || 0;
                  const text = displayCellFilterToken(token);
                  return (
                    <label
                      key={token}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg hover:bg-purple-50/70 cursor-pointer select-none transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleToken(token)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 shrink-0 cursor-pointer"
                        />
                        <span
                          className={`truncate text-[11px] ${
                            token === EMPTY_CELL_TOKEN ? 'italic text-slate-400' : 'text-slate-700'
                          }`}
                          title={text}
                        >
                          {text}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
                        {count}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-2.5 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleClearThisColumn}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold cursor-pointer transition-colors"
              >
                Xóa lọc
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold cursor-pointer shadow-xs transition-colors"
              >
                <Check className="w-3 h-3" />
                <span>Áp dụng</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
