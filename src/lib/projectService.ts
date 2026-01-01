import { supabase } from "./supabase"
import type { Project } from "@/types/daw"

export async function saveProject(project: Project) {
  const { error } = await supabase
    .from("projects")
    .insert(project)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
