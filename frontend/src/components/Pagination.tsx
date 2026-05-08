interface PaginationProps {
    page: number;
    totalItems: number;
    pageSize: number;
    onPrev: () => void;
    onNext: () => void;
}

export function Pagination({ page, totalItems, pageSize, onPrev, onNext }: PaginationProps) {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between mt-4">
            <button
                disabled={page === 0}
                onClick={onPrev}
                className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                Vorige
            </button>
            <span className="text-[10px] font-bold text-neutral-600 uppercase">
                Pagina {page + 1} / {totalPages}
            </span>
            <button
                disabled={(page + 1) * pageSize >= totalItems}
                onClick={onNext}
                className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                Volgende
            </button>
        </div>
    );
}
