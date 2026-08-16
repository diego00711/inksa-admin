import React, { useEffect, useState } from 'react';
import { ShoppingCart, BellRing, RefreshCw, CheckCircle2, Phone } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import authService from '../services/authService';

/**
 * Carrinhos parados.
 *
 * O alerta do dashboard já existia e mandava pra /usuarios — uma lista de
 * gente, sem dizer quem parou nem deixar fazer nada. Aviso sem saída vira
 * ruído, e painel que só acusa é painel que se aprende a ignorar.
 *
 * Aqui dá pra ver quem é, há quanto tempo, e mandar UM lembrete. O lembrete
 * fala do carrinho da PRÓPRIA pessoa — é serviço, não propaganda de terceiro.
 * Uma vez por dia por pessoa, garantido no banco.
 *
 * A lista mostra TUDO, sem teto de idade. O dashboard corta em 48h de
 * propósito (é a janela de quem ainda dá pra recuperar); aqui você vê também
 * os antigos, marcados, porque eles contam outra história: carrinho de dias
 * atrás não é atrito de checkout, é entulho.
 */
const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

function idade(minutos) {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)} dias`;
}

export default function CarrinhosPage() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(null);
  const [aviso, setAviso] = useState(null);

  const carregar = async () => {
    setCarregando(true);
    setErro('');
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/carrinhos`, {
        headers: { Authorization: `Bearer ${authService.getToken()}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || 'Falha ao carregar');
      setDados(j.data);
    } catch (e) {
      setErro(e.message || 'Falha ao carregar');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const lembrar = async (c) => {
    setEnviando(c.id);
    setAviso(null);
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/carrinhos/${c.id}/lembrar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authService.getToken()}` },
      });
      const j = await r.json();
      setAviso({ ok: r.ok, texto: j?.message || (r.ok ? 'Lembrete enviado.' : 'Não deu.') });
      if (r.ok) await carregar();
    } catch {
      setAviso({ ok: false, texto: 'Falha de rede ao enviar.' });
    } finally {
      setEnviando(null);
    }
  };

  if (carregando) return <div className="p-8 text-gray-500">Carregando carrinhos…</div>;
  if (erro) {
    return (
      <div className="p-8">
        <p className="text-red-600 mb-3">{erro}</p>
        <button onClick={carregar} className="px-4 py-2 rounded border border-gray-300">Tentar de novo</button>
      </div>
    );
  }
  if (!dados) return null;

  const { carrinhos, total_valor, minutos_corte } = dados;
  const recentes = carrinhos.filter((c) => c.minutos < 48 * 60);
  const antigos  = carrinhos.filter((c) => c.minutos >= 48 * 60);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart size={22} /> Carrinhos parados
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Montaram o pedido e não finalizaram há mais de {minutos_corte} min.
            No total, {brl(total_valor)} em carrinho.
          </p>
        </div>
        <button onClick={carregar} className="shrink-0 flex items-center gap-2 px-3 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50">
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      {aviso && (
        <p className={`text-sm rounded-lg border px-3 py-2 ${aviso.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          {aviso.texto}
        </p>
      )}

      <Bloco
        titulo={`Dá pra recuperar (${recentes.length})`}
        subtitulo="Últimas 48h — é o que o dashboard conta."
        linhas={recentes}
        onLembrar={lembrar}
        enviando={enviando}
        vazio="Nenhum carrinho recente parado."
      />

      {antigos.length > 0 && (
        <Bloco
          titulo={`Antigos (${antigos.length})`}
          subtitulo="Mais de 48h. Não são sinal de atrito no checkout — são resíduo. Ficam fora da conta do dashboard."
          linhas={antigos}
          onLembrar={lembrar}
          enviando={enviando}
        />
      )}
    </div>
  );
}

function Bloco({ titulo, subtitulo, linhas, onLembrar, enviando, vazio }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900">{titulo}</h2>
      <p className="text-xs text-gray-500 mb-3">{subtitulo}</p>
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        {linhas.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-green-700 p-4">
            <CheckCircle2 size={16} /> {vazio}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="p-3 font-medium">Cliente</th>
                <th className="p-3 font-medium">Carrinho</th>
                <th className="p-3 font-medium">Parado há</th>
                <th className="p-3 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {linhas.map((c) => (
                <tr key={c.id}>
                  <td className="p-3">
                    <span className="block text-gray-800 font-medium">{c.nome}</span>
                    {c.telefone ? (
                      <a href={`https://wa.me/55${String(c.telefone).replace(/\D/g, '')}`}
                         target="_blank" rel="noreferrer"
                         className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <Phone size={11} /> {c.telefone}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">sem telefone</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-700">
                    {brl(c.valor)}
                    <span className="text-gray-400"> · {c.itens} {c.itens === 1 ? 'item' : 'itens'}</span>
                  </td>
                  <td className="p-3 text-gray-700">{idade(c.minutos)}</td>
                  <td className="p-3 text-right">
                    {!c.tem_push ? (
                      // Sem token não adianta botão: ele só daria erro. O
                      // caminho que resta é o telefone, ao lado do nome.
                      <span className="text-xs text-gray-400">sem avisos ligados</span>
                    ) : c.ja_lembrado_hoje ? (
                      <span className="text-xs text-gray-500">já lembrado hoje</span>
                    ) : (
                      <button
                        onClick={() => onLembrar(c)}
                        disabled={enviando === c.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 disabled:opacity-60"
                      >
                        <BellRing size={13} />
                        {enviando === c.id ? 'Enviando…' : 'Lembrar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
