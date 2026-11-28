'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Loader2, 
  Clock, 
  GraduationCap, 
  BookOpen,
  Users,
  HeartHandshake,
  Building2,
  Award,
  ShieldCheck,
  AlertCircle,
  Phone,
  CreditCard
} from 'lucide-react';
import { 
  actualizarEstatusSolicitud, 
  actualizarEstatusUtiles,
  actualizarEstatusNacimiento,
  actualizarEstatusMatrimonio,
  actualizarEstatusMateriales,
  actualizarEstatusDocumentoJubilacion,
  CampoDocumentoJubilacion
} from '@/app/actions/admin';
import { formatearFechaHoraMX } from '@/app/lib/fechas';

interface AuditoriaFields {
  motivoRechazo?: string | null;
  gestionadoPor?: string | null;
  fechaGestion?: Date | string | null;
}

interface SolicitudBecaAdmin extends AuditoriaFields {
  id: string;
  nombreHijo: string;
  nivelEducativo: string;
  estatus: string | null;
  numeroEmpleado: string;
  actaUrl: string;
  boletaUrl: string;
  createdAt: Date | string;
}

interface SolicitudUtilesAdmin extends AuditoriaFields {
  id: string;
  nombreHijo: string;
  nivelEducativo: string;
  numeroEmpleado: string;
  boletaUrl: string;
  inscripcionUrl: string;
  estatus: string | null;
  createdAt: Date | string;
}

interface SolicitudNacimientoAdmin extends AuditoriaFields {
  id: string;
  nombreHijo: string;
  numeroEmpleado: string;
  actaUrl: string;
  estatus: string | null;
  createdAt: Date | string;
}

interface SolicitudMatrimonioAdmin extends AuditoriaFields {
  id: string;
  nombreConyuge: string;
  tipoUnion: string;
  numeroEmpleado: string;
  actaUrl: string;
  estatus: string | null;
  createdAt: Date | string;
}

interface SolicitudMaterialAdmin extends AuditoriaFields {
  id: string;
  domicilioInmueble: string;
  cantidadTepetate: number;
  cantidadArena: number;
  cantidadGrava: number;
  cantidadPiedraNegra: number;
  cantidadCantera: number;
  numeroEmpleado: string;
  estatus: string | null;
  createdAt: Date | string;
}

export interface SolicitudJubilacionAdmin extends AuditoriaFields {
  id: string;
  numeroEmpleado: string;
  nombreTrabajador?: string;
  telefonoContacto: string;
  actaNacimientoUrl: string;
  actaNacimientoEstatus: string;
  actaNacimientoMotivo?: string | null;
  ineUrl: string;
  ineEstatus: string;
  ineMotivo?: string | null;
  semanasCotizadasImssUrl: string;
  semanasCotizadasImssEstatus: string;
  semanasCotizadasImssMotivo?: string | null;
  recibosNominaUrl: string;
  recibosNominaEstatus: string;
  recibosNominaMotivo?: string | null;
  estatus: string | null;
  createdAt: Date | string;
}

type TipoTramiteAdmin =
  | 'becas'
  | 'utiles'
  | 'nacimiento'
  | 'matrimonio'
  | 'materiales'
  | 'jubilaciones';

