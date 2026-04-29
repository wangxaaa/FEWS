// supabaseConfig.js
// Konfigurasi Supabase untuk client-side dan server-side

export const supabaseConfig = {
  url: 'https://qegrytzjnqlngeqhjhhi.supabase.co/rest/v1',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZ3J5dHpqbnFsbmdlcWhqaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTM3OTMsImV4cCI6MjA5Mjc4OTc5M30.wgeB1t6QQVt66XdMfMdsgbJRjZ37TkOyMcLslUI1Ngw'
};

// Untuk environment variables (Node.js backend)
export const supabaseFromEnv = {
  url: process.env.SUPABASE_URL || 'https://qegrytzjnqlngeqhjhhi.supabase.co/rest/v1',
  anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZ3J5dHpqbnFsbmdlcWhqaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTM3OTMsImV4cCI6MjA5Mjc4OTc5M30.wgeB1t6QQVt66XdMfMdsgbJRjZ37TkOyMcLslUI1Ngw'
};
