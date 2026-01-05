import { createClient } from '@supabase/supabase-js'

// Substitua o que está entre aspas pelos dados do seu Supabase
const supabaseUrl = 'https://xbttslpdmbzdfpyypdtj.supabase.co'
const supabaseKey = 'sb_publishable__kpSbFB6Awxp_FXp4sGAqA_HExhdvI0'

export const supabase = createClient(supabaseUrl, supabaseKey)
