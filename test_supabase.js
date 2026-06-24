import { createClient } from '@supabase/supabase-js'
const supabase = createClient('http://localhost', 'dummy', { auth: { experimental: { passkey: true } } })
console.log(Object.keys(supabase.auth).filter(k => k.toLowerCase().includes('passkey')))
