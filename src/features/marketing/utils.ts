export const generateFieldName = (label: string) => {
  return label
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars except space and hyphen
    .trim()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .slice(0, 50); // Truncate
}

export const getSupabaseUrl = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
        console.error("VITE_SUPABASE_URL is not set in .env file");
        return '';
    }
    return supabaseUrl;
}
