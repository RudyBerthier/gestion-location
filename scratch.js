import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envContent = fs.readFileSync('.env', 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...vals] = line.split('=')
    env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '')
  }
})

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function test() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1)
  if (error) console.error(error)
  else console.log("KEYS:", Object.keys(data[0] || {}))
}
test()
