import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, ExternalLink, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecentUser {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function DashboardRecentSignups() {
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentUsers();
  }, []);

  const fetchRecentUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    setUsers(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Últimos Cadastros</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6 sm:py-8 p-4 sm:p-6 pt-0">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="truncate">Últimos Cadastros</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum usuário cadastrado
          </p>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {user.full_name?.slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">
                      {user.full_name || 'Sem nome'}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(user.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" asChild>
                  <Link to={`/admin/students?view=${user.user_id}`}>
                    <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
