import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import StudentLayout from '@/components/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PhoneInput from '@/components/PhoneInput';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Camera, Loader2, BookOpen, MessageCircle, Mail, Phone, Calendar, User } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  birth_date: string | null;
}

interface EnrolledCourse {
  id: string;
  title: string;
  thumbnail_url: string | null;
  is_free: boolean;
}

export default function StudentProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [repliesCount, setRepliesCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchEnrolledCourses();
      fetchRepliesCount();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
      return;
    }

    setProfile(data);
    setFullName(data.full_name || '');
    setPhone(data.phone || '');
    setBirthDate(data.birth_date || '');
    setLoading(false);
  };

  const fetchEnrolledCourses = async () => {
    if (!user) return;

    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select(`
        course:courses(id, title, thumbnail_url)
      `)
      .eq('user_id', user.id);

    if (enrollments) {
      const courses = enrollments
        .filter((e: any) => e.course)
        .map((e: any) => ({
          id: e.course.id,
          title: e.course.title,
          thumbnail_url: e.course.thumbnail_url,
          is_free: true, // For now, all courses are free
        }));
      setEnrolledCourses(courses);
    }
  };

  const fetchRepliesCount = async () => {
    if (!user) return;

    // Count comments that are replies to user's comments
    const { data: userComments } = await supabase
      .from('lesson_comments')
      .select('id')
      .eq('user_id', user.id);

    if (userComments && userComments.length > 0) {
      const commentIds = userComments.map(c => c.id);
      
      const { count } = await supabase
        .from('lesson_comments')
        .select('*', { count: 'exact', head: true })
        .in('parent_id', commentIds);
      
      setRepliesCount(count || 0);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);

    try {
      // Convert to WebP using canvas
      const webpBlob = await convertToWebP(file);
      
      // Generate unique filename
      const fileName = `${user.id}/${Date.now()}.webp`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        try {
          const oldUrl = new URL(profile.avatar_url);
          const pathParts = oldUrl.pathname.split('/');
          const bucketIndex = pathParts.findIndex(part => part === 'avatars');
          if (bucketIndex !== -1) {
            const oldPath = pathParts.slice(bucketIndex + 1).join('/');
            await supabase.storage.from('avatars').remove([oldPath]);
          }
        } catch (e) {
          console.error('Error removing old avatar:', e);
        }
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, webpBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/webp',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
      toast.success('Avatar atualizado com sucesso!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const convertToWebP = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Create a square crop (center)
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;

        // Set canvas size (max 512px for avatars)
        const outputSize = Math.min(size, 512);
        canvas.width = outputSize;
        canvas.height = outputSize;

        if (ctx) {
          ctx.drawImage(img, x, y, size, size, 0, 0, outputSize, outputSize);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to convert to WebP'));
              }
            },
            'image/webp',
            0.85
          );
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          birth_date: birthDate || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const userInitials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
    <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm md:text-base">Gerencie suas informações pessoais</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h3 className="card-title">Informações Pessoais</h3>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={profile?.avatar_url || undefined} 
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Foto de Perfil</p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG ou WebP. Máximo 5MB.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Form Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nome Completo
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </Label>
                  <PhoneInput
                    id="phone"
                    value={phone}
                    onChange={setPhone}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Nascimento
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          {/* Activity Stats */}
          <Card>
            <CardHeader>
              <h3 className="card-title-compact">Atividade</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="stat-card-value text-2xl">{enrolledCourses.length}</p>
                  <p className="text-xs text-muted-foreground">Cursos matriculados</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="stat-card-value text-2xl">{repliesCount}</p>
                  <p className="text-xs text-muted-foreground">Respostas recebidas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enrolled Courses */}
          {enrolledCourses.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="card-title-compact">Meus Cursos</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {enrolledCourses.map((course) => (
                  <Link key={course.id} to={`/courses/${course.id}`} className="flex items-center gap-3 hover:bg-accent rounded-lg p-1 -m-1 transition-colors">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{course.title}</p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    </StudentLayout>
  );
}
