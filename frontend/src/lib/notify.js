import { supabase } from './supabase'

const ADMIN_EMAIL = 'hasan.akbar@hum.tv'

export async function notifyAdmin(type, title, body) {
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email === ADMIN_EMAIL) return // don't notify admin about their own actions
  supabase.from('notifications').insert([{
    type,
    title,
    body,
    recipient: ADMIN_EMAIL,
    created_by_email: user?.email || 'unknown',
  }]).then(() => {}) // fire and forget — don't block the UI
}
