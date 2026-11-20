import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ooxshxykdujgxcyezofo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veHNoeHlrZHVqZ3hjeWV6b2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzODQ2MjksImV4cCI6MjEwOTk2MDYyOX0.sHcd4AHqEiCKsMMMM2L8muhpZ_gwPhQJ1-qhHtcKyvo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'syndicate_auth_token',
  },
});
