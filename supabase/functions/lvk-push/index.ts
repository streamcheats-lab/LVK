import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const json = (status: number, data: unknown) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8' },
});

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return json(405, { error: 'POST required' });
    const secret = Deno.env.get('LVK_WEBHOOK_SECRET');
    if (!secret) {
  return json(500, { error: 'Webhook secret not configured' });
}

const receivedSecret = req.headers.get('x-lvk-webhook-secret');

if (receivedSecret !== secret) {
  return json(401, {
    error: 'Webhook secret mismatch',
    message: 'Check webhook secret configuration'
  });
}

    const publicKey = Deno.env.get('LVK_VAPID_PUBLIC_KEY');
    const privateKey = Deno.env.get('LVK_VAPID_PRIVATE_KEY');
    const contact = Deno.env.get('LVK_VAPID_SUBJECT') || 'mailto:admin@example.com';
    if (!publicKey || !privateKey) {
  return json(500, { error: 'VAPID not configured' });
}

try {
  webpush.setVapidDetails(contact, publicKey, privateKey);
} catch (e) {
  console.error('VAPID initialization failed:', e);

  return json(500, {
    error: 'VAPID initialization failed',
    details: e instanceof Error ? e.message : String(e)
  });
}

const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return json(500, { error: 'Supabase server credentials missing' });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    let payload: any;
    try { payload = await req.json(); } catch { return json(400, { error: 'Invalid JSON' }); }
    if (payload?.type !== 'INSERT' || !payload.record) return json(200, { skipped: true });

    const table = payload.table;
    const record = payload.record;
    const sender = record.user_id;
    const recipients = new Set<string>();
    let title = 'LVK';
    let body = 'Новое сообщение';

    if (table === 'shadow_direct_messages') {
      const { data, error } = await admin.from('shadow_direct_chats')
        .select('user_a,user_b').eq('id', record.chat_id).maybeSingle();
      if (error) throw error;
      if (!data) return json(200, { skipped: 'chat missing' });
      if (data.user_a !== sender && data.user_b !== sender) return json(200, { skipped: 'invalid sender' });
      recipients.add(data.user_a === sender ? data.user_b : data.user_a);
      title = 'LVK · Личное сообщение';
      body = String(record.message || 'Новое сообщение').slice(0, 120);
    } else if (table === 'chat_messages') {
      const { data: members, error } = await admin.from('chat_members')
        .select('user_id').eq('group_id', record.group_id);
      if (error) throw error;
      for (const m of members || []) if (m.user_id !== sender) recipients.add(m.user_id);
      const { data: group, error: groupError } = await admin.from('chat_groups')
        .select('name').eq('id', record.group_id).maybeSingle();
      if (groupError) throw groupError;
      title = 'LVK · ' + String(group?.name || 'Группа').slice(0, 70);
      body = String(record.message || 'Новое сообщение').slice(0, 120);
    } else if (table === 'support_messages') {
      if (record.is_staff === true) {
        // support_messages.user_id is the customer owning this support thread.
        if (!record.user_id) return json(200, { skipped: 'support recipient missing' });
        recipients.add(record.user_id);
        title = 'LVK · Ответ поддержки';
        body = String(record.message || 'Новое сообщение от поддержки').slice(0, 120);
      }
      const { data: admins, error } = await admin.from('shadow_admins').select('user_id');
      if (error) throw error;
      for (const a of admins || []) if (a.user_id !== sender) recipients.add(a.user_id);
      title = 'LVK · Новое обращение';
      body = 'Новое сообщение в поддержку';
    } else if (table === 'chat_members') {
      if (record.user_id) recipients.add(record.user_id);
      title = 'LVK · Приглашение в группу';
      body = 'Вас добавили в группу';
    } else {
      return json(200, { skipped: 'unknown table' });
    }

    if (table === 'shadow_direct_messages' || table === 'chat_messages' || table === 'chat_members') {
      const ids = [...recipients];
      if (ids.length) {
        const { data: pro, error } = await admin.from('subscriptions')
          .select('user_id,starts_at,expires_at').in('user_id', ids);
        if (error) throw error;
        const now = Date.now();
        const active = new Set((pro || []).filter((s: any) =>
          new Date(s.expires_at).getTime() > now &&
          (!s.starts_at || new Date(s.starts_at).getTime() <= now)
        ).map((s: any) => s.user_id));
        for (const id of ids) if (!active.has(id)) recipients.delete(id);
      }
    }

    const ids = [...recipients];
    if (!ids.length) return json(200, { sent: 0, recipients: 0 });
    const { data: subs, error } = await admin.from('lvk_push_subscriptions')
      .select('endpoint,p256dh,auth_key,user_id').in('user_id', ids);
    if (error) throw error;
    let sent = 0;
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify({ title, body, tag: table + ':' + String(record.id || '') })
        );
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          const { error: deleteError } = await admin.from('lvk_push_subscriptions')
            .delete().eq('endpoint', sub.endpoint);
          if (deleteError) console.error('Could not remove expired subscription', deleteError);
        } else {
          console.error('Push failed', e);
        }
      }
    }
    return json(200, { sent, recipients: ids.length, subscriptions: (subs || []).length });
  } catch (e) {
    console.error('lvk-push request failed', e);
    return json(500, { error: 'Push handler failed; check function logs' });
  }
});
