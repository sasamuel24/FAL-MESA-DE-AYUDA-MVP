import { useState, useRef, useCallback, useEffect } from 'react';

interface ColumnWidth {
  [key: string]: number;
}

interface UseResizableColumnsProps {
  initialWidths: ColumnWidth;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
}

export const useResizableColumns = ({ 
  initialWidths, 
  minWidth = 80, 
  maxWidth = 400,
  storageKey 
}: UseResizableColumnsProps) => {
  // Cargar anchos desde localStorage si está disponible
  const getInitialWidths = () => {
    if (typeof window !== 'undefined' && storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          return { ...initialWidths, ...JSON.parse(stored) };
        } catch {
          return initialWidths;
        }
      }
    }
    return initialWidths;
  };

  const [columnWidths, setColumnWidths] = useState<ColumnWidth>(getInitialWidths);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleMouseDown = useCallback((columnKey: string, event: React.MouseEvent) => {
    event.preventDefault();
    setIsResizing(columnKey);
    setStartX(event.clientX);
    setStartWidth(columnWidths[columnKey] || 0);
  }, [columnWidths]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isResizing) return;

    const diff = event.clientX - startX;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + diff));
    
    setColumnWidths(prev => {
      const newWidths = {
        ...prev,
        [isResizing]: newWidth
      };
      
      // Guardar en localStorage si está disponible
      if (typeof window !== 'undefined' && storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(newWidths));
      }
      
      return newWidths;
    });
  }, [isResizing, startX, startWidth, minWidth, maxWidth, storageKey]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const getColumnStyle = (columnKey: string) => ({
    width: `${columnWidths[columnKey]}px`,
    minWidth: `${minWidth}px`,
    maxWidth: `${maxWidth}px`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  });

  const resetColumns = useCallback(() => {
    setColumnWidths(initialWidths);
    if (typeof window !== 'undefined' && storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [initialWidths, storageKey]);

  const ResizeHandle = ({ columnKey }: { columnKey: string }) => (
    <div
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 transition-colors duration-150 group-hover:bg-gray-300"
      onMouseDown={(e) => handleMouseDown(columnKey, e)}
      style={{
        background: isResizing === columnKey ? '#3B82F6' : 'transparent',
      }}
      title="Arrastrar para redimensionar columna"
    />
  );

  return {
    columnWidths,
    getColumnStyle,
    ResizeHandle,
    tableRef,
    isResizing: !!isResizing,
    resetColumns
  };
};
