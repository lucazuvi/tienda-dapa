import { createClient } from '@supabase/supabase-js';

// Reemplazá estos valores con los que copiaste de tu panel de Supabase
const supabaseUrl = 'https://dlhlwqgzaitwdvlmunqc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsaGx3cWd6YWl0d2R2bG11bnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMzI4OTEsImV4cCI6MjEwNjYwODg5MX0.2XIKjZ0nJbCBdXimV35GXLHU_2YYzb_Y4zTHQnS3DQw';

export const supabase = createClient(supabaseUrl, supabaseKey);