import nodemailer from 'nodemailer'

let transport
function getTransport() {
  const { SMTP_HOST, SMTP_PORT = '587', SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    throw new Error('SMTP no configurado: completa SMTP_HOST, SMTP_USER, SMTP_PASSWORD y SMTP_FROM en backend/.env')
  }
  const port = Number(SMTP_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT inválido')
  if (!transport) transport = nodemailer.createTransport({
    host: SMTP_HOST, port, secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    connectionTimeout: 12000, greetingTimeout: 12000, socketTimeout: 15000,
  })
  return { client: transport, from: SMTP_FROM }
}

export async function enviarCodigoVerificacion(correo, codigo) {
  const { client, from } = getTransport()
  const info = await client.sendMail({
    from, to: correo,
    subject: 'SIGMA-Aqua | Verifica tu correo electrónico',
    text: `Tu código de verificación de SIGMA-Aqua es: ${codigo}\n\nVence en 10 minutos. Si no solicitaste este registro, ignora este mensaje.`,
    html: `<div style="background:#f2f7fa;padding:32px 12px;font-family:Arial,sans-serif;color:#17334a"><div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #dce9f0"><div style="background:#0b3550;color:#fff;padding:24px 30px"><div style="font-size:13px;letter-spacing:2px;color:#89d9e9">SIGMA-AQUA</div><h1 style="font-size:23px;margin:9px 0 0">Verificación de correo</h1></div><div style="padding:28px 30px"><p>Utiliza este código para confirmar tu cuenta:</p><div style="background:#eaf6fa;border-radius:12px;padding:18px;text-align:center;font-size:36px;font-weight:bold;letter-spacing:8px;color:#0b5277">${codigo}</div><p style="font-size:14px;color:#526d7f">El código vence en <strong>10 minutos</strong>.</p><p style="font-size:13px;color:#718897">Si no solicitaste esta cuenta, puedes ignorar este mensaje.</p></div><div style="background:#f7fafc;padding:15px 30px;font-size:12px;color:#718897">Mensaje automático · SIGMA-Aqua</div></div></div>`,
  })
  if (!info.accepted?.some(address => address.toLowerCase() === correo.toLowerCase())) {
    throw new Error('El servidor de correo no aceptó al destinatario')
  }
}
