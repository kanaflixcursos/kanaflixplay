import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import PhoneInput from '@/components/PhoneInput';
import { Calendar, Phone, Loader2 } from 'lucide-react';

export default function CompleteProfile() {
  const { user, recheckProfile } = useAuth();
  const navigate = useNavigate();
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      toast.error('Informe seu número de WhatsApp');
      return;
    }

    if (!birthDate) {
      toast.error('Informe sua data de nascimento');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          birth_date: birthDate,
          phone: phone,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await recheckProfile();
      toast.success('Perfil completado com sucesso!');
      navigate('/');
    } catch (error: any) {
      console.error('Complete profile error:', error);
      toast.error(error.message || 'Erro ao salvar perfil');
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
            Complete seu perfil
          </h1>
          <p className="text-muted-foreground">
            Olá, {user.user_metadata?.full_name || 'aluno'}! Preencha os dados abaixo para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              WhatsApp <span className="text-destructive">*</span>
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

          <div className="space-y-2">
            <Label htmlFor="birthDate" className="text-sm font-medium">
              Data de Nascimento <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
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
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Continuar'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
