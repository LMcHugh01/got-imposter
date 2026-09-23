// supabase/functions/delete-account/index.ts
//
// Deletes the signed-in player's account. The website can't delete users
// itself (that needs the service role key, which must never reach the
// browser), so it calls this function with the player's own session.
// Deleting the auth user cascades to profiles, game_stats and honours.
//
// Deploy:  supabase functions deploy delete-account
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Not signed in' }, 401)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Who is asking? Verified from their own token, never from the request body.
  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data, error } = await asUser.auth.getUser()
  if (error || !data.user) return json({ error: 'Not signed in' }, 401)

  const admin = createClient(url, serviceKey)
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) return json({ error: 'Could not delete the account' }, 500)

  return json({ deleted: true })
})