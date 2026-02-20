import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';
import { useTrackVisit } from '@/hooks/useTrackVisit';
import { motion } from 'framer-motion';

export default function Login() {
  useTrackVisit('/login');
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [resetSent, setResetSent] = useState(false);
  const [hotmartEmail, setHotmartEmail] = useState('');
  const [hotmartLoading, setHotmartLoading] = useState(false);
  const [hotmartSent, setHotmartSent] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.user_metadata?.needs_onboarding) {
        navigate('/onboarding');
      } else {
        navigate(redirectTo);
      }
    }
  }, [user, navigate, redirectTo]);

  const handleHotmartAccess = async () => {
    if (!hotmartEmail) {
      toast.error('Digite seu email');
      return;
    }
    setHotmartLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('hotmart-access', {
        body: { action: 'check', email: hotmartEmail },
      });
      if (error) throw error;
      if (!data.found) {
        toast.error('Email não encontrado na lista de acesso Hotmart.');
        setHotmartLoading(false);
        return;
      }
      if (data.completed) {
        toast.info('Você já completou o cadastro. Faça login normalmente.');
        setActiveTab('signin');
        setEmail(hotmartEmail);
        setHotmartLoading(false);
        return;
      }
      // Send magic link
      const { error: linkError } = await supabase.functions.invoke('hotmart-access', {
        body: { action: 'send_magic_link', email: hotmartEmail },
      });
      if (linkError) throw linkError;
      setHotmartSent(true);
      toast.success('Link de acesso enviado para seu email!');
    } catch (error: any) {
      const msg = error?.message || 'Erro ao processar acesso';
      toast.error(msg);
    }
    setHotmartLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast.error('Erro ao entrar: ' + error.message);
    } else {
      toast.success('Login realizado com sucesso!');
      navigate(redirectTo);
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Store redirect URL before signup
    if (redirectTo !== '/') {
      localStorage.setItem('kanaflix_redirect_after_confirm', redirectTo);
    }
    
    const { error } = await signUp(email, password, fullName, redirectTo);
    
    if (error) {
      toast.error('Erro ao criar conta: ' + error.message);
    } else {
      toast.success('Conta criada! Verifique seu email para confirmar.');
    }
    
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const baseUrl = import.meta.env.PROD 
      ? 'https://cursos.kanaflix.com.br'
      : window.location.origin;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: `${baseUrl}/reset-password`,
    });
    
    if (error) {
      toast.error('Erro ao enviar email: ' + error.message);
    } else {
      setResetSent(true);
      toast.success('Email enviado! Verifique sua caixa de entrada.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Theme Toggle - positioned absolutely */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle variant="outline" />
      </div>

      {/* Left side - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary/5"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <Logo className="h-16 w-auto mb-8" />
          <h1 className="text-3xl font-bold text-foreground text-center mb-4">
            Bem-vindo ao Kanaflix Play
          </h1>
          <p className="text-muted-foreground text-center text-lg max-w-md">
            Sua plataforma de cursos online com conteúdo de qualidade para impulsionar sua carreira.
          </p>
        </div>
      </motion.div>

      {/* Right side - Auth Form */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12"
      >
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Logo className="h-12 w-auto" />
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              {activeTab === 'signin' && 'Entre na sua conta'}
              {activeTab === 'signup' && 'Crie sua conta'}
              {activeTab === 'reset' && 'Recuperar senha'}
            </h2>
            <p className="text-muted-foreground">
              {activeTab === 'signin' && 'Acesse seus cursos e continue aprendendo'}
              {activeTab === 'signup' && 'Comece sua jornada de aprendizado hoje'}
              {activeTab === 'reset' && 'Enviaremos um link para redefinir sua senha'}
            </p>
          </div>

          {/* Tab Switcher - only show when not in reset mode */}
          {activeTab !== 'reset' && (
            <div className="flex p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('signin')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === 'signin'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === 'signup'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Criar Conta
              </button>
            </div>
          )}

          {/* Back button for reset mode */}
          {activeTab === 'reset' && (
            <button
              type="button"
              onClick={() => { setActiveTab('signin'); setResetSent(false); }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para login
            </button>
          )}

          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11"
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

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium" 
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>

              <button
                type="button"
                onClick={() => setActiveTab('reset')}
                className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Esqueceu sua senha?
              </button>

              {/* Hotmart Access */}
              <div className="relative my-2">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
                  ou
                </span>
              </div>

              {hotmartSent ? (
                <div className="text-center space-y-3 py-2">
                  <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Link de acesso enviado para <strong className="text-foreground">{hotmartEmail}</strong>. Verifique seu email.
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setHotmartSent(false)}>
                    Tentar outro email
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={hotmartEmail}
                      onChange={(e) => setHotmartEmail(e.target.value)}
                      placeholder="Email cadastrado na Hotmart"
                      className="pl-10 h-11"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={handleHotmartAccess}
                    disabled={hotmartLoading}
                  >
                    {hotmartLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      '🔥 Acesso Hotmart'
                    )}
                  </Button>
                </div>
              )}
            </form>
          )}

          {/* Reset Password Form */}
          {activeTab === 'reset' && (
            <div className="space-y-5">
              {resetSent ? (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground">Email enviado!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Verifique sua caixa de entrada e clique no link para redefinir sua senha.
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => { setActiveTab('signin'); setResetSent(false); }}
                  >
                    Voltar para login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail" className="text-sm font-medium">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="resetEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 text-base font-medium" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Sign Up Form */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  Nome Completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupEmail" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signupEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signupPassword" className="text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signupPassword"
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

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium" 
                disabled={isLoading}
              >
                {isLoading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground pt-4">
            Ao continuar, você concorda com nossos{' '}
            <a href="#" className="text-primary hover:underline">
              Termos de Serviço
            </a>{' '}
            e{' '}
            <a href="#" className="text-primary hover:underline">
              Política de Privacidade
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
