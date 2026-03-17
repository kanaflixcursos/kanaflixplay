import { useState, useMemo, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Trash2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────

export interface DataListColumn<T> {
  key: string;
  header: string;
  /** Render cell content */
  render: (item: T) => ReactNode;
  /** Hide on mobile (below md) */
  hideMobile?: boolean;
  /** Header alignment */
  align?: 'left' | 'center' | 'right';
  /** Fixed width class (e.g. "w-16") */
  width?: string;
}

export interface BulkAction {
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  onClick: (selectedIds: Set<string>) => void | Promise<void>;
}

export interface DataListProps<T extends { id: string }> {
  /** Card title */
  title: string;
  /** Column definitions */
  columns: DataListColumn<T>[];
  /** Data items */
  data: T[];
  /** Loading state */
  loading?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Client-side search filter fn */
  searchFilter?: (item: T, query: string) => boolean;
  /** Row click handler */
  onRowClick?: (item: T) => void;
  /** Enable multi-select checkboxes */
  selectable?: boolean;
  /** Bulk actions shown when items are selected */
  bulkActions?: BulkAction[];
  /** Empty state icon */
  emptyIcon?: ReactNode;
  /** Empty state message */
  emptyMessage?: string;
  /** Extra header actions (buttons etc) */
  headerActions?: ReactNode;
  /** Extra filter row content */
  filters?: ReactNode;
  /** Whether filters are active (shows badge) */
  hasActiveFilters?: boolean;
  /** Clear all filters callback */
  onClearFilters?: () => void;
}

// ─── Component ────────────────────────────────────────────────────

export function DataList<T extends { id: string }>({
  title,
  columns,
  data,
  loading = false,
  searchPlaceholder = 'Buscar...',
  searchFilter,
  onRowClick,
  selectable = false,
  bulkActions = [],
  emptyIcon,
  emptyMessage = 'Nenhum item encontrado',
  headerActions,
  filters,
  hasActiveFilters = false,
  onClearFilters,
}: DataListProps<T>) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search || !searchFilter) return data;
    return data.filter(item => searchFilter(item, search));
  }, [data, search, searchFilter]);

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(item => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action: BulkAction) => {
    await action.onClick(selectedIds);
    setSelectedIds(new Set());
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="dashboard-card-header">
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              {title}
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-xs font-normal">
                  <Filter className="h-3 w-3 mr-1" /> Filtros ativos
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {searchFilter && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
              )}
              {headerActions}
            </div>
          </div>

          {filters && (
            <div className="flex items-center gap-2 flex-wrap">
              {filters}
              {hasActiveFilters && onClearFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={onClearFilters}>
                  <X className="h-3 w-3 mr-1" /> Limpar
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="dashboard-card-content">
        {/* Bulk actions bar */}
        {selectable && selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-3 p-2 rounded-md bg-muted">
            <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
            {bulkActions.map((action, i) => (
              <Button
                key={i}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={() => handleBulkAction(action)}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Cancelar
            </Button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="text-center py-12 text-muted-foreground">
            {emptyIcon && <div className="mx-auto mb-3 opacity-30">{emptyIcon}</div>}
            <p>{emptyMessage}</p>
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectable && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  {columns.map(col => (
                    <TableHead
                      key={col.key}
                      className={[
                        col.hideMobile ? 'hidden md:table-cell' : '',
                        col.width || '',
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow
                    key={item.id}
                    data-state={selectedIds.has(item.id) ? 'selected' : undefined}
                    className={onRowClick ? 'cursor-pointer' : ''}
                    onClick={() => onRowClick?.(item)}
                  >
                    {selectable && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                    )}
                    {columns.map(col => (
                      <TableCell
                        key={col.key}
                        className={[
                          col.hideMobile ? 'hidden md:table-cell' : '',
                          col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {col.render(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
