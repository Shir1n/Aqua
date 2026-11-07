import type { Candidato, Solicitud, Usuario } from '../types'

function escapar(valor: unknown): string {
  return String(valor ?? 'No informado').replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caracter] || caracter)
}

function fecha(valor?: string | null): string {
  if (!valor) return 'No informada'
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(valor)
  const date = new Date(soloFecha ? `${valor}T12:00:00` : valor)
  return Number.isNaN(date.getTime()) ? escapar(valor) : escapar(date.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }))
}

function campo(etiqueta: string, valor: unknown): string {
  return `<div class="campo"><div class="etiqueta">${escapar(etiqueta)}</div><div class="valor">${escapar(valor || 'No informado')}</div></div>`
}

export function generarInformeSolicitud(solicitud: Solicitud, candidato: Candidato | null, usuario: Usuario | null): string {
  const hoy = new Date()
  const emitido = hoy.toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' })
  const estado = solicitud.estado
  const claseEstado = estado === 'Finalizada' ? 'finalizada' : estado === 'En proceso' ? 'proceso' : 'pendiente'
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Informe de solicitud ${escapar(solicitud.id)} · SIGMA-Aqua</title>
<style>
@page { size: A4; margin: 16mm 16mm 18mm; }
* { box-sizing: border-box; }
body { margin: 0; color: #233449; background: #edf2f7; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.55; }
.hoja { max-width: 210mm; min-height: 270mm; margin: 25px auto; padding: 22mm 17mm; background: white; box-shadow: 0 12px 35px #173b5820; }
.marca { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding-bottom: 20px; border-bottom: 3px solid #087fa5; }
.logo { font-size: 25px; font-weight: 800; letter-spacing: -.7px; color: #073f64; }
.logo span { color: #00a0c6; }
.submarca { color: #65788a; font-size: 9px; text-transform: uppercase; letter-spacing: 2px; }
.folio { text-align: right; color: #65788a; font-size: 10px; }
.folio strong { display: block; color: #073f64; font-size: 17px; }
.titulo { margin: 25px 0 8px; font-size: 23px; line-height: 1.25; color: #073f64; }
.descripcion { color: #65788a; margin: 0 0 23px; }
.resumen { background: #eef7fa; border-left: 4px solid #0789ae; padding: 14px 17px; display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 25px; }
.resumen .mini { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #567184; }
.resumen .principal { font-size: 14px; font-weight: 700; color: #073f64; }
.estado { border-radius: 30px; padding: 5px 12px; font-weight: bold; font-size: 10px; white-space: nowrap; }
.estado.finalizada { background: #d9f4e7; color: #146c43; }
.estado.proceso { background: #dceefa; color: #135c89; }
.estado.pendiente { background: #fff1d4; color: #895800; }
.seccion { margin-top: 23px; break-inside: avoid; page-break-inside: avoid; }
.seccion h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 1.3px; color: #075f81; border-bottom: 1px solid #d8e4ec; padding-bottom: 8px; margin: 0 0 12px; }
.grilla { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.campo { min-width: 0; }
.etiqueta { font-size: 9px; color: #738393; text-transform: uppercase; letter-spacing: .6px; }
.valor { color: #25394e; font-weight: 600; overflow-wrap: anywhere; white-space: pre-wrap; }
.nota { padding: 12px 14px; background: #f5f8fa; border: 1px solid #e4ebf0; border-radius: 4px; white-space: pre-wrap; overflow-wrap: anywhere; }
.pie { margin-top: 34px; border-top: 1px solid #d8e4ec; padding-top: 12px; display: flex; justify-content: space-between; gap: 15px; color: #788795; font-size: 9px; }
.acciones { text-align: center; padding: 16px; }
.acciones button { background: #076b91; color: white; border: 0; border-radius: 5px; padding: 12px 22px; font-size: 14px; cursor: pointer; }
@media print { body { background: white; print-color-adjust: exact; -webkit-print-color-adjust: exact; } .hoja { margin: 0; padding: 0; min-height: 0; max-width: none; box-shadow: none; } .acciones { display: none; } }
</style></head><body>
<div class="acciones"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>
<main class="hoja">
<header class="marca"><div><div class="logo">SIGMA<span>-Aqua</span></div><div class="submarca">Gestión de evaluaciones</div></div><div class="folio">N.º de solicitud<strong>#${escapar(solicitud.id)}</strong></div></header>
<h1 class="titulo">Informe de evaluación psicolaboral</h1><p class="descripcion">Resumen administrativo de evaluación psicolaboral · Documento generado desde SIGMA-Aqua</p>
<div class="resumen"><div><div class="mini">Candidato</div><div class="principal">${escapar(candidato?.nombre || solicitud.candidato_nombre)}</div><div>${escapar(solicitud.cargo)}</div></div><span class="estado ${claseEstado}">${escapar(estado)}</span></div>
${solicitud.evaluacion?.borrador ? '<p class="nota"><strong>BORRADOR:</strong> Evaluación aún no finalizada. No utilizar como informe definitivo.</p>' : ''}
<section class="seccion"><h2>01 · Antecedentes de la solicitud</h2><div class="grilla">
${campo('Folio', `#${solicitud.id}`)}${campo('Fecha de solicitud', fecha(solicitud.fecha_solicitud))}
${campo('Cargo solicitado', solicitud.cargo)}${campo('Familia de cargo', solicitud.familia_cargo)}
${campo('Responsable', solicitud.responsable_nombre || 'Sin asignar')}${campo('Estado', solicitud.estado)}
</div></section>
<section class="seccion"><h2>02 · Información del candidato</h2><div class="grilla">
${campo('Nombre completo', candidato?.nombre || solicitud.candidato_nombre)}${campo('Correo electrónico', candidato?.correo || 'No disponible')}
${campo('Teléfono', candidato?.telefono || 'No disponible')}${campo('Cargo registrado', candidato?.cargo || solicitud.cargo)}
</div></section>
<section class="seccion"><h2>03 · Evaluación psicolaboral</h2><div class="grilla">
${campo('Fecha de evaluación', solicitud.evaluacion?.fecha_evaluacion ? fecha(solicitud.evaluacion.fecha_evaluacion) : 'Pendiente')}
${campo('Resultado general', solicitud.evaluacion?.resultado || 'Pendiente')}
${campo('Estado de evaluación', solicitud.evaluacion?.estado || 'Sin evaluación registrada')}
</div><div style="margin-top:12px" class="etiqueta">Observaciones de evaluación</div><div class="nota">${escapar(solicitud.evaluacion?.observaciones || 'Sin observaciones registradas')}</div></section>
<section class="seccion"><h2>04 · Competencias y recomendaciones</h2><div class="grilla">${Object.entries((()=>{try{return JSON.parse(solicitud.evaluacion?.competencias||'{}') as Record<string,number>}catch{return {}}})()).filter(([,n])=>n>0).map(([c,n])=>campo(c,`${n} / 5`)).join('')||campo('Competencias','Sin puntuaciones registradas')}</div><div style="margin-top:12px" class="etiqueta">Recomendaciones</div><div class="nota">${escapar(solicitud.evaluacion?.recomendaciones||'Sin recomendaciones registradas')}</div></section>
<section class="seccion"><h2>05 · Observaciones de la solicitud</h2><div class="nota">${escapar(solicitud.observaciones || 'Sin observaciones registradas')}</div></section>
<section class="seccion"><h2>06 · Emisión y trazabilidad</h2><div class="grilla">
${campo('Emitido por', usuario?.nombre || 'No disponible')}${campo('Rol', usuario?.rol || 'No disponible')}
${campo('Correo del emisor', usuario?.correo || 'No disponible')}${campo('Fecha de emisión', emitido)}
</div></section>
<footer class="pie"><div>Documento de uso interno · Información confidencial</div><div>SIGMA-Aqua · Solicitud #${escapar(solicitud.id)}</div></footer>
</main></body></html>`
}

export function abrirInformeSolicitud(solicitud: Solicitud, candidato: Candidato | null, usuario: Usuario | null): boolean {
  const ventana = window.open('', '_blank')
  if (!ventana) return false
  ventana.document.open()
  ventana.document.write(generarInformeSolicitud(solicitud, candidato, usuario))
  ventana.document.close()
  return true
}
