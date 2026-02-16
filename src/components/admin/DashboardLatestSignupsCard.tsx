import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus } from 'lucide-react';

interface RecentUser {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export default function DashboardLatestSignupsCard() {
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setUsers(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-6 pb-3 sm:pb-4">
        <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
          <div className="p-2 rounded-xl bg-chart-5/10">
            <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-chart-5 shrink-0" />
          </div>
          <span className="truncate">Últimos Cadastros</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between p-4 sm:p-6 pt-0">
        <div className="space-y-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            : users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {(user.full_name || 'U').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {user.full_name || 'Sem nome'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              ))}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-4 text-xs sm:text-sm" asChild>
          <Link to="/admin/students">Ver Todos os Alunos</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
