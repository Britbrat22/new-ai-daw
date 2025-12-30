import { createClient } from '@supabase/supabase-js';

// Remove accidental space and prefer env vars (fallback to hard-coded for quick demo)
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://yovxeluqgvndgadnixaf.databasepad.com').trim();
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImUzYzFiN2Y4LTRmMmUtNDIxYi05MzIyLWVjOWMxNTcyZGNlZSJ9.eyJwcm9qZWN0SWQiOiJ5b3Z4ZWx1cWd2bmRnYWRuaXhhZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY2OTcyMzM4LCJleHAiOjIwODIzMzIzMzgsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.4MIKROoXEQDf5IexgLpYOU4LCWa-97fpuFyN1cg0gqA').trim();

export const supabase = createClient(supabaseUrl, supabaseKey);
