import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useState, useEffect } from "react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number | undefined | null;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  className?: string;
  testIdPrefix?: string;
  showFirstLast?: boolean;
  showPageInput?: boolean;
}

export function PaginationControls({
  currentPage,
  totalPages,
  isLoading = false,
  onPageChange,
  className = "",
  testIdPrefix = "pagination",
  showFirstLast = true,
  showPageInput = false,
}: PaginationControlsProps) {
  const [inputPage, setInputPage] = useState<string>("");
  const [showInput, setShowInput] = useState(false);

  // Note: Bounds checking is now handled at the caller level to prevent infinite loops

  const handlePageInput = (value: string) => {
    setInputPage(value);
  };

  const handlePageSubmit = () => {
    const pageNum = parseInt(inputPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && totalPages && pageNum <= totalPages) {
      onPageChange(pageNum);
      setShowInput(false);
      setInputPage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePageSubmit();
    } else if (e.key === "Escape") {
      setShowInput(false);
      setInputPage("");
    }
  };

  // Don't render if data is loading or there's only 1 page (when totalPages is actually known)
  if (isLoading || (totalPages != null && totalPages <= 1)) {
    return null;
  }

  const isFirstPage = currentPage === 1;
  const isLastPage = totalPages ? currentPage === totalPages : false;

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {/* First Page Button */}
      {showFirstLast && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={isFirstPage}
          data-testid={`${testIdPrefix}-first`}
          title="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Previous Page Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage}
        data-testid={`${testIdPrefix}-prev`}
      >
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </Button>

      {/* Page Info / Input */}
      <div className="flex items-center gap-2">
        {showInput ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="1"
              max={totalPages || undefined}
              value={inputPage}
              onChange={(e) => handlePageInput(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={() => {
                setShowInput(false);
                setInputPage("");
              }}
              className="w-16 h-8 text-center"
              placeholder={currentPage.toString()}
              data-testid={`${testIdPrefix}-input`}
              autoFocus
            />
            <span className="text-sm text-muted-foreground">de {totalPages}</span>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (showPageInput) {
                setShowInput(true);
                setInputPage(currentPage.toString());
              }
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
            data-testid={`${testIdPrefix}-info`}
            disabled={!showPageInput}
          >
            Página {currentPage} de {totalPages}
          </Button>
        )}
      </div>

      {/* Next Page Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage}
        data-testid={`${testIdPrefix}-next`}
      >
        Siguiente
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Last Page Button */}
      {showFirstLast && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => totalPages && onPageChange(totalPages)}
          disabled={isLastPage || !totalPages}
          data-testid={`${testIdPrefix}-last`}
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}