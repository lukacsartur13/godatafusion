/* ============================================================
   TRANSACTIONAL EMAIL — provider abstraction.

   Two real providers, both plain HTTPS+JSON, so the endpoint carries
   ZERO dependencies. Selection is an environment variable, never a
   code change:

     MAIL_TRANSPORT = resend | postmark | console

   `console` is an explicitly marked development transport: it prints
   the whole submission (including file names and sizes) to the server
   log and reports `transport: 'console'` back to the caller, which the
   UI surfaces. It is refused in production unless MAIL_ALLOW_CONSOLE=1,
   because a silently-logged inquiry is a lost inquiry.

   Nothing here ever swallows a failure. If sending fails the handler
   returns 5xx and says so.
   ============================================================ */

export class MailError extends Error {
  constructor(message, { status = 502, detail } = {}) {
    super(message);
    this.name = 'MailError';
    this.status = status;
    this.detail = detail;
  }
}

/** Resolve the transport from the environment, or explain why we cannot. */
export function resolveTransport(env) {
  const explicit = (env.MAIL_TRANSPORT || '').trim().toLowerCase();
  const isProd = (env.NODE_ENV || env.CONTEXT) === 'production' || env.CONTEXT === 'production';

  const name = explicit || (isProd ? '' : 'console');

  if (!name) {
    throw new MailError(
      'Az üzenetküldés jelenleg nincs beállítva ezen a kiszolgálón.',
      { status: 503, detail: 'MAIL_TRANSPORT is not set. See .env.example.' },
    );
  }
  if (name === 'console' && isProd && env.MAIL_ALLOW_CONSOLE !== '1') {
    throw new MailError(
      'Az üzenetküldés jelenleg nincs beállítva ezen a kiszolgálón.',
      { status: 503, detail: 'Refusing the console transport in production. Set MAIL_TRANSPORT=resend|postmark.' },
    );
  }
  if (!TRANSPORTS[name]) {
    throw new MailError(
      'Az üzenetküldés jelenleg nincs beállítva ezen a kiszolgálón.',
      { status: 503, detail: `Unknown MAIL_TRANSPORT "${name}". Expected resend | postmark | console.` },
    );
  }
  return name;
}

/**
 * @param {object} msg  { subject, text, replyTo, attachments:[{filename, contentType, bytes}] }
 * @returns {Promise<{transport:string, id:string|null}>}
 */
export async function sendMail(msg, env) {
  const name = resolveTransport(env);
  const to = (env.CONTACT_TO || '').trim();
  const from = (env.CONTACT_FROM || '').trim();

  if (name !== 'console') {
    if (!to) throw new MailError('Az üzenetküldés jelenleg nincs beállítva ezen a kiszolgálón.',
      { status: 503, detail: 'CONTACT_TO is not set.' });
    if (!from) throw new MailError('Az üzenetküldés jelenleg nincs beállítva ezen a kiszolgálón.',
      { status: 503, detail: 'CONTACT_FROM is not set.' });
  }

  const id = await TRANSPORTS[name]({ ...msg, to, from }, env);
  return { transport: name, id };
}

const b64 = (bytes) => {
  // Chunked so a 4 MB attachment does not blow the argument limit.
  let out = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(out);
};

const TRANSPORTS = {
  /* ---------------------------------------------------------- resend */
  async resend(msg, env) {
    const key = env.RESEND_API_KEY;
    if (!key) throw new MailError('Az üzenetküldés jelenleg nincs beállítva ezen a kiszolgálón.',
      { status: 503, detail: 'RESEND_API_KEY is not set.' });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: msg.from,
        to: [msg.to],
        reply_to: msg.replyTo ? [msg.replyTo] : undefined,
        subject: msg.subject,
        text: msg.text,
        attachments: msg.attachments?.map((a) => ({
          filename: a.filename,
          content: b64(a.bytes),
        })),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new MailError('Az üzenetet nem sikerült elküldeni.', {
        status: res.status === 429 ? 429 : 502,
        detail: `resend ${res.status}: ${body?.message || 'unknown error'}`,
      });
    }
    return body?.id ?? null;
  },

  /* -------------------------------------------------------- postmark */
  async postmark(msg, env) {
    const key = env.POSTMARK_SERVER_TOKEN;
    if (!key) throw new MailError('Az üzenetküldés jelenleg nincs beállítva ezen a kiszolgálón.',
      { status: 503, detail: 'POSTMARK_SERVER_TOKEN is not set.' });

    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'x-postmark-server-token': key,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        From: msg.from,
        To: msg.to,
        ReplyTo: msg.replyTo || undefined,
        Subject: msg.subject,
        TextBody: msg.text,
        MessageStream: env.POSTMARK_STREAM || 'outbound',
        Attachments: msg.attachments?.map((a) => ({
          Name: a.filename,
          Content: b64(a.bytes),
          ContentType: a.contentType,
        })),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.ErrorCode) {
      throw new MailError('Az üzenetet nem sikerült elküldeni.', {
        status: res.status === 429 ? 429 : 502,
        detail: `postmark ${res.status}: ${body?.Message || 'unknown error'}`,
      });
    }
    return body?.MessageID ?? null;
  },

  /* ---------------------------------------------- console (dev only) */
  async console(msg) {
    const files = (msg.attachments || [])
      .map((a) => `    ${a.filename}  ${a.contentType}  ${a.bytes.length} B`)
      .join('\n');
    console.log(
      `\n[gdf:mail:console] ── DEV TRANSPORT — nothing was actually sent ──\n` +
      `  to:       ${msg.to || '(CONTACT_TO unset)'}\n` +
      `  reply-to: ${msg.replyTo || '—'}\n` +
      `  subject:  ${msg.subject}\n` +
      `${msg.text.split('\n').map((l) => `  │ ${l}`).join('\n')}\n` +
      (files ? `  attachments:\n${files}\n` : '  attachments: none\n') +
      `[gdf:mail:console] ─────────────────────────────────────────────\n`,
    );
    return null;
  },
};
