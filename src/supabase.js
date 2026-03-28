import { createClient } from '@supabase/supabase-js';

// Get these from your Supabase project settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sclhzmgdafotyiynrjwr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_N1UhoXnqybNEFCGBMdWXWg_BujE6Eh-';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Storage helpers
export const uploadFile = async (bucket, path, file) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  return data;
};

export const getPublicUrl = (bucket, path) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
};
// Games API
export const gamesAPI = {
  // Get all games for current user
  list: async () => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get single game
  get: async (id) => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create or update game
  upsert: async (gameData) => {
    // If no ID, this is INSERT
    const { data, error } = await supabase
      .from('games')
      .insert(gameData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update existing game
  update: async (id, gameData) => {
    const { data, error } = await supabase
      .from('games')
      .update(gameData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete game
  delete: async (id) => {
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
export const teamsAPI = {
  list: async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*, players(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(team => ({ ...team, roster: team.players || [] }));
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('teams')
      .select('*, players(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { ...data, roster: data.players || [] };
  },

  create: async (teamData) => {
    const { data, error } = await supabase
      .from('teams')
      .insert(teamData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, teamData) => {
    const { data, error } = await supabase
      .from('teams')
      .update(teamData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  archive: async (id, userId) => {
    const { error } = await supabase
      .from('teams')
      .update({ archived: true, archived_at: new Date(), archived_by: userId })
      .eq('id', id);
    if (error) throw error;
  }
};
export default supabase;
