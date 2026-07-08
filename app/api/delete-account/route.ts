import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()
    if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

    // Verify caller is authenticated and owns this user_id
    const authHeader = req.headers.get('authorization')
    const authToken = authHeader?.replace('Bearer ', '').trim()
    if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const authVerifyClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user: authUser } } = await authVerifyClient.auth.getUser(authToken)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Allow self-deletion, OR an admin deleting a teammate within their own company
    if (authUser.id !== user_id) {
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('role, company_name')
        .eq('id', authUser.id)
        .single()

      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('company_name, role')
        .eq('id', user_id)
        .single()

      const isAdmin = callerProfile?.role === 'admin'
      const sameCompany = callerProfile?.company_name && callerProfile.company_name === targetProfile?.company_name
      const targetIsAdmin = targetProfile?.role === 'admin'

      if (!isAdmin || !sameCompany) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (targetIsAdmin) {
        return NextResponse.json({ error: 'Cannot delete another admin account' }, { status: 403 })
      }
    }

    // Get all file paths to delete from storage
    const { data: conversions } = await supabase
      .from('conversions')
      .select('file_path')
      .eq('user_id', user_id)

    // Delete files from storage
    if (conversions && conversions.length > 0) {
      const paths = conversions.map((c: any) => c.file_path).filter(Boolean)
      if (paths.length > 0) {
        await supabase.storage.from('documents').remove(paths)
      }
    }

    // Note: conversions and user_stats are intentionally NOT deleted here.
    // Their user_id foreign key is set to ON DELETE SET NULL, so removing the
    // Auth user below will automatically detach (not destroy) their records —
    // preserving company business data (reports, stats) after someone leaves.
    await supabase.from('profiles').delete().eq('id', user_id)

    // Delete the auth user
    await supabase.auth.admin.deleteUser(user_id)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
