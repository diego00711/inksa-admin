// DE ONDE VEM O CLIENTE — o funil de cada campanha.
//
// A tela existe pra responder uma pergunta de dinheiro: a publi se pagou?
// Por isso ela é ordenada por RECEITA, não por cliques. Clique é o número
// bonito que todo influenciador manda de print; receita é o que decide se
// renova.
//
// ⚠️ A linha "sem campanha" não é uma campanha — é a RÉGUA. 40 cadastros é
// bom? Só dá pra saber contra o que entra sozinho. Sem ela a tela mostraria
// números sem escala, e número sem escala vira a interpretação que a pessoa
// já queria ter.
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Megaphone, Loader2, Copy, CheckCircle2, AlertTriangle, Link2 } from 'lucide-react';
import authService from '../services/authService';
import { NotificationContext } from '../context/NotificationContext';
import { brl } from '../utils/dinheiro';
import { mensagemDeErro } from '../utils/mensagemDeErro.js';

const APP_CLIENTE = 'https://clientes.inksadelivery.com.br';

// Percentual só quando o denominador existe. `0 de 0` não é 0%, é "não dá pra
// dizer" — e escrever 0% ali faria uma campanha sem clique nenhum parecer uma
// campanha que converteu mal.
const pct = (parte, todo) =>
  (!todo || todo <= 0) ? '—' : `${Math.round((parte / todo) * 100)}%`;

const quando = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

function Numero({ rotulo, valor, ajuda }) {
  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <p className="text-xs text-gray-500">{rotulo}</p>
      <p className="text-2xl font-medium text-gray-900 tabular-nums">{valor}</p>
      {ajuda && <p className="text-xs text-gray-400 mt-0.5">{ajuda}</p>}
    </div>
  );
}

export default function CampanhasPage() {
  const { notify } = useContext(NotificationContext);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [novo, setNovo] = useState('');
  const [copiado, setCopiado] = useState('');

  const buscar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await authService.getCampanhas();
      setDados(r?.data || null);
      setErro(null);
    } catch (err) {
      setErro(mensagemDeErro(err, 'não consegui carregar o funil agora.',
        'sem conexão agora — tente quando o sinal voltar.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { buscar(); }, [buscar]);

  // O código é normalizado AQUI e no backend, com a mesma regra. Não é
  // duplicação à toa: aqui é pra pessoa ver o link certo antes de mandar; lá
  // é porque a rota é pública e não pode confiar em nada que chega.
  const limpo = novo.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const linkNovo = limpo ? `${APP_CLIENTE}/register?de=${limpo}` : '';

  const copiar = async (texto, chave) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado(''), 2000);
    } catch {
      notify('Não consegui copiar — selecione o link e copie na mão.', 'error');
    }
  };

  const campanhas = dados?.campanhas || [];
  const org = dados?.organico;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="w-6 h-6 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">De onde vem o cliente</h1>
          <p className="text-sm text-gray-500">
            Cada campanha nasce do primeiro clique. Não precisa cadastrar nada aqui.
          </p>
        </div>
      </div>

      {/* GERADOR DE LINK. É a única coisa "de fazer" nesta tela, então fica no
          topo: o resto é leitura. */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-4 h-4 text-gray-500" />
          <h2 className="font-medium text-gray-900">Montar um link</h2>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Escolha um apelido curto pra quem vai divulgar — quem receber o link nunca vê esse
          apelido, ele some da barra de endereço assim que a página abre.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            placeholder="guga"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <code className="flex-1 min-w-[260px] rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700 truncate">
            {linkNovo || `${APP_CLIENTE}/register?de=…`}
          </code>
          <button
            onClick={() => copiar(linkNovo, 'novo')}
            disabled={!linkNovo}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            {copiado === 'novo'
              ? <><CheckCircle2 className="w-4 h-4 text-green-600" /> Copiado</>
              : <><Copy className="w-4 h-4" /> Copiar</>}
          </button>
        </div>
        {novo && limpo !== novo.trim().toLowerCase() && (
          <p className="text-xs text-amber-700 mt-2">
            Ajustei pra <strong>{limpo || '(vazio)'}</strong> — só letras, números, hífen e
            sublinhado. Maiúsculas viram minúsculas pra não virar duas campanhas.
          </p>
        )}
      </div>

      {carregando && (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      )}

      {erro && !carregando && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{erro}</p>
        </div>
      )}

      {!carregando && !erro && (
        <>
          {org && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="font-medium text-gray-900 mb-1">Sem campanha — a régua</h2>
              <p className="text-sm text-gray-500 mb-4">
                Quem chegou por conta própria. É contra estes números que os de cima devem
                ser lidos.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Numero rotulo="Cadastros" valor={org.cadastros} />
                <Numero rotulo="Compraram" valor={org.compradores}
                        ajuda={pct(org.compradores, org.cadastros) + ' dos cadastros'} />
                <Numero rotulo="Pedidos" valor={org.pedidos} />
                <Numero rotulo="Faturado" valor={brl(org.receita)} />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-medium text-gray-900">Campanhas</h2>
              <p className="text-sm text-gray-500">
                Ordenadas por faturamento. Cliques dos últimos {dados?.dias || 90} dias;
                cadastros e pedidos desde sempre — a publi é num dia, os pedidos dela caem
                por semanas.
              </p>
            </div>

            {campanhas.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-500 text-center">
                Nenhuma campanha ainda. Monte um link acima e mande pra quem vai divulgar —
                a contagem começa no primeiro clique.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium">Campanha</th>
                      <th className="px-3 py-3 text-right font-medium">Cliques</th>
                      <th className="px-3 py-3 text-right font-medium">Cadastros</th>
                      <th className="px-3 py-3 text-right font-medium">Compraram</th>
                      <th className="px-3 py-3 text-right font-medium">Pedidos</th>
                      <th className="px-3 py-3 text-right font-medium">Faturado</th>
                      <th className="px-5 py-3 text-right font-medium">Último clique</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {campanhas.map((c) => (
                      <tr key={c.codigo} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{c.codigo}</span>
                            <button
                              onClick={() => copiar(`${APP_CLIENTE}/register?de=${c.codigo}`, c.codigo)}
                              title="Copiar o link desta campanha"
                              className="text-gray-400 hover:text-gray-700"
                            >
                              {copiado === c.codigo
                                ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                                : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-700">{c.cliques}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                          {c.cadastros}
                          <span className="text-xs text-gray-400 ml-1">{pct(c.cadastros, c.cliques)}</span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                          {c.compradores}
                          <span className="text-xs text-gray-400 ml-1">{pct(c.compradores, c.cadastros)}</span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-700">{c.pedidos}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium text-gray-900">{brl(c.receita)}</td>
                        <td className="px-5 py-3 text-right text-gray-500">{quando(c.ultimo_clique)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* A ressalva fica na tela, não só no código: quem lê o número tem
              que saber o que ele aguenta. */}
          <p className="text-xs text-gray-400">
            Clique é o número mais fraco dos quatro: a rota que conta é pública, então dá pra
            inflar de fora. Cadastro exige conta e pedido exige pagamento — é neles que se
            decide se a publi valeu.
          </p>
        </>
      )}
    </div>
  );
}
