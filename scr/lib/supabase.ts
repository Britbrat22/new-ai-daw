import { createClient } from '@supabase/supabase-js';

const url = (() => {
  try {
    // Vite only populates import.meta.env in the browser
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_SUPABASE_URL?.trim() || '';
    }
  } catch {}
  return '';
})();

const key = (() => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';
    }
  } catch {}
  return '';
})();

// Fallback to the hard-coded demo keys you already had
const supabaseUrl = url || 'https://yovxeluqgvndgadnixaf.databasepad.com';
const supabaseKey = key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImUzYzFiN2Y4LTRmMmUtNDIxYi05MzIyLWVjOWMxNTcyZGNlZSJ9.eyJwcm9qZWN0SWQiOiJ5b3Z4ZWx1cWd2bmRnYWRuaXhhZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY2OTcyMzM4LCJleHAiOjIwODIzMzIzMzgsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.4MIKROoXEQDf5IexgLpYOU4LCWa-97fpuFyN1cg0gqA';

export const supabase = createClient(supabaseUrl, supabaseKey);
