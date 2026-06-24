import { createClient } from '@supabase/supabase-js'
const supabase = createClient('http://localhost', 'dummy', { auth: { experimental: { passkey: true } } })
console.log(Object.getPrototypeOf(supabase.auth)._listPasskeys.toString())
console.log(Object.getPrototypeOf(supabase.auth)._deletePasskey.toString())
