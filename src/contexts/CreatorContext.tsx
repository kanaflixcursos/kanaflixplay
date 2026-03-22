import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CreatorInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  status: string;
  user_id: string;
}

interface CreatorSettings {
  platform_name: string | null;
  platform_description: string | null;
  primary_color: string | null;
  logo_url: string | null;
  pandavideo_api_key: string | null;
  resend_api_key: string | null;
  sender_email: string | null;
  sender_name: string | null;
  gtm_container_id: string | null;
  production_url: string | null;
}

interface CreatorContextType {
  creator: CreatorInfo | null;
  settings: CreatorSettings | null;
  creatorId: string | null;
  loading: boolean;
}

const CreatorContext = createContext<CreatorContextType>({
  creator: null,
  settings: null,
  creatorId: null,
  loading: true,
});

/**
 * Provider for store pages: resolves creator from URL slug
 */
export function StoreCreatorProvider({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [settings, setSettings] = useState<CreatorSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }

    const fetch = async () => {
      const { data: c } = await supabase
        .from('creators')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .single();

      if (c) {
        setCreator(c as CreatorInfo);
        const { data: s } = await supabase
          .from('creator_settings')
          .select('*')
          .eq('creator_id', c.id)
          .single();
        setSettings(s as CreatorSettings | null);
      }
      setLoading(false);
    };
    fetch();
  }, [slug]);

  return (
    <CreatorContext.Provider value={{ creator, settings, creatorId: creator?.id ?? null, loading }}>
      {children}
    </CreatorContext.Provider>
  );
}

/**
 * Provider for creator dashboard: resolves from authenticated user
 */
export function AuthCreatorProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [settings, setSettings] = useState<CreatorSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetch = async () => {
      const { data: c } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (c) {
        setCreator(c as CreatorInfo);
        const { data: s } = await supabase
          .from('creator_settings')
          .select('*')
          .eq('creator_id', c.id)
          .single();
        setSettings(s as CreatorSettings | null);
      }
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  return (
    <CreatorContext.Provider value={{ creator, settings, creatorId: creator?.id ?? null, loading }}>
      {children}
    </CreatorContext.Provider>
  );
}

export function useCreator() {
  return useContext(CreatorContext);
}