export default function AdminDashboardClient({ 
  initialBecas,
  initialUtiles = [],
  initialNacimientos = [],
  initialMatrimonios = [],
  initialMateriales,
  initialJubilaciones = [],
  adminNombre 
}: { 
  initialBecas: SolicitudBecaAdmin[];
  initialUtiles?: SolicitudUtilesAdmin[];
  initialNacimientos?: SolicitudNacimientoAdmin[];
  initialMatrimonios?: SolicitudMatrimonioAdmin[];
  initialMateriales: SolicitudMaterialAdmin[];
  initialJubilaciones?: SolicitudJubilacionAdmin[];
  adminNombre: string;
}) {
  const [tabActiva, setTabActiva] = useState<TipoTramiteAdmin>('becas');
  const [becas, setBecas] = useState<SolicitudBecaAdmin[]>(initialBecas);
  const [utiles, setUtiles] = useState<SolicitudUtilesAdmin[]>(initialUtiles);
  const [nacimientos, setNacimientos] = useState<SolicitudNacimientoAdmin[]>(initialNacimientos);
  const [matrimonios, setMatrimonios] = useState<SolicitudMatrimonioAdmin[]>(initialMatrimonios);
  const [materiales, setMateriales] = useState<SolicitudMaterialAdmin[]>(initialMateriales);
  const [jubilaciones, setJubilaciones] = useState<SolicitudJubilacionAdmin[]>(initialJubilaciones);
  const [cargandoArchivoId, setCargandoArchivoId] = useState<string | null>(null);

  // Estados para el Modal de Rechazo (trámite general o documento individual de jubilación)
  const [modalRechazo, setModalRechazo] = useState<{
    id: string;
    tipo: TipoTramiteAdmin;
    titulo: string;
    documentoJubilacion?: {
      campo: CampoDocumentoJubilacion;
      etiqueta: string;
    };
  } | null>(null);
  const [motivoRechazoInput, setMotivoRechazoInput] = useState<string>('');
  const [procesandoGestion, setProcesandoGestion] = useState<boolean>(false);

  const abrirModalRechazo = (
    id: string,
    tipo: TipoTramiteAdmin,
    titulo: string,
    documentoJubilacion?: { campo: CampoDocumentoJubilacion; etiqueta: string }
  ) => {
    setMotivoRechazoInput('');
    setModalRechazo({ id, tipo, titulo, documentoJubilacion });
  };

  // Procesar Aprobación o Rechazo de trámites generales
  const ejecutarCambioEstatus = async (
    id: string,
    tipo: Exclude<TipoTramiteAdmin, 'jubilaciones'>,
    nuevoEstatus: 'Aprobada' | 'Rechazada',
    motivo?: string
  ) => {
    setProcesandoGestion(true);
    let res;

    if (tipo === 'becas') {
      res = await actualizarEstatusSolicitud(id, nuevoEstatus, motivo);
    } else if (tipo === 'utiles') {
      res = await actualizarEstatusUtiles(id, nuevoEstatus, motivo);
    } else if (tipo === 'nacimiento') {
      res = await actualizarEstatusNacimiento(id, nuevoEstatus, motivo);
    } else if (tipo === 'matrimonio') {
      res = await actualizarEstatusMatrimonio(id, nuevoEstatus, motivo);
    } else if (tipo === 'materiales') {
      res = await actualizarEstatusMateriales(id, nuevoEstatus, motivo);
    }

    setProcesandoGestion(false);

    if (res?.success) {
      const datosAuditoriaActualizados = {
        estatus: nuevoEstatus,
        motivoRechazo: nuevoEstatus === 'Rechazada' ? motivo?.trim() : null,
        gestionadoPor: adminNombre,
        fechaGestion: new Date().toISOString(),
      };

      if (tipo === 'becas') {
        setBecas(prev => prev.map(item => item.id === id ? { ...item, ...datosAuditoriaActualizados } : item));
      } else if (tipo === 'utiles') {
        setUtiles(prev => prev.map(item => item.id === id ? { ...item, ...datosAuditoriaActualizados } : item));
      } else if (tipo === 'nacimiento') {
        setNacimientos(prev => prev.map(item => item.id === id ? { ...item, ...datosAuditoriaActualizados } : item));
      } else if (tipo === 'matrimonio') {
        setMatrimonios(prev => prev.map(item => item.id === id ? { ...item, ...datosAuditoriaActualizados } : item));
      } else if (tipo === 'materiales') {
        setMateriales(prev => prev.map(item => item.id === id ? { ...item, ...datosAuditoriaActualizados } : item));
      }

      if (nuevoEstatus === 'Rechazada') {
        setModalRechazo(null);
        setMotivoRechazoInput('');
      }
    } else {
      alert(res?.error || 'No se pudo actualizar el estatus.');
    }
  };

  // Procesar Aprobación o Rechazo de un PDF individual de Jubilación
  const ejecutarCambioDocumentoJubilacion = async (
    id: string,
    campo: CampoDocumentoJubilacion,
    nuevoEstatus: 'Aprobada' | 'Rechazada',
    motivo?: string
  ) => {
    setProcesandoGestion(true);
    const res = await actualizarEstatusDocumentoJubilacion(id, campo, nuevoEstatus, motivo);
    setProcesandoGestion(false);

    if (res?.success) {
      const motivoLimpio = nuevoEstatus === 'Rechazada' ? (motivo || '').trim() : null;

      setJubilaciones((prev) =>
        prev.map((sol) => {
          if (sol.id !== id) return sol;

          const actualizada: SolicitudJubilacionAdmin = {
            ...sol,
            actaNacimientoEstatus:
              campo === 'actaNacimiento' ? nuevoEstatus : sol.actaNacimientoEstatus,
            actaNacimientoMotivo:
              campo === 'actaNacimiento' ? motivoLimpio : sol.actaNacimientoMotivo,
            ineEstatus: campo === 'ine' ? nuevoEstatus : sol.ineEstatus,
            ineMotivo: campo === 'ine' ? motivoLimpio : sol.ineMotivo,
            semanasCotizadasImssEstatus:
              campo === 'semanasCotizadasImss'
                ? nuevoEstatus
                : sol.semanasCotizadasImssEstatus,
            semanasCotizadasImssMotivo:
              campo === 'semanasCotizadasImss'
                ? motivoLimpio
                : sol.semanasCotizadasImssMotivo,
            recibosNominaEstatus:
              campo === 'recibosNomina' ? nuevoEstatus : sol.recibosNominaEstatus,
            recibosNominaMotivo:
              campo === 'recibosNomina' ? motivoLimpio : sol.recibosNominaMotivo,
            gestionadoPor: adminNombre,
            fechaGestion: new Date().toISOString(),
          };

          const estados = [
            actualizada.actaNacimientoEstatus,
            actualizada.ineEstatus,
            actualizada.semanasCotizadasImssEstatus,
            actualizada.recibosNominaEstatus,
          ];

          actualizada.estatus = estados.some((e) => e === 'Rechazada')
            ? 'Rechazada'
            : estados.every((e) => e === 'Aprobada')
            ? 'Aprobada'
            : 'En Revisión';

          const motivosActivos = [
            actualizada.actaNacimientoEstatus === 'Rechazada' && actualizada.actaNacimientoMotivo
              ? `Acta: ${actualizada.actaNacimientoMotivo}`
              : null,
            actualizada.ineEstatus === 'Rechazada' && actualizada.ineMotivo
              ? `INE: ${actualizada.ineMotivo}`
              : null,
            actualizada.semanasCotizadasImssEstatus === 'Rechazada' &&
            actualizada.semanasCotizadasImssMotivo
              ? `Semanas IMSS: ${actualizada.semanasCotizadasImssMotivo}`
              : null,
            actualizada.recibosNominaEstatus === 'Rechazada' && actualizada.recibosNominaMotivo
              ? `Recibos Nómina: ${actualizada.recibosNominaMotivo}`
              : null,
          ].filter(Boolean);

          actualizada.motivoRechazo =
            motivosActivos.length > 0 ? motivosActivos.join(' | ') : null;

          return actualizada;
        })
      );

      if (nuevoEstatus === 'Rechazada') {
        setModalRechazo(null);
        setMotivoRechazoInput('');
      }
    } else {
      alert(res?.error || 'No se pudo actualizar el estatus del documento.');
    }
  };

  // Ver archivos privados utilizando el endpoint proxy seguro
  const handleVerArchivo = async (urlOriginal: string, tipo: string, id: string) => {
    if (!urlOriginal) {
      alert('No se encontró la ruta del archivo.');
      return;
    }
    setCargandoArchivoId(`${id}-${tipo}`);
    try {
      const urlSegura = `/api/admin/ver-archivo?url=${encodeURIComponent(urlOriginal)}`;
      window.open(urlSegura, '_blank');
    } catch (err) {
      console.error(err);
      alert('Error de conexión al abrir el documento.');
    } finally {
      setCargandoArchivoId(null);
    }
  };

  // Subcomponente visual para mostrar quién gestionó y por qué se rechazó
  const renderInfoAuditoria = (item: AuditoriaFields) => {
    if (!item.gestionadoPor && !item.motivoRechazo) return null;

    return (
      <div className="mt-2.5 pt-2.5 border-t border-zinc-200/70 space-y-1.5 text-xs">
        {item.gestionadoPor && (
          <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-[#E07A2B] shrink-0" />
            <span>Gestionado por: <strong className="text-zinc-700">{item.gestionadoPor}</strong></span>
          </div>
        )}
        {item.motivoRechazo && (
          <div className="flex items-start gap-1.5 bg-rose-50/80 border border-rose-200/80 text-rose-800 px-3 py-2 rounded-xl">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Motivo de rechazo: </span>
              <span>{item.motivoRechazo}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-zinc-800 p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header Admin */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
  <div>
    <span className="text-xs font-bold text-[#E07A2B] uppercase tracking-wider">
      Panel de Control Sindical
    </span>
    <h1 className="text-2xl font-black text-zinc-900">
      Administración de Solicitudes
    </h1>
    <p className="text-xs text-zinc-500 font-medium">
      Sesión de Administrador: {adminNombre}
    </p>
  </div>

  <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
    <Link
      href="/admin/credenciales"
      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200 transition-all shadow-sm"
    >
      <CreditCard className="h-4 w-4 text-[#E07A2B] shrink-0" />
      <span>Consulta de Credenciales</span>
    </Link>

    <Link
      href="/admin/procedimientos"
      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200 transition-all shadow-sm"
    >
      <FileText className="h-4 w-4 text-[#E07A2B] shrink-0" />
      <span>Procedimientos Internos</span>
    </Link>
  </div>
</div>

      {/* Pestañas de Navegación Admin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-b border-zinc-200 pb-4">
        <button
          onClick={() => setTabActiva('jubilaciones')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
            tabActiva === 'jubilaciones'
              ? 'bg-[#E07A2B] text-white shadow-md shadow-[#E07A2B]/20'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
          }`}
        >
          <Award className="h-4 w-4 shrink-0" />
          <span>Jubilaciones ({jubilaciones.length})</span>
        </button>

        <button
          onClick={() => setTabActiva('becas')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
            tabActiva === 'becas'
              ? 'bg-[#E07A2B] text-white shadow-md shadow-[#E07A2B]/20'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
          }`}
        >
          <GraduationCap className="h-4 w-4 shrink-0" />
          <span>Becas ({becas.length})</span>
        </button>

        <button
          onClick={() => setTabActiva('utiles')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
            tabActiva === 'utiles'
              ? 'bg-[#E07A2B] text-white shadow-md shadow-[#E07A2B]/20'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>Útiles Escolares ({utiles.length})</span>
        </button>

        <button
          onClick={() => setTabActiva('nacimiento')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
            tabActiva === 'nacimiento'
              ? 'bg-[#E07A2B] text-white shadow-md shadow-[#E07A2B]/20'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
          }`}
        >
          <Users className="h-4 w-4 shrink-0" />
          <span>Nacimiento de Hijos ({nacimientos.length})</span>
        </button>

        <button
          onClick={() => setTabActiva('matrimonio')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
            tabActiva === 'matrimonio'
              ? 'bg-[#E07A2B] text-white shadow-md shadow-[#E07A2B]/20'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
          }`}
        >
          <HeartHandshake className="h-4 w-4 shrink-0" />
          <span>Matrimonio o Concubinato ({matrimonios.length})</span>
        </button>

        <button
          onClick={() => setTabActiva('materiales')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
            tabActiva === 'materiales'
              ? 'bg-[#E07A2B] text-white shadow-md shadow-[#E07A2B]/20'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
          }`}
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span>Ayuda de Materiales para Construcción ({materiales.length})</span>
        </button>
      </div>

      {/* 0. JUBILACIONES (REVISIÓN INDIVIDUAL DE LOS 4 PDFS) */}
      {tabActiva === 'jubilaciones' && (
        <div className="bg-zinc-50/90 border border-zinc-200/80 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-4 border-b border-zinc-200 font-bold text-sm text-zinc-900 bg-zinc-100/50 flex items-center justify-between">
            <span>Listado General de Jubilaciones (28 Años de Servicio)</span>
            <span className="text-xs px-3 py-1 rounded-full bg-zinc-200/80 text-zinc-700 font-bold shadow-sm">
              {jubilaciones.length} Registro(s)
            </span>
          </div>
          <div className="divide-y divide-zinc-200/80">
            {jubilaciones.length === 0 ? (
              <p className="p-8 text-center text-xs text-zinc-500 font-medium">
                No hay solicitudes de jubilación registradas.
              </p>
            ) : (
              jubilaciones.map((sol) => {
                const fechaFormateada = formatearFechaHoraMX(sol.createdAt);
                const docs: {
                  campo: CampoDocumentoJubilacion;
                  etiqueta: string;
                  url: string;
                  estatus: string;
                  motivo?: string | null;
                }[] = [
                  {
                    campo: 'actaNacimiento',
                    etiqueta: 'Copia Certificada del Acta de Nacimiento',
                    url: sol.actaNacimientoUrl,
                    estatus: sol.actaNacimientoEstatus,
                    motivo: sol.actaNacimientoMotivo,
                  },
                  {
                    campo: 'ine',
                    etiqueta: 'Credencial del INE (Copia PDF)',
                    url: sol.ineUrl,
                    estatus: sol.ineEstatus,
                    motivo: sol.ineMotivo,
                  },
                  {
                    campo: 'semanasCotizadasImss',
                    etiqueta: 'Constancia de Semanas Cotizadas en el IMSS',
                    url: sol.semanasCotizadasImssUrl,
                    estatus: sol.semanasCotizadasImssEstatus,
                    motivo: sol.semanasCotizadasImssMotivo,
                  },
                  {
                    campo: 'recibosNomina',
                    etiqueta: '2 Últimos Recibos de Nómina',
                    url: sol.recibosNominaUrl,
                    estatus: sol.recibosNominaEstatus,
                    motivo: sol.recibosNominaMotivo,
                  },
                ];

                return (
                  <div key={sol.id} className="p-5 space-y-4 hover:bg-white transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-[#E07A2B]">
                            Emp. #{sol.numeroEmpleado}
                            {sol.nombreTrabajador ? ` · ${sol.nombreTrabajador}` : ''}
                          </span>
                          <span className="text-zinc-400 font-medium">{fechaFormateada}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600 font-medium">
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-zinc-400" />
                            Tel. carátula: <strong className="text-zinc-800">{sol.telefonoContacto}</strong>
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            Entrega física pendiente: 2 fotos tamaño pasaporte (cuadradas, B/N) e INE original
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm self-start md:self-center shrink-0 ${
                          sol.estatus === 'Aprobada'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sol.estatus === 'Rechazada'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {sol.estatus === 'Aprobada' && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                        {sol.estatus === 'Rechazada' && (
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                        )}
                        {(!sol.estatus || sol.estatus === 'En Revisión') && (
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        <span>{sol.estatus || 'En Revisión'}</span>
                      </span>
                    </div>

                    {/* Grid de los 4 PDFs para aprobar o rechazar por separado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {docs.map((doc) => {
                        const esAprobada = doc.estatus === 'Aprobada';
                        const esRechazada = doc.estatus === 'Rechazada';
                        const claveDoc = `${sol.id}-${doc.campo}`;

                        return (
                          <div
                            key={doc.campo}
                            className={`p-3.5 rounded-2xl border bg-zinc-50/70 space-y-2.5 flex flex-col justify-between ${
                              esRechazada
                                ? 'border-rose-300 bg-rose-50/40'
                                : esAprobada
                                ? 'border-emerald-200 bg-emerald-50/20'
                                : 'border-zinc-200/90'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="text-xs font-bold text-zinc-900 leading-snug">
                                  {doc.etiqueta}
                                </h5>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                    esAprobada
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : esRechazada
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}
                                >
                                  {doc.estatus}
                                </span>
                              </div>

                              {esRechazada && doc.motivo && (
                                <p className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200/80 rounded-xl px-2.5 py-1.5">
                                  <strong>Motivo:</strong> {doc.motivo}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <button
                                onClick={() => handleVerArchivo(doc.url, doc.campo, sol.id)}
                                disabled={cargandoArchivoId === claveDoc}
                                className="inline-flex items-center gap-1.5 text-xs text-zinc-700 hover:text-[#E07A2B] bg-white px-3 py-1.5 rounded-xl border border-zinc-200 cursor-pointer shadow-sm font-medium"
                              >
                                {cargandoArchivoId === claveDoc ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#E07A2B]" />
                                ) : (
                                  <FileText className="h-3.5 w-3.5 text-[#E07A2B]" />
                                )}
                                <span>Ver PDF</span>
                              </button>

                              <button
                                onClick={() =>
                                  ejecutarCambioDocumentoJubilacion(sol.id, doc.campo, 'Aprobada')
                                }
                                disabled={procesandoGestion}
                                className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer shadow-sm disabled:opacity-50"
                                title={`Aprobar ${doc.etiqueta}`}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() =>
                                  abrirModalRechazo(
                                    sol.id,
                                    'jubilaciones',
                                    `Jubilación - ${doc.etiqueta} (Emp. #${sol.numeroEmpleado})`,
                                    { campo: doc.campo, etiqueta: doc.etiqueta }
                                  )
                                }
                                disabled={procesandoGestion}
                                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer shadow-sm disabled:opacity-50"
                                title={`Rechazar ${doc.etiqueta}`}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {renderInfoAuditoria(sol)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 1. BECAS */}
      {tabActiva === 'becas' && (
        <div className="bg-zinc-50/90 border border-zinc-200/80 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-4 border-b border-zinc-200 font-bold text-sm text-zinc-900 bg-zinc-100/50 flex items-center justify-between">
            <span>Listado General de Becas</span>
            <span className="text-xs px-3 py-1 rounded-full bg-zinc-200/80 text-zinc-700 font-bold shadow-sm">
              {becas.length} Registro(s)
            </span>
          </div>
          <div className="divide-y divide-zinc-200/80">
            {becas.length === 0 ? (
              <p className="p-8 text-center text-xs text-zinc-500 font-medium">No hay solicitudes de becas registradas.</p>
            ) : (
              becas.map((item) => {
                const fechaFormateada = formatearFechaHoraMX(item.createdAt);
                return (
                  <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white transition-colors">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-[#E07A2B]">Emp. #{item.numeroEmpleado}</span>
                        <span className="text-zinc-400 font-medium">{fechaFormateada}</span>
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900">Hijo(a): {item.nombreHijo}</h4>
                      <p className="text-xs text-zinc-500 font-medium">Nivel Educativo: {item.nivelEducativo}</p>
                      
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => handleVerArchivo(item.actaUrl, 'acta', item.id)}
                          disabled={cargandoArchivoId === `${item.id}-acta`}
                          className="inline-flex items-center gap-1.5 text-xs text-zinc-700 hover:text-[#E07A2B] bg-white px-3 py-1.5 rounded-xl border border-zinc-200 cursor-pointer shadow-sm font-medium"
                        >
                          {cargandoArchivoId === `${item.id}-acta` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#E07A2B]" /> : <FileText className="h-3.5 w-3.5 text-[#E07A2B]" />}
                          <span>Ver Acta</span>
                        </button>
                        <button
                          onClick={() => handleVerArchivo(item.boletaUrl, 'boleta', item.id)}
                          disabled={cargandoArchivoId === `${item.id}-boleta`}
                          className="inline-flex items-center gap-1.5 text-xs text-zinc-700 hover:text-[#E07A2B] bg-white px-3 py-1.5 rounded-xl border border-zinc-200 cursor-pointer shadow-sm font-medium"
                        >
                          {cargandoArchivoId === `${item.id}-boleta` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#E07A2B]" /> : <FileText className="h-3.5 w-3.5 text-[#E07A2B]" />}
                          <span>Ver Boleta</span>
                        </button>
                      </div>

                      {renderInfoAuditoria(item)}
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${
                        item.estatus === 'Aprobada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        item.estatus === 'Rechazada' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.estatus === 'Aprobada' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                        {item.estatus === 'Rechazada' && <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                        {(!item.estatus || item.estatus === 'En Revisión') && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                        <span>{item.estatus || 'En Revisión'}</span>
                      </span>

                      <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-3">
                        <button
                          onClick={() => ejecutarCambioEstatus(item.id, 'becas', 'Aprobada')}
                          disabled={procesandoGestion}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer shadow-sm disabled:opacity-50"
                          title="Aprobar Solicitud"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => abrirModalRechazo(item.id, 'becas', `Becas - ${item.nombreHijo}`)}
                          disabled={procesandoGestion}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer shadow-sm disabled:opacity-50"
                          title="Rechazar Solicitud"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. ÚTILES ESCOLARES */}
      {tabActiva === 'utiles' && (
        <div className="bg-zinc-50/90 border border-zinc-200/80 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-4 border-b border-zinc-200 font-bold text-sm text-zinc-900 bg-zinc-100/50 flex items-center justify-between">
            <span>Listado General de Útiles Escolares</span>
            <span className="text-xs px-3 py-1 rounded-full bg-zinc-200/80 text-zinc-700 font-bold shadow-sm">
              {utiles.length} Registro(s)
            </span>
          </div>
          <div className="divide-y divide-zinc-200/80">
            {utiles.length === 0 ? (
              <p className="p-8 text-center text-xs text-zinc-500 font-medium">No hay solicitudes de útiles escolares registradas.</p>
            ) : (
              utiles.map((item) => {
                const fechaFormateada = formatearFechaHoraMX(item.createdAt);
                return (
                  <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white transition-colors">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-[#E07A2B]">Emp. #{item.numeroEmpleado}</span>
                        <span className="text-zinc-400 font-medium">{fechaFormateada}</span>
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900">Hijo(a): {item.nombreHijo}</h4>
                      <p className="text-xs text-zinc-500 font-medium">Nivel Educativo: {item.nivelEducativo}</p>
                      
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => handleVerArchivo(item.boletaUrl, 'boleta-utiles', item.id)}
                          disabled={cargandoArchivoId === `${item.id}-boleta-utiles`}
                          className="inline-flex items-center gap-1.5 text-xs text-zinc-700 hover:text-[#E07A2B] bg-white px-3 py-1.5 rounded-xl border border-zinc-200 cursor-pointer shadow-sm font-medium"
                        >
                          {cargandoArchivoId === `${item.id}-boleta-utiles` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#E07A2B]" /> : <FileText className="h-3.5 w-3.5 text-[#E07A2B]" />}
                          <span>Ver Boleta</span>
                        </button>
                        <button
                          onClick={() => handleVerArchivo(item.inscripcionUrl, 'inscripcion-utiles', item.id)}
                          disabled={cargandoArchivoId === `${item.id}-inscripcion-utiles`}
                          className="inline-flex items-center gap-1.5 text-xs text-zinc-700 hover:text-[#E07A2B] bg-white px-3 py-1.5 rounded-xl border border-zinc-200 cursor-pointer shadow-sm font-medium"
                        >
                          {cargandoArchivoId === `${item.id}-inscripcion-utiles` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#E07A2B]" /> : <FileText className="h-3.5 w-3.5 text-[#E07A2B]" />}
                          <span>Ver Inscripción</span>
                        </button>
                      </div>

                      {renderInfoAuditoria(item)}
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${
                        item.estatus === 'Aprobada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        item.estatus === 'Rechazada' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.estatus === 'Aprobada' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                        {item.estatus === 'Rechazada' && <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                        {(!item.estatus || item.estatus === 'En Revisión') && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                        <span>{item.estatus || 'En Revisión'}</span>
                      </span>

                      <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-3">
                        <button
                          onClick={() => ejecutarCambioEstatus(item.id, 'utiles', 'Aprobada')}
                          disabled={procesandoGestion}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer shadow-sm disabled:opacity-50"
                          title="Aprobar Solicitud"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => abrirModalRechazo(item.id, 'utiles', `Útiles Escolares - ${item.nombreHijo}`)}
                          disabled={procesandoGestion}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer shadow-sm disabled:opacity-50"
                          title="Rechazar Solicitud"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. NACIMIENTO DE HIJOS */}
      {tabActiva === 'nacimiento' && (
        <div className="bg-zinc-50/90 border border-zinc-200/80 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-4 border-b border-zinc-200 font-bold text-sm text-zinc-900 bg-zinc-100/50 flex items-center justify-between">
            <span>Listado General de Nacimiento de Hijos</span>
            <span className="text-xs px-3 py-1 rounded-full bg-zinc-200/80 text-zinc-700 font-bold shadow-sm">
              {nacimientos.length} Registro(s)
            </span>
          </div>
          <div className="divide-y divide-zinc-200/80">
            {nacimientos.length === 0 ? (
              <p className="p-8 text-center text-xs text-zinc-500 font-medium">No hay solicitudes de nacimiento registradas.</p>
            ) : (
              nacimientos.map((item) => {
                const fechaFormateada = formatearFechaHoraMX(item.createdAt);
                return (
                  <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white transition-colors">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-[#E07A2B]">Emp. #{item.numeroEmpleado}</span>
                        <span className="text-zinc-400 font-medium">{fechaFormateada}</span>
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900">Nombre del Hijo(a): {item.nombreHijo}</h4>
                      
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => handleVerArchivo(item.actaUrl, 'acta-nacimiento', item.id)}
                          disabled={cargandoArchivoId === `${item.id}-acta-nacimiento`}
                          className="inline-flex items-center gap-1.5 text-xs text-zinc-700 hover:text-[#E07A2B] bg-white px-3 py-1.5 rounded-xl border border-zinc-200 cursor-pointer shadow-sm font-medium"
                        >
                          {cargandoArchivoId === `${item.id}-acta-nacimiento` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#E07A2B]" /> : <FileText className="h-3.5 w-3.5 text-[#E07A2B]" />}
                          <span>Ver Acta de Nacimiento</span>
                        </button>
                      </div>

                      {renderInfoAuditoria(item)}
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${
                        item.estatus === 'Aprobada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        item.estatus === 'Rechazada' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.estatus === 'Aprobada' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                        {item.estatus === 'Rechazada' && <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                        {(!item.estatus || item.estatus === 'En Revisión') && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                        <span>{item.estatus || 'En Revisión'}</span>
                      </span>

                      <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-3">
                        <button
                          onClick={() => ejecutarCambioEstatus(item.id, 'nacimiento', 'Aprobada')}
                          disabled={procesandoGestion}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer shadow-sm disabled:opacity-50"
                          title="Aprobar y Registrar en Padrón"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => abrirModalRechazo(item.id, 'nacimiento', `Nacimiento de Hijos - ${item.nombreHijo}`)}
                          disabled={procesandoGestion}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer shadow-sm disabled:opacity-50"
                          title="Rechazar Solicitud"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. MATRIMONIO O CONCUBINATO */}
      {tabActiva === 'matrimonio' && (
        <div className="bg-zinc-50/90 border border-zinc-200/80 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-4 border-b border-zinc-200 font-bold text-sm text-zinc-900 bg-zinc-100/50 flex items-center justify-between">
            <span>Listado General de Matrimonio o Concubinato</span>
            <span className="text-xs px-3 py-1 rounded-full bg-zinc-200/80 text-zinc-700 font-bold shadow-sm">
              {matrimonios.length} Registro(s)
            </span>
          </div>
          <div className="divide-y divide-zinc-200/80">
            {matrimonios.length === 0 ? (
              <p className="p-8 text-center text-xs text-zinc-500 font-medium">No hay solicitudes de matrimonio o concubinato registradas.</p>
            ) : (
              matrimonios.map((item) => {
                const fechaFormateada = formatearFechaHoraMX(item.createdAt);
                return (
                  <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white transition-colors">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-[#E07A2B]">Emp. #{item.numeroEmpleado}</span>
                        <span className="text-zinc-400 font-medium">{fechaFormateada}</span>
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900">Cónyuge: {item.nombreConyuge}</h4>
                      <p className="text-xs text-zinc-500 font-medium">Tipo de Unión: <strong className="text-zinc-700">{item.tipoUnion}</strong></p>
                      
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => handleVerArchivo(item.actaUrl, 'acta-matrimonio', item.id)}
                          disabled={cargandoArchivoId === `${item.id}-acta-matrimonio`}
                          className="inline-flex items-center gap-1.5 text-xs text-zinc-700 hover:text-[#E07A2B] bg-white px-3 py-1.5 rounded-xl border border-zinc-200 cursor-pointer shadow-sm font-medium"
                        >
                          {cargandoArchivoId === `${item.id}-acta-matrimonio` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#E07A2B]" /> : <FileText className="h-3.5 w-3.5 text-[#E07A2B]" />}
                          <span>Ver Acta / Constancia</span>
                        </button>
                      </div>

                      {renderInfoAuditoria(item)}
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${
                        item.estatus === 'Aprobada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        item.estatus === 'Rechazada' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.estatus === 'Aprobada' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                        {item.estatus === 'Rechazada' && <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                        {(!item.estatus || item.estatus === 'En Revisión') && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                        <span>{item.estatus || 'En Revisión'}</span>
                      </span>

                      <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-3">
                        <button
                          onClick={() => ejecutarCambioEstatus(item.id, 'matrimonio', 'Aprobada')}
                          disabled={procesandoGestion}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer shadow-sm disabled:opacity-50"
                          title="Aprobar y Registrar Cónyuge"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => abrirModalRechazo(item.id, 'matrimonio', `Matrimonio o Concubinato - ${item.nombreConyuge}`)}
                          disabled={procesandoGestion}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer shadow-sm disabled:opacity-50"
                          title="Rechazar Solicitud"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 5. AYUDA DE MATERIALES PARA CONSTRUCCIÓN */}
      {tabActiva === 'materiales' && (
        <div className="bg-zinc-50/90 border border-zinc-200/80 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-4 border-b border-zinc-200 font-bold text-sm text-zinc-900 bg-zinc-100/50 flex items-center justify-between">
            <span>Listado General de Ayuda de Materiales para Construcción</span>
            <span className="text-xs px-3 py-1 rounded-full bg-zinc-200/80 text-zinc-700 font-bold shadow-sm">
              {materiales.length} Registro(s)
            </span>
          </div>
          <div className="divide-y divide-zinc-200/80">
            {materiales.length === 0 ? (
              <p className="p-8 text-center text-xs text-zinc-500 font-medium">No hay solicitudes de materiales registradas.</p>
            ) : (
              materiales.map((item) => {
                const fechaFormateada = formatearFechaHoraMX(item.createdAt);
                return (
                  <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white transition-colors">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-[#E07A2B]">Emp. #{item.numeroEmpleado}</span>
                        <span className="text-zinc-400 font-medium">{fechaFormateada}</span>
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900">Inmueble: {item.domicilioInmueble}</h4>
                      <p className="text-xs text-zinc-600 font-medium pt-1">
                        Tepetate: <strong>{item.cantidadTepetate}</strong> | Arena: <strong>{item.cantidadArena}</strong> | Grava: <strong>{item.cantidadGrava}</strong> | P. Negra: <strong>{item.cantidadPiedraNegra}</strong> | Cantera: <strong>{item.cantidadCantera}</strong>
                      </p>

                      {renderInfoAuditoria(item)}
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${
                        item.estatus === 'Aprobada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        item.estatus === 'Rechazada' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.estatus === 'Aprobada' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                        {item.estatus === 'Rechazada' && <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                        {(!item.estatus || item.estatus === 'En Revisión') && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                        <span>{item.estatus || 'En Revisión'}</span>
                      </span>

                      <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-3">
                        <button
                          onClick={() => ejecutarCambioEstatus(item.id, 'materiales', 'Aprobada')}
                          disabled={procesandoGestion}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer shadow-sm disabled:opacity-50"
                          title="Aprobar Solicitud"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => abrirModalRechazo(item.id, 'materiales', `Ayuda de Materiales para Construcción - Emp. #${item.numeroEmpleado}`)}
                          disabled={procesandoGestion}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer shadow-sm disabled:opacity-50"
                          title="Rechazar Solicitud"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL PARA DESCRIBIR RAZÓN DE RECHAZO */}
      {modalRechazo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-zinc-200">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                {modalRechazo.documentoJubilacion ? 'Rechazo de Documento' : 'Rechazo de Solicitud'}
              </span>
              <h3 className="text-lg font-black text-zinc-900">{modalRechazo.titulo}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Describe brevemente la razón por la cual se rechaza este {modalRechazo.documentoJubilacion ? 'documento' : 'trámite'}. Esta información quedará registrada bajo tu usuario (<strong className="text-zinc-700">{adminNombre}</strong>).
              </p>
            </div>

            <textarea
              rows={4}
              value={motivoRechazoInput}
              onChange={(e) => setMotivoRechazoInput(e.target.value)}
              placeholder="Ej. El documento adjunto está incompleto o ilegible. Favor de subir nuevamente..."
              className="w-full rounded-2xl border border-zinc-300 p-3 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalRechazo(null)}
                disabled={procesandoGestion}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (modalRechazo.tipo === 'jubilaciones' && modalRechazo.documentoJubilacion) {
                    ejecutarCambioDocumentoJubilacion(
                      modalRechazo.id,
                      modalRechazo.documentoJubilacion.campo,
                      'Rechazada',
                      motivoRechazoInput
                    );
                  } else if (modalRechazo.tipo !== 'jubilaciones') {
                    ejecutarCambioEstatus(
                      modalRechazo.id,
                      modalRechazo.tipo,
                      'Rechazada',
                      motivoRechazoInput
                    );
                  }
                }}
                disabled={procesandoGestion || !motivoRechazoInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {procesandoGestion && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirmar Rechazo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
