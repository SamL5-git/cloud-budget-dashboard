import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://skknfddyqmufsgeazsfs.supabase.co"
const supabaseKey = "sb_publishable_TZq7h0Z33RoC2dCaV4GxEA_zjCAh3Z2"

export const supabase = createClient(supabaseUrl, supabaseKey)