import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Eye, Pencil, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import DashboardListCard, { DashboardListItem } from './DashboardListCard';

interface RecentUser {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function DashboardLatestSignups() {
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentUsers();
  }, []);

  const fetchRecentUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, email, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    setUsers(data || []);
    setLoading(false);
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (deleteConfirmEmail !== userEmail) {
      toast.error('O email não confere');
      return;
    }

    setDeletingUserId(userId);
    
    const { error } = await supabase.from('profiles').delete().eq('user_id', userId);

    if (error) {
      toast.error('Erro ao excluir perfil');
    } else {
      toast.success('Perfil excluído com sucesso');
      setUsers(users.filter(u => u.user_id !== userId));
    }
    setDeletingUserId(null);
    setDeleteConfirmEmail('');
  };

  return (
    <DashboardListCard
      title="Últimos Cadastros"
      icon={UserPlus}
      loading={loading}
      emptyMessage="Nenhum usuário cadastrado"
      actionLabel="Ver Usuários"
      actionLink="/admin/students"
    >
      {users.map((user) => (
        <DashboardListItem key={user.id}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
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
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(user.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link to={`/admin/students?view=${user.user_id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link to={`/admin/students?edit=${user.user_id}`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Para confirmar, digite o email do usuário:
                      <span className="block font-semibold mt-2 text-foreground break-words">"{user.email}"</span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    placeholder="Digite o email do usuário"
                    value={deleteConfirmEmail}
                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  />
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel onClick={() => setDeleteConfirmEmail('')}>
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(user.user_id, user.email || '')}
                      disabled={deletingUserId === user.user_id}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deletingUserId === user.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Excluir'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </DashboardListItem>
      ))}
    </DashboardListCard>
  );
}
