import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { translateError } from '@/lib/translate-error';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has a valid recovery session
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      } else if (session) {
        setIsValidSession(true);
      }
    });

    // Also check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidSession(true);
      }
    });
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error('Erro ao redefinir senha: ' + error.message);
    } else {
      setIsSuccess(true);
      toast.success('Senha redefinida com sucesso!');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle variant="outline" />
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <Logo className="h-16 w-auto mb-8" />
          <h1 className="text-3xl font-bold text-foreground text-center mb-4">
            Redefinir Senha
          </h1>
          <p className="text-muted-foreground text-center text-lg max-w-md">
            Crie uma nova senha segura para sua conta.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Logo className="h-12 w-auto" />
          </div>

          {isSuccess ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  Senha redefinida!
                </h2>
                <p className="text-muted-foreground mt-2">
                  Sua senha foi alterada com sucesso. Você já pode fazer login com a nova senha.
                </p>
              </div>
              <Button 
                className="w-full h-11 text-base font-medium"
                onClick={() => navigate('/login')}
              >
                Ir para login
              </Button>
            </div>
          ) : !isValidSession ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                <Lock className="h-10 w-10 text-destructive" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  Link inválido ou expirado
                </h2>
                <p className="text-muted-foreground mt-2">
                  O link de recuperação de senha expirou ou é inválido. Por favor, solicite um novo link.
                </p>
              </div>
              <Button 
                className="w-full h-11 text-base font-medium"
                onClick={() => navigate('/login')}
              >
                Voltar para login
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">
                  Nova senha
                </h2>
                <p className="text-muted-foreground">
                  Digite sua nova senha abaixo
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Nova Senha
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
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirmar Senha
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

                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Salvando...' : 'Redefinir senha'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}