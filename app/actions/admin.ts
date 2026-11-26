'use server'

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { revalidatePath } from 'next/cache'
import { obtenerUsuarioActual } from '@/app/actions/auth'
import { enviarNotificacionEstatusTrabajador } from '../lib/mailer' // <-- Ajusta a '@/lib/mail' si tu archivo se llama mail.ts

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export type CampoDocumentoJubilacion =
  | 'actaNacimiento'
  | 'ine'
  | 'semanasCotizadasImss'
  | 'recibosNomina'

const ETIQUETAS_DOCUMENTO_JUBILACION: Record<CampoDocumentoJubilacion, string> = {
  actaNacimiento: 'Copia Certificada del Acta de Nacimiento',
  ine: 'Credencial del INE (Copia PDF)',
  semanasCotizadasImss: 'Constancia de Semanas Cotizadas en el IMSS',
  recibosNomina: '2 Últimos Recibos de Nómina',
}

// 🛡️ Helper interno para validar administrador y construir los datos de auditoría
async function validarYPrepararAuditoria(nuevoEstatus: string, motivoRechazo?: string) {
  const admin = await obtenerUsuarioActual()

  if (!admin || (admin.rol !== 'admin' && admin.rol !== 'ADMIN')) {
    throw new Error('Acceso denegado: Se requieren permisos de administrador.')
  }

  if (nuevoEstatus === 'Rechazada' && (!motivoRechazo || motivoRechazo.trim() === '')) {
    throw new Error('Debes describir el motivo por el cual se rechaza la solicitud.')
  }

  return {
    estatus: nuevoEstatus,
    motivoRechazo: nuevoEstatus === 'Rechazada' ? motivoRechazo!.trim() : null,
    notificacionVista: nuevoEstatus === 'Rechazada' ? false : true, // 👈 Reinicia la visibilidad de la alerta si es rechazado
    gestionadoPor: `${admin.nombreCompleto} (${admin.numeroEmpleado})`,
    fechaGestion: new Date(),
  }
}

// 📧 Helper interno para buscar el correo del trabajador y enviar la notificación
async function notificarEmpleadoPorCorreo({
  numeroEmpleado,
  tipoTramite,
  folio,
  detalleTramite,
  estatus,
  motivoRechazo,
}: {
  numeroEmpleado: string
  tipoTramite: string
  folio: string
  detalleTramite: string
  estatus: string
  motivoRechazo?: string | null
}) {
  if (estatus !== 'Aprobada' && estatus !== 'Rechazada') return

  const trabajador = await prisma.usuario.findUnique({
    where: { numeroEmpleado },
    select: { email: true, nombreCompleto: true },
  })

  if (!trabajador?.email) {
    console.warn(`El empleado #${numeroEmpleado} no tiene un correo registrado; se omitió la notificación.`)
    return
  }

  await enviarNotificacionEstatusTrabajador({
    correoTrabajador: trabajador.email,
    nombreTrabajador: trabajador.nombreCompleto,
    tipoTramite,
    folio,
    detalleTramite,
    estatus,
    motivoRechazo,
  })
}

// ==========================================
// 1. GESTIÓN DE SOLICITUDES DE BECAS
// ==========================================
export async function actualizarEstatusSolicitud(
  id: string,
  nuevoEstatus: string,
  motivoRechazo?: string
) {
  try {
    const datosAuditoria = await validarYPrepararAuditoria(nuevoEstatus, motivoRechazo)

    const solicitud = await prisma.solicitudBeca.update({
      where: { id },
      data: datosAuditoria,
    })

    await notificarEmpleadoPorCorreo({
      numeroEmpleado: solicitud.numeroEmpleado,
      tipoTramite: 'Becas Escolares',
      folio: `BEC-2026-${solicitud.id.slice(0, 4).toUpperCase()}`,
      detalleTramite: `Hijo(a): ${solicitud.nombreHijo} (${solicitud.nivelEducativo})`,
      estatus: nuevoEstatus,
      motivoRechazo: datosAuditoria.motivoRechazo,
    })

    revalidatePath('/admin')
    revalidatePath('/dashboard')
    return { success: true, data: solicitud }
  } catch (error: any) {
    console.error('Error al actualizar estatus de beca:', error)
    return { success: false, error: error.message || 'No se pudo actualizar el estatus de la beca.' }
  }
}

