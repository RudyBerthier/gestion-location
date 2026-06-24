import { GoTrueClient } from '@supabase/gotrue-js'
const client = new GoTrueClient({ url: 'http://localhost' })
const proto = Object.getPrototypeOf(client)
console.log(Object.getOwnPropertyNames(proto))
