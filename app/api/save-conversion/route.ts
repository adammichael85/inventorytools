import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Save conversion
    const { error: convError } = await supabase.from('conversions').insert({
      user_id: body.user_id,
      address: body.address,
      rooms: body.rooms,
      duration_seconds: body.duration_seconds,
      file_path: body.file_path || null,
      converted_by: body.converted_by || null,
      extracted_text: body.extracted_text ? body.extracted_text.slice(0, 100000) : null,
      converted_json: body.converted_json || null,
      pdf_path: body.pdf_path || null,
      type: body.type || 'pdf',
      property_size: body.property_size || null,
      furnished: body.furnished || null,
      audio_length_seconds: body.audio_length_seconds || null,
      page_count: body.page_count || null,
      cost: body.cost ? Number(body.cost) : 4.00,
    })
    if (convError) throw new Error(convError.message)

    // Deduct 1 credit
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', body.user_id)
      .single()
    if (profileError) throw new Error(profileError.message)

    const conversionCost = body.cost ? Number(body.cost) : 4.00
    const newCredits = Math.max(0, (Number(profile.balance) || 0) - conversionCost)
    await supabase.from('profiles').update({ balance: newCredits }).eq('id', body.user_id)

    // Low balance alert check
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('company_name, low_balance_threshold, low_balance_alert_sent')
        .eq('id', body.user_id)
        .single()

      if (userProfile?.company_name && userProfile.low_balance_threshold != null) {
        const threshold = Number(userProfile.low_balance_threshold)
        const wasBelow = newCredits < threshold

        if (wasBelow && !userProfile.low_balance_alert_sent) {
          // Get all admins for this company
          const { data: admins } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('company_name', userProfile.company_name)
            .eq('role', 'admin')

          if (admins && admins.length > 0) {
            const { data: { users } } = await supabase.auth.admin.listUsers()
            const adminEmails = admins
              .map(a => users.find((u: any) => u.id === a.id)?.email)
              .filter(Boolean)

            for (const email of adminEmails) {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
                body: JSON.stringify({
                  from: 'noreply@inventorytools.co.uk',
                  to: email,
                  subject: `Low balance alert — ${userProfile.company_name}`,
                  html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#ffffff;padding:32px 40px;text-align:center;border-bottom:1px solid #f0f0f0;">
      <img src="https://inventorytools.co.uk/logo-email-full.png" width="200" alt="InventoryTools" style="display:block;margin:0 auto;height:auto;">
    </div>
    <div style="padding:40px;">
      <h2 style="color:#1a1a2e;font-size:20px;font-weight:700;margin:0 0 12px;">Your balance is running low</h2>
      <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">Your ${userProfile.company_name} account balance has dropped below your alert threshold of £${threshold.toFixed(2)}. Current balance: £${newCredits.toFixed(2)}. Top up to keep converting without interruption.</p>
      <a href="https://www.inventorytools.co.uk/dashboard" style="display:inline-block;background:#FD6A02;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">Top up balance</a>
    </div>
    <div style="background:#f5f5f5;padding:20px 40px;text-align:center;">
      <p style="color:#aaa;font-size:11px;margin:0;">© ${new Date().getFullYear()} InventoryTools · <a href="https://inventorytools.co.uk" style="color:#FD6A02;text-decoration:none;">inventorytools.co.uk</a></p>
    </div>
  </div>
</body>
</html>`
                })
              })
            }
          }

          await supabase.from('profiles').update({ low_balance_alert_sent: true }).eq('company_name', userProfile.company_name)
        } else if (!wasBelow && userProfile.low_balance_alert_sent) {
          // Reset flag once balance is topped back up above threshold
          await supabase.from('profiles').update({ low_balance_alert_sent: false }).eq('company_name', userProfile.company_name)
        }
      }
    } catch (e) { console.log('Low balance alert check failed:', e) }

    // Update persistent stats
    try {
      const { data: existing } = await supabase.from('user_stats').select('*').eq('user_id', body.user_id).single()
      if (existing) {
        await supabase.from('user_stats').update({
          total_conversions: (existing.total_conversions || 0) + 1,
          total_rooms: (existing.total_rooms || 0) + (body.rooms || 0),
          total_duration_seconds: (existing.total_duration_seconds || 0) + (body.duration_seconds || 0),
          total_spend: (existing.total_spend || 0) + conversionCost,
          updated_at: new Date().toISOString()
        }).eq('user_id', body.user_id)
      } else {
        await supabase.from('user_stats').insert({
          user_id: body.user_id,
          total_conversions: 1,
          total_rooms: body.rooms || 0,
          total_duration_seconds: body.duration_seconds || 0,
          total_spend: conversionCost
        })
      }
    } catch(e) { console.log('Stats update failed:', e) }

    return NextResponse.json({ ok: true, balance: newCredits })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
