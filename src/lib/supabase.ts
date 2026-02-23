import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Supabase env vars not configured");
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export interface StyleProfile {
  id?: string;
  user_id: string;
  height?: string;
  weight?: string;
  age?: string;
  size?: string;
  shoe_size?: string;
  style_preferences?: string[];
  color_preferences?: string[];
  avoided_styles?: string[];
  created_at?: string;
}

export interface SavedOutfit {
  id?: string;
  user_id: string;
  title: string;
  occasion?: string;
  description?: string;
  items?: OutfitItem[];
  created_at?: string;
}

export interface OutfitItem {
  name: string;
  beymen_link?: string;
  zara_link?: string;
  mango_link?: string;
}

export function getUserId(): string {
  if (typeof window === "undefined") return "";
  let userId = localStorage.getItem("styleai_user_id");
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("styleai_user_id", userId);
  }
  return userId;
}

export async function saveStyleProfile(
  profile: StyleProfile
): Promise<StyleProfile | null> {
  try {
    const { data, error } = await getSupabase()
      .from("style_profiles")
      .upsert(profile, { onConflict: "user_id" })
      .select()
      .single();
    if (error) {
      console.error("Error saving profile:", error);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function getStyleProfile(
  userId: string
): Promise<StyleProfile | null> {
  try {
    const { data, error } = await getSupabase()
      .from("style_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      console.error("Error fetching profile:", error);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function saveOutfit(
  outfit: SavedOutfit
): Promise<SavedOutfit | null> {
  try {
    const { data, error } = await getSupabase()
      .from("saved_outfits")
      .insert(outfit)
      .select()
      .single();
    if (error) {
      console.error("Error saving outfit:", error);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function getSavedOutfits(
  userId: string
): Promise<SavedOutfit[]> {
  try {
    const { data, error } = await getSupabase()
      .from("saved_outfits")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching outfits:", error);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function deleteOutfit(outfitId: string): Promise<boolean> {
  try {
    const { error } = await getSupabase()
      .from("saved_outfits")
      .delete()
      .eq("id", outfitId);
    if (error) {
      console.error("Error deleting outfit:", error);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
