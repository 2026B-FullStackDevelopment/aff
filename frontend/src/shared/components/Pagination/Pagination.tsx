import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { cn } from '@/shared/utils';

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  itemLabel?: string;
  isDisabled?: boolean;
  className?: string;
  theme?: 'admin' | 'donor';
  onPageChange: (page: number) => void;
}

function buildPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PageItem[] = [1];

  if (currentPage > 3) {
    items.push('ellipsis-start');
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (currentPage < totalPages - 2) {
    items.push('ellipsis-end');
  }

  items.push(totalPages);

  return items;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  itemLabel = 'items',
  isDisabled = false,
  className,
  theme = 'donor',
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const firstItem =
    totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const lastItem = Math.min(currentPage * pageSize, totalItems);
  const pageItems = buildPageItems(currentPage, totalPages);

  function changePage(nextPage: number) {
    if (
      isDisabled ||
      nextPage < 1 ||
      nextPage > totalPages ||
      nextPage === currentPage
    ) {
      return;
    }

    onPageChange(nextPage);
  }

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6',
        theme === 'admin'
          ? 'border-[#dce3ec] bg-slate-50'
          : 'border-[#C1C8C2] bg-[#FFF6E3]',
        className,
      )}
    >
      <p className="text-sm text-[#414844]" aria-live="polite">
        Showing {firstItem}–{lastItem} of {totalItems} {itemLabel}
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={isDisabled || currentPage === 1}
          aria-label="Go to previous page"
          onClick={() => changePage(currentPage - 1)}
          className="size-8 border-[#727972] bg-transparent text-[#414844] transition-all duration-200 ease-out hover:bg-white hover:shadow-md active:scale-[0.98]"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>

        {pageItems.map((item) => {
          if (typeof item !== 'number') {
            return (
              <span
                key={item}
                className="flex size-8 items-center justify-center text-sm text-[#6B7280]"
                aria-hidden="true"
              >
                …
              </span>
            );
          }

          const isCurrent = item === currentPage;

          return (
            <Button
              key={item}
              type="button"
              variant={isCurrent ? 'default' : 'outline'}
              size="icon"
              disabled={isDisabled}
              aria-label={`Go to page ${item}`}
              aria-current={isCurrent ? 'page' : undefined}
              onClick={() => changePage(item)}
              className={cn(
                'size-8 transition-all duration-200 ease-out hover:shadow-md active:scale-[0.98]',
                isCurrent
                  ? theme === 'admin'
                    ? 'bg-[#5b7bc0] text-white hover:bg-[#4a6ab0]'
                    : 'bg-[#805300] text-white hover:bg-[#694400]'
                  : 'border-[#727972] bg-transparent text-[#414844] hover:bg-white',
              )}
            >
              {item}
            </Button>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={isDisabled || currentPage === totalPages}
          aria-label="Go to next page"
          onClick={() => changePage(currentPage + 1)}
          className="size-8 border-[#727972] bg-transparent text-[#414844] transition-all duration-200 ease-out hover:bg-white hover:shadow-md active:scale-[0.98]"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

export default Pagination;
