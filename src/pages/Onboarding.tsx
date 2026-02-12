import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import PhoneInput from '@/components/PhoneInput';
import { Lock, Eye, EyeOff, Calendar, Phone, Loader2 } from 'lucide-react';

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if user needs onboarding
    const needsOnboarding = user.user_metadata?.needs_onboarding;
    if (!needsOnboarding) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Update password
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
        data: { needs_onboarding: false },
      });

      if (passwordError) throw passwordError;

      // 2. Update profile with birth_date and phone
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          birth_date: birthDate || null,
          phone: phone || null,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // 3. Process course enrollments from imported_users
      const { data: importedUser } = await supabase
        .from('imported_users')
        .select('id, course_ids')
        .eq('auth_user_id', user.id)
        .single();

      if (importedUser && importedUser.course_ids?.length > 0) {
        for (const courseId of importedUser.course_ids) {
          await supabase
            .from('course_enrollments')
            .upsert(
              { user_id: user.id, course_id: courseId },
              { onConflict: 'user_id,course_id' }
            );
        }

        // Mark imported user as completed
        await supabase
          .from('imported_users')
          .update({ status: 'completed' })
          .eq('id', importedUser.id);
      }

      toast.success('Conta configurada com sucesso! Bem-vindo(a) ao Kanaflix Play!');
      navigate('/');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast.error(error.message || 'Erro ao configurar conta');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 content-container">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center mb-6">
          <Logo className="h-12 w-auto" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Configure sua conta
          </h1>
          <p className="text-muted-foreground">
            Olá, {user.user_metadata?.full_name || 'aluno'}! Complete seus dados para acessar seus cursos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Crie uma senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pl-10 pr-10 h-11"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirme a senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                className="pl-10 pr-10 h-11"
                minLength={6}
                required
              />
            </div>
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label htmlFor="birthDate" className="text-sm font-medium">
              Data de Nascimento
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>

          {/* Phone (WhatsApp) */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              WhatsApp
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <PhoneInput
                id="phone"
                value={phone}
                onChange={setPhone}
                className="pl-10 h-11"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-base font-medium"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Configurando...
              </>
            ) : (
              'Concluir e acessar cursos'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
