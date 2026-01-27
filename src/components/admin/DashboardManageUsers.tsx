import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Users, Eye, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email?: string;
}

export default function DashboardManageUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    // Get profiles with email
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, email')
      .order('created_at', { ascending: false })
      .limit(5);

    if (profiles) {
      setUsers(profiles.map(p => ({ ...p, email: p.email || '' })));
    }
    setLoading(false);
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (deleteConfirmEmail !== userEmail) {
      toast.error('O email não confere');
      return;
    }

    setDeletingUserId(userId);
    
    // Delete profile (cascade should handle related data)
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

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Gerenciar Usuários</span>
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
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <span className="truncate">Usuários</span>
        </CardTitle>
        <Button variant="outline" size="sm" className="shrink-0 text-xs sm:text-sm h-8" asChild>
          <Link to="/admin/students">Ver Todos</Link>
        </Button>
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
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate">
                    {user.full_name || 'Sem nome'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" asChild>
                    <Link to={`/admin/students?view=${user.user_id}`}>
                      <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" asChild>
                    <Link to={`/admin/students?edit=${user.user_id}`}>
                      <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
