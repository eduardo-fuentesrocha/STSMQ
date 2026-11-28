import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import ProcedimientosAdmin from '@/components/ProcedimientosAdmin';

function esRolAdmin(rol?: string | null) {
  return rol === 'admin' || rol === 'ADMIN';
}

export default async function ProcedimientosPage() {
  const cookieStore = await cookies();
  const usuarioNum = cookieStore.get('usuario_num')?.value;
  const usuarioRol = cookieStore.get('usuario_rol')?.value;

  if (!usuarioNum) {
    redirect('/login?callbackUrl=%2Fadmin%2Fprocedimientos');
  }

  if (!esRolAdmin(usuarioRol)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-white text-zinc-800 p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <span className="text-xs font-bold text-[#E07A2B] uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>Panel de Control Sindical</span>
          </span>
          <h1 className="text-2xl font-black text-zinc-900">
            Procedimientos Internos
          </h1>
          <p className="text-xs text-zinc-500 font-medium">
            Consulta y descarga de documentos oficiales en PDF
          </p>
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200 transition-all shadow-sm self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4 text-[#E07A2B]" />
          <span>Volver al Panel</span>
        </Link>
      </div>

      <ProcedimientosAdmin />
    </div>
  );
}