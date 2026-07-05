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
    if (!authUser || authUser.id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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

    // Delete all user data
    await supabase.from('conversions').delete().eq('user_id', user_id)
    await supabase.from('user_stats').delete().eq('user_id', user_id)
    await supabase.from('profiles').delete().eq('id', user_id)

    // Delete the auth user
    await supabase.auth.admin.deleteUser(user_id)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[API Error]', path, err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
