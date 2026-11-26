'use server'

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { subirArchivoR2 } from '@/app/lib/r2'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
  pool?: Pool
}

const connectionString = process.env.DATABASE_URL
const pool = globalForPrisma.pool ?? new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pool = pool
  globalForPrisma.prisma = prisma
}

function sanitizarSegmento(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function validarPdf(file: File | null, etiqueta: string): string | null {
  if (!file || file.size === 0) return null
  const esPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!esPdf) {
    return `El archivo de "${etiqueta}" debe estar en formato PDF (.pdf).`
  }
  return null
}

function calcularEstatusGlobal(estados: string[]): string {
  if (estados.some((e) => e === 'Rechazada')) return 'Rechazada'
  if (estados.every((e) => e === 'Aprobada')) return 'Aprobada'
  return 'En Revisión'
}

export async function guardarSolicitudJubilacion(formData: FormData) {
  try {
    const cookieStore = await cookies()
    const numeroEmpleado = cookieStore.get('usuario_num')?.value

    if (!numeroEmpleado) {
      return { success: false, error: 'Sesión no válida. Inicia sesión nuevamente.' }
    }

    const usuario = await prisma.usuario.findUnique({
      where: { numeroEmpleado },
    })

    if (!usuario) {
      return { success: false, error: 'No se encontró el registro del trabajador.' }
    }

    const existente = await prisma.solicitudJubilacion.findUnique({
      where: { numeroEmpleado },
    })

    const telefonoContacto = ((formData.get('telefonoContacto') as string) || '').trim()
    const actaNacimiento = formData.get('actaNacimiento') as File | null
    const ine = formData.get('ine') as File | null
    const semanasCotizadasImss = formData.get('semanasCotizadasImss') as File | null
    const recibosNomina = formData.get('recibosNomina') as File | null

    if (!telefonoContacto || telefonoContacto.replace(/\D/g, '').length < 10) {
      return {
        success: false,
        error: 'Ingresa un número telefónico actualizado a 10 dígitos.',
      }
    }

    const checks = [
      validarPdf(actaNacimiento, 'Copia Certificada del Acta de Nacimiento'),
      validarPdf(ine, 'Credencial del INE'),
      validarPdf(semanasCotizadasImss, 'Constancia de Semanas Cotizadas en el IMSS'),
      validarPdf(recibosNomina, '2 Últimos Recibos de Nómina'),
    ]
    const errorFormato = checks.find(Boolean)
    if (errorFormato) {
      return { success: false, error: errorFormato }
    }

    if (!existente) {
      if (
        !actaNacimiento?.size ||
        !ine?.size ||
        !semanasCotizadasImss?.size ||
        !recibosNomina?.size
      ) {
        return {
          success: false,
          error: 'Debes adjuntar los 4 documentos en formato PDF para iniciar tu trámite.',
        }
      }
    } else {
      const hayAlgunaActualizacion =
        Boolean(actaNacimiento?.size) ||
        Boolean(ine?.size) ||
        Boolean(semanasCotizadasImss?.size) ||
        Boolean(recibosNomina?.size) ||
        telefonoContacto !== existente.telefonoContacto

      if (!hayAlgunaActualizacion) {
        return {
          success: false,
          error: 'Adjunta el documento corregido en formato PDF antes de guardar.',
        }
      }
    }

    const nombreLimpio = sanitizarSegmento(usuario.nombreCompleto || 'Trabajador')
    const carpeta = `jubilaciones/${numeroEmpleado}`

    // Clave fija sin timestamp: sobrescribe el archivo anterior en R2 al reenviar
    const subirSiExiste = async (archivo: File | null, sufijo: string, actual?: string) => {
      if (!archivo || archivo.size === 0) return actual!
      const buf = await fileToBuffer(archivo)
      const key = `${carpeta}/${numeroEmpleado}_${nombreLimpio}_${sufijo}.pdf`
      return subirArchivoR2(key, buf, 'application/pdf')
    }

    const [
      actaNacimientoUrl,
      ineUrl,
      semanasCotizadasImssUrl,
      recibosNominaUrl,
    ] = await Promise.all([
      subirSiExiste(actaNacimiento, 'Acta_Nacimiento', existente?.actaNacimientoUrl),
      subirSiExiste(ine, 'INE', existente?.ineUrl),
      subirSiExiste(semanasCotizadasImss, 'Semanas_IMSS', existente?.semanasCotizadasImssUrl),
      subirSiExiste(recibosNomina, 'Recibos_Nomina', existente?.recibosNominaUrl),
    ])

    if (!existente) {
      const creada = await prisma.solicitudJubilacion.create({
        data: {
          numeroEmpleado,
          telefonoContacto,
          actaNacimientoUrl,
          actaNacimientoEstatus: 'En Revisión',
          ineUrl,
          ineEstatus: 'En Revisión',
          semanasCotizadasImssUrl,
          semanasCotizadasImssEstatus: 'En Revisión',
          recibosNominaUrl,
          recibosNominaEstatus: 'En Revisión',
          estatus: 'En Revisión',
        },
      })

      revalidatePath('/dashboard')
      revalidatePath('/admin')
      return { success: true, esActualizacion: false, data: creada }
    }

    const nuevoActaEstatus = actaNacimiento?.size ? 'En Revisión' : existente.actaNacimientoEstatus
    const nuevoActaMotivo = actaNacimiento?.size ? null : existente.actaNacimientoMotivo

    const nuevoIneEstatus = ine?.size ? 'En Revisión' : existente.ineEstatus
    const nuevoIneMotivo = ine?.size ? null : existente.ineMotivo

    const nuevoSemanasEstatus = semanasCotizadasImss?.size
      ? 'En Revisión'
      : existente.semanasCotizadasImssEstatus
    const nuevoSemanasMotivo = semanasCotizadasImss?.size
      ? null
      : existente.semanasCotizadasImssMotivo

    const nuevoRecibosEstatus = recibosNomina?.size
      ? 'En Revisión'
      : existente.recibosNominaEstatus
    const nuevoRecibosMotivo = recibosNomina?.size ? null : existente.recibosNominaMotivo

    const estatusGlobal = calcularEstatusGlobal([
      nuevoActaEstatus,
      nuevoIneEstatus,
      nuevoSemanasEstatus,
      nuevoRecibosEstatus,
    ])

    const motivosPendientes = [
      nuevoActaEstatus === 'Rechazada' && nuevoActaMotivo ? `Acta: ${nuevoActaMotivo}` : null,
      nuevoIneEstatus === 'Rechazada' && nuevoIneMotivo ? `INE: ${nuevoIneMotivo}` : null,
      nuevoSemanasEstatus === 'Rechazada' && nuevoSemanasMotivo
        ? `Semanas IMSS: ${nuevoSemanasMotivo}`
        : null,
      nuevoRecibosEstatus === 'Rechazada' && nuevoRecibosMotivo
        ? `Recibos Nómina: ${nuevoRecibosMotivo}`
        : null,
    ].filter(Boolean)

    const actualizada = await prisma.solicitudJubilacion.update({
      where: { numeroEmpleado },
      data: {
        telefonoContacto,
        actaNacimientoUrl,
        actaNacimientoEstatus: nuevoActaEstatus,
        actaNacimientoMotivo: nuevoActaMotivo,
        ineUrl,
        ineEstatus: nuevoIneEstatus,
        ineMotivo: nuevoIneMotivo,
        semanasCotizadasImssUrl,
        semanasCotizadasImssEstatus: nuevoSemanasEstatus,
        semanasCotizadasImssMotivo: nuevoSemanasMotivo,
        recibosNominaUrl,
        recibosNominaEstatus: nuevoRecibosEstatus,
        recibosNominaMotivo: nuevoRecibosMotivo,
        estatus: estatusGlobal,
        motivoRechazo: motivosPendientes.length > 0 ? motivosPendientes.join(' | ') : null,
        notificacionVista: motivosPendientes.length === 0,
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/admin')
    return { success: true, esActualizacion: true, data: actualizada }
  } catch (error: any) {
    console.error('Error al guardar solicitud de jubilación:', error)
    return {
      success: false,
      error: error?.message || 'No se pudo guardar la solicitud de jubilación.',
    }
  }
}