// ==========================================
// 2. GESTIÓN DE MATERIALES DE CONSTRUCCIÓN
// ==========================================
export async function actualizarEstatusMateriales(
  id: string,
  nuevoEstatus: string,
  motivoRechazo?: string
) {
  try {
    const datosAuditoria = await validarYPrepararAuditoria(nuevoEstatus, motivoRechazo)

    const material = await prisma.solicitudMaterial.update({
      where: { id },
      data: datosAuditoria,
    })

    await notificarEmpleadoPorCorreo({
      numeroEmpleado: material.numeroEmpleado,
      tipoTramite: 'Ayuda de Materiales para Construcción',
      folio: `MAT-2026-${material.id.slice(0, 4).toUpperCase()}`,
      detalleTramite: `Inmueble: ${material.domicilioInmueble}`,
      estatus: nuevoEstatus,
      motivoRechazo: datosAuditoria.motivoRechazo,
    })

    revalidatePath('/admin')
    revalidatePath('/dashboard')
    return { success: true, data: material }
  } catch (error: any) {
    console.error('Error al actualizar estatus de materiales:', error)
    return { success: false, error: error.message || 'No se pudo actualizar el estatus del material.' }
  }
}

// ==========================================
// 3. REGISTRO DE NACIMIENTO + ALTA AUTOMÁTICA EN FAMILIAR
// ==========================================
export async function actualizarEstatusNacimiento(
  id: string,
  nuevoEstatus: string,
  motivoRechazo?: string
) {
  try {
    const datosAuditoria = await validarYPrepararAuditoria(nuevoEstatus, motivoRechazo)

    const solicitud = await prisma.solicitudNacimiento.findUnique({
      where: { id },
    })

    if (!solicitud) {
      return { success: false, error: 'La solicitud de nacimiento no existe.' }
    }

    if (nuevoEstatus === 'Aprobada') {
      await prisma.$transaction([
        prisma.solicitudNacimiento.update({
          where: { id },
          data: datosAuditoria,
        }),
        prisma.familiar.create({
          data: {
            numeroEmpleado: solicitud.numeroEmpleado,
            nombreCompleto: solicitud.nombreHijo,
            parentesco: 'Hijo(a)',
            estatus: 'Aprobado',
          },
        }),
      ])
    } else {
      await prisma.solicitudNacimiento.update({
        where: { id },
        data: datosAuditoria,
      })
    }

    await notificarEmpleadoPorCorreo({
      numeroEmpleado: solicitud.numeroEmpleado,
      tipoTramite: 'Registro de Nacimiento (Alta de Hijo)',
      folio: `NAC-2026-${solicitud.id.slice(0, 4).toUpperCase()}`,
      detalleTramite: `Hijo(a): ${solicitud.nombreHijo}`,
      estatus: nuevoEstatus,
      motivoRechazo: datosAuditoria.motivoRechazo,
    })

    revalidatePath('/admin')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Error al actualizar estatus de nacimiento:', error)
    return { success: false, error: error.message || 'No se pudo procesar la solicitud de nacimiento.' }
  }
}

