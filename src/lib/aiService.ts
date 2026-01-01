import { supabase } from "./supabase"

export interface AIProcessResult {
  success: boolean
  action: string
  message?: string
  data?: Record<string, any>
}

export async function processAI(action: string): Promise<AIProcessResult> {
  return {
    success: true,
    action,
    message: "AI placeholder response",
  }
}
