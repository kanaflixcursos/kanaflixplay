import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import SalesTable, { fetchSalesData, Sale } from './SalesTable';

const PAGE_SIZE = 20;

export default function DashboardSalesTable() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const loadSales = async () => {
    setLoading(true);
    const data = await fetchSalesData(page, PAGE_SIZE);
    setSales(data.sales);
    setTotalCount(data.totalCount);
    setLoading(false);
  };

  useEffect(() => {
    loadSales();
  }, [page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-6 pb-3 sm:pb-4">
        <CardTitle className="flex items-center gap-3 text-left">
          <div className="p-2 rounded-xl bg-chart-4/10">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-chart-4 shrink-0" />
          </div>
          <span className="stat-card-label">Últimas Vendas</span>
        </CardTitle>
        <Button variant="outline" size="sm" className="shrink-0 text-xs sm:text-sm h-8" asChild>
          <Link to="/admin/orders">Todas as Vendas</Link>
        </Button>
      </CardHeader>
      <CardContent className="dashboard-card-content">
        <SalesTable
          sales={sales}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRefresh={loadSales}
        />
      </CardContent>
    </Card>
  );
}