// ==========================================
// 4. MATRIMONIO / CONCUBINATO + ALTA AUTOMÁTICA EN FAMILIAR
// ==========================================
export async function actualizarEstatusMatrimonio(
  id: string,
  nuevoEstatus: string,
  motivoRechazo?: string
) {
  try {
    const datosAuditoria = await validarYPrepararAuditoria(nuevoEstatus, motivoRechazo)

    const solicitud = await prisma.solicitudMatrimonio.findUnique({
      where: { id },
    })

    if (!solicitud) {
      return { success: false, error: 'La solicitud de matrimonio no existe.' }
    }

    if (nuevoEstatus === 'Aprobada') {
      await prisma.$transaction([
        prisma.solicitudMatrimonio.update({
          where: { id },
          data: datosAuditoria,
        }),
        prisma.familiar.create({
          data: {
            numeroEmpleado: solicitud.numeroEmpleado,
            nombreCompleto: solicitud.nombreConyuge,
            parentesco: 'Cónyuge',
            estatus: 'Aprobado',
          },
        }),
      ])
    } else {
      await prisma.solicitudMatrimonio.update({
        where: { id },
        data: datosAuditoria,
      })
    }

    await notificarEmpleadoPorCorreo({
      numeroEmpleado: solicitud.numeroEmpleado,
      tipoTramite: `Registro de ${solicitud.tipoUnion}`,
      folio: `MATR-2026-${solicitud.id.slice(0, 4).toUpperCase()}`,
      detalleTramite: `Cónyuge: ${solicitud.nombreConyuge}`,
      estatus: nuevoEstatus,
      motivoRechazo: datosAuditoria.motivoRechazo,
    })

    revalidatePath('/admin')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Error al actualizar estatus de matrimonio:', error)
    return { success: false, error: error.message || 'No se pudo procesar la solicitud de matrimonio.' }
  }
}

// ==========================================
// 5. GESTIÓN DE ÚTILES ESCOLARES
// ==========================================
export async function actualizarEstatusUtiles(
  id: string,
  nuevoEstatus: string,
  motivoRechazo?: string
) {
  try {
    const datosAuditoria = await validarYPrepararAuditoria(nuevoEstatus, motivoRechazo)

    const utiles = await prisma.solicitudUtiles.update({
      where: { id },
      data: datosAuditoria,
    })

    await notificarEmpleadoPorCorreo({
      numeroEmpleado: utiles.numeroEmpleado,
      tipoTramite: 'Útiles Escolares',
      folio: `UTIL-2026-${utiles.id.slice(0, 4).toUpperCase()}`,
      detalleTramite: `Hijo(a): ${utiles.nombreHijo} (${utiles.nivelEducativo})`,
      estatus: nuevoEstatus,
      motivoRechazo: datosAuditoria.motivoRechazo,
    })

    revalidatePath('/admin')
    revalidatePath('/dashboard')
    return { success: true, data: utiles }
  } catch (error: any) {
    console.error('Error al actualizar estatus de útiles escolares:', error)
    return { success: false, error: error.message || 'No se pudo actualizar el estatus de útiles escolares.' }
  }
}

// ==========================================
// 6. REVISIÓN INDIVIDUAL DE DOCUMENTOS DE JUBILACIÓN
// ==========================================
export async function actualizarEstatusDocumentoJubilacion(
  id: string,
  documento: CampoDocumentoJubilacion,
  nuevoEstatus: 'Aprobada' | 'Rechazada',
  motivoRechazo?: string
) {
  try {
    const admin = await obtenerUsuarioActual()

    if (!admin || (admin.rol !== 'admin' && admin.rol !== 'ADMIN')) {
      return { success: false, error: 'Acceso denegado: Se requieren permisos de administrador.' }
    }

    if (nuevoEstatus === 'Rechazada' && (!motivoRechazo || motivoRechazo.trim() === '')) {
      return { success: false, error: 'Debes indicar el motivo del rechazo para este documento.' }
    }

    const actual = await prisma.solicitudJubilacion.findUnique({ where: { id } })
    if (!actual) {
      return { success: false, error: 'No se encontró la solicitud de jubilación.' }
    }

    const motivoLimpio = nuevoEstatus === 'Rechazada' ? motivoRechazo!.trim() : null

    const estados = {
      actaNacimiento:
        documento === 'actaNacimiento' ? nuevoEstatus : actual.actaNacimientoEstatus,
      ine: documento === 'ine' ? nuevoEstatus : actual.ineEstatus,
      semanasCotizadasImss:
        documento === 'semanasCotizadasImss' ? nuevoEstatus : actual.semanasCotizadasImssEstatus,
      recibosNomina:
        documento === 'recibosNomina' ? nuevoEstatus : actual.recibosNominaEstatus,
    }

    const motivos = {
      actaNacimiento:
        documento === 'actaNacimiento' ? motivoLimpio : actual.actaNacimientoMotivo,
      ine: documento === 'ine' ? motivoLimpio : actual.ineMotivo,
      semanasCotizadasImss:
        documento === 'semanasCotizadasImss' ? motivoLimpio : actual.semanasCotizadasImssMotivo,
      recibosNomina:
        documento === 'recibosNomina' ? motivoLimpio : actual.recibosNominaMotivo,
    }

    const listaEstados = Object.values(estados)
    const estatusGlobal = listaEstados.some((e) => e === 'Rechazada')
      ? 'Rechazada'
      : listaEstados.every((e) => e === 'Aprobada')
      ? 'Aprobada'
      : 'En Revisión'

    const resumenMotivos = (Object.keys(estados) as CampoDocumentoJubilacion[])
      .filter((key) => estados[key] === 'Rechazada' && motivos[key])
      .map((key) => `${ETIQUETAS_DOCUMENTO_JUBILACION[key]}: ${motivos[key]}`)
      .join(' | ')

    const actualizada = await prisma.solicitudJubilacion.update({
      where: { id },
      data: {
        actaNacimientoEstatus: estados.actaNacimiento,
        actaNacimientoMotivo: motivos.actaNacimiento,
        ineEstatus: estados.ine,
        ineMotivo: motivos.ine,
        semanasCotizadasImssEstatus: estados.semanasCotizadasImss,
        semanasCotizadasImssMotivo: motivos.semanasCotizadasImss,
        recibosNominaEstatus: estados.recibosNomina,
        recibosNominaMotivo: motivos.recibosNomina,
        estatus: estatusGlobal,
        motivoRechazo: resumenMotivos || null,
        notificacionVista: estatusGlobal === 'Rechazada' ? false : true,
        gestionadoPor: `${admin.nombreCompleto} (${admin.numeroEmpleado})`,
        fechaGestion: new Date(),
      },
    })

    if (nuevoEstatus === 'Rechazada' || estatusGlobal === 'Aprobada') {
      await notificarEmpleadoPorCorreo({
        numeroEmpleado: actualizada.numeroEmpleado,
        tipoTramite: 'Jubilación',
        folio: `JUB-2026-${actualizada.id.slice(0, 4).toUpperCase()}`,
        detalleTramite:
          nuevoEstatus === 'Rechazada'
            ? `Documento rechazado: ${ETIQUETAS_DOCUMENTO_JUBILACION[documento]}`
            : 'Los 4 documentos digitales fueron aprobados. Acude al Sindicato con tus 2 fotografías tamaño pasaporte (cuadradas, blanco y negro) y tu INE original.',
        estatus: nuevoEstatus === 'Rechazada' ? 'Rechazada' : 'Aprobada',
        motivoRechazo: motivoLimpio,
      })
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard')
    return { success: true, data: actualizada }
  } catch (error: any) {
    console.error('Error al actualizar estatus de documento de jubilación:', error)
    return {
      success: false,
      error: error?.message || 'No se pudo actualizar el estatus del documento.',
    }
  }
}

// ==========================================
// 7. VISUALIZACIÓN DE ARCHIVOS PRIVADOS
// ==========================================
export async function obtenerUrlArchivoPrivado(urlOriginal: string) {
  try {
    if (!urlOriginal) {
      return { success: false, error: 'No se encontró la URL del archivo.' }
    }
    
    return { success: true, url: urlOriginal }
  } catch (error) {
    console.error('Error al recuperar URL del archivo:', error)
    return { success: false, error: 'Ocurrió un error al intentar abrir el archivo.' }
  }
}