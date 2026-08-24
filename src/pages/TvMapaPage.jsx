// Mapa de parede do escritório (rota /tv/mapa). Fica aberto 24/7 numa TV.
//
// Irmão do /tv, com uma diferença de propósito: aquele responde "quanto", este
// responde "ONDE". Número no painel diz que houve oito entregas; o mapa mostra
// que sete saíram do centro e nenhuma passou do rio — e isso muda o que o
// Diego faz no dia seguinte.
//
// TRÊS DECISÕES QUE VALEM MAIS QUE O DESENHO:
//
// 1. Consulta a cada 60s (o Diego pediu; antes eu tinha proposto 30). Um mapa
//    não precisa de mais: pino de loja quase não muda, e entregador andando
//    120 m entre uma atualização e outra não muda decisão nenhuma.
//
// 2. A TELA NUNCA CONGELA ENTRE AS CONSULTAS. Pulso, brilho e o ponto que
//    corre na rota são animação local em CSS. Sem isso, 59 dos 60 segundos
//    seriam uma imagem parada — e painel parado a gente para de olhar, que é
//    o único jeito de um painel falhar de verdade.
//
// 3. Com zero pedido, NÃO mostra um mapa vazio. Vira quadro de prontidão: o
//    que está pronto, o que falta pra cidade poder pedir. Enquanto a operação
//    não começa, essa é a informação que importa — e é a que muda sozinha
//    quando alguém abre a loja.
//
// A coordenada do cliente já chega deslocada do servidor. Ver a nota no
// endpoint: parede de escritório é vista por visita e por entregador.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Store, Bike, Package, Wallet, Wifi, WifiOff, MapPin, CheckCircle2, Clock,
} from 'lucide-react';
import authService from '../services/authService';
import { API_BASE_URL } from '../services/api';

const POLL_MS = 60000;

// Escuro por padrão: é painel de parede, e mapa claro numa TV acesa o dia
// inteiro cansa a vista e ofusca os pontos. Trocar é definir VITE_MAP_TILE_URL.
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL ||
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = import.meta.env.VITE_MAP_ATTRIBUTION ||
  '&copy; OpenStreetMap &copy; CARTO';

const brl = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const VEICULO = { bicicleta: '🚲', bike: '🚲', moto: '🛵', motocicleta: '🛵',
                  carro: '🚗', utilitario: '🚚', utilitário: '🚚' };

/* ── ícones ─────────────────────────────────────────────────────────────── */

const iconeLoja = (aberto) => L.divIcon({
  className: '',
  html: `<div class="pino ${aberto ? 'pino-on' : 'pino-off'}">
           ${aberto ? '<span class="anel"></span>' : ''}
           <span class="nucleo"></span>
         </div>`,
  iconSize: [26, 26], iconAnchor: [13, 13],
});

const iconeEntregador = (veiculo, disponivel) => L.divIcon({
  className: '',
  html: `<div class="ent ${disponivel ? 'ent-on' : 'ent-off'}">
           <span>${VEICULO[veiculo] || '🛵'}</span>
         </div>`,
  iconSize: [30, 30], iconAnchor: [15, 15],
});

const iconeEntrega = L.divIcon({
  className: '',
  html: '<div class="brilho"></div>',
  iconSize: [18, 18], iconAnchor: [9, 9],
});

/* ── enquadramento ──────────────────────────────────────────────────────── */

function Enquadra({ pontos, raioKm, centro }) {
  const map = useMap();
  const assinatura = pontos.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join('|');

  useEffect(() => {
    // Reenquadra só quando os pontos MUDAM de verdade. Chamar fitBounds a cada
    // atualização faria o mapa dar um pulinho de minuto em minuto — numa TV
    // isso vira tique nervoso.
    if (pontos.length >= 2) {
      map.fitBounds(L.latLngBounds(pontos).pad(0.28), { animate: false });
    } else if (pontos.length === 1) {
      map.setView(pontos[0], 13, { animate: false });
    } else {
      map.setView([centro.lat, centro.lng], Math.max(9, 13 - Math.log2(raioKm / 5)), { animate: false });
    }
  }, [assinatura]);   // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/* ── tela ───────────────────────────────────────────────────────────────── */

export default function TvMapaPage() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);
  const [relogio, setRelogio] = useState(new Date());
  const [atualizado, setAtualizado] = useState(null);
  const vivo = useRef(true);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/tv/mapa`, {
        headers: { Authorization: `Bearer ${authService.getToken()}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || 'falhou');
      if (!vivo.current) return;
      setDados(j.data);
      setAtualizado(new Date());
      setErro(false);
    } catch {
      // Mantém os últimos dados na tela. Painel de parede que pisca zerado
      // porque o backend hesitou é pior que painel um minuto atrasado.
      if (vivo.current) setErro(true);
    }
  }, []);

  useEffect(() => {
    vivo.current = true;
    carregar();
    const p = setInterval(carregar, POLL_MS);
    const t = setInterval(() => setRelogio(new Date()), 1000);
    return () => { vivo.current = false; clearInterval(p); clearInterval(t); };
  }, [carregar]);

  const pontos = useMemo(() => {
    if (!dados) return [];
    return [
      ...dados.parceiros.map((p) => [p.lat, p.lng]),
      ...dados.entregadores.map((e) => [e.lat, e.lng]),
      ...dados.pedidos.map((o) => [o.lat, o.lng]),
    ];
  }, [dados]);

  const r = dados?.resumo;
  const emRota = (dados?.pedidos || []).filter((p) => p.em_rota && p.loja_lat);
  const entregues = (dados?.pedidos || []).filter((p) => p.entregue);
  const semMovimento = Boolean(dados) && entregues.length === 0 && emRota.length === 0;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0B1014] text-white">
      <style>{estilos}</style>

      {dados && (
        <MapContainer
          center={[dados.centro.lat, dados.centro.lng]}
          zoom={12}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          keyboard={false}
          className="absolute inset-0 h-full w-full"
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
          <Enquadra pontos={pontos} raioKm={dados.raio_km} centro={dados.centro} />

          {/* Área que a Inksa cobre hoje. É o contorno do negócio: tudo que
              acontece fora dele é pedido que o sistema recusa. */}
          <Circle
            center={[dados.centro.lat, dados.centro.lng]}
            radius={dados.raio_km * 1000}
            pathOptions={{ color: '#FF7A3D', weight: 1, opacity: 0.35,
                           fillColor: '#FF7A3D', fillOpacity: 0.04 }}
          />

          {entregues.map((o) => (
            <Marker key={`e-${o.id}`} position={[o.lat, o.lng]} icon={iconeEntrega} />
          ))}

          {emRota.map((o) => (
            <Polyline
              key={`r-${o.id}`}
              positions={[[o.loja_lat, o.loja_lng], [o.lat, o.lng]]}
              pathOptions={{ color: '#FFB067', weight: 2.5, opacity: 0.9,
                             dashArray: '6 10', className: 'rota-viva' }}
            />
          ))}

          {dados.parceiros.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={iconeLoja(p.aberto)} />
          ))}

          {dados.entregadores.map((e) => (
            <Marker key={e.id} position={[e.lat, e.lng]}
                    icon={iconeEntregador(e.veiculo, e.disponivel)} />
          ))}
        </MapContainer>
      )}

      {/* véu pra escurecer as bordas e destacar os painéis */}
      <div className="pointer-events-none absolute inset-0 z-10 veu" />

      {/* ── topo ─────────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-7">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300/80">
            <MapPin size={13} /> Inksa ao vivo
          </p>
          <h1 className="mt-1 text-4xl font-black leading-none tracking-tight">
            {r ? `${r.abertos} de ${r.parceiros}` : '—'}
            <span className="ml-2 text-lg font-semibold text-white/50">
              {r?.abertos === 1 ? 'loja aberta agora' : 'lojas abertas agora'}
            </span>
          </h1>
        </div>
        <div className="text-right">
          <p className="text-5xl font-black tabular-nums leading-none">
            {relogio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className={`mt-1.5 flex items-center justify-end gap-1.5 text-xs font-semibold ${
            erro ? 'text-amber-300' : 'text-emerald-300/80'}`}>
            {erro ? <WifiOff size={12} /> : <Wifi size={12} />}
            {erro
              ? 'reconectando'
              : atualizado
                ? `atualizado ${atualizado.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'carregando'}
          </p>
        </div>
      </div>

      {/* ── rodapé: os números ───────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-7">
        <div className="flex flex-wrap items-end gap-3">
          <Placar icone={CheckCircle2} rotulo="entregues hoje" valor={r?.entregues_hoje ?? '—'} />
          <Placar icone={Package} rotulo="em rota agora" valor={r?.em_rota ?? '—'}
                  aceso={Boolean(r?.em_rota)} />
          <Placar icone={Bike} rotulo="entregadores em campo" valor={r?.em_campo ?? '—'}
                  nota={r ? `${r.disponiveis} disponíveis` : null} />
          <Placar icone={Wallet} rotulo="vendido hoje" valor={r ? brl(r.valor_hoje) : '—'} largo />
          <span className="ml-auto text-[10px] uppercase tracking-widest text-white/25">
            {TILE_ATTR.replace(/&copy;/g, '©')} · posições dos clientes deslocadas
          </span>
        </div>
      </div>

      {/* ── nada aconteceu ainda ─────────────────────────────────────── */}
      {semMovimento && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 w-[min(30rem,80vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0B1014]/80 p-7 text-center backdrop-blur-md">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300/80">
            <Clock size={13} /> Prontidão
          </p>
          <p className="mt-3 text-2xl font-black leading-tight">
            {r?.abertos > 0 && r?.disponiveis > 0
              ? 'A cidade pode pedir agora.'
              : 'A cidade ainda não pode pedir.'}
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-white/70">
            <li className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2"><Store size={14} /> Lojas abertas</span>
              <b className={r?.abertos > 0 ? 'text-emerald-300' : 'text-amber-300'}>
                {r?.abertos ?? 0} de {r?.parceiros ?? 0}
              </b>
            </li>
            <li className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2"><Bike size={14} /> Entregadores prontos</span>
              <b className={r?.disponiveis > 0 ? 'text-emerald-300' : 'text-amber-300'}>
                {r?.disponiveis ?? 0}
              </b>
            </li>
          </ul>
          <p className="mt-4 text-xs text-white/40">
            Assim que o primeiro pedido do dia entrar, ele aparece aqui no mapa.
          </p>
        </div>
      )}

      {!dados && !erro && (
        <div className="absolute inset-0 grid place-items-center text-white/40">Carregando o mapa…</div>
      )}
    </div>
  );
}

function Placar({ icone: Icone, rotulo, valor, nota, aceso, largo }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-[#0B1014]/70 px-5 py-3 backdrop-blur-md ${
      largo ? 'min-w-[13rem]' : 'min-w-[9.5rem]'} ${aceso ? 'ring-1 ring-orange-400/40' : ''}`}>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
        <Icone size={11} /> {rotulo}
      </p>
      <p className="mt-0.5 text-3xl font-black tabular-nums leading-none">{valor}</p>
      {nota && <p className="mt-0.5 text-[11px] text-white/40">{nota}</p>}
    </div>
  );
}

/* Animação local: é ela que mantém a tela viva nos 59 segundos entre uma
   consulta e outra. Tudo em CSS, sem timer em JS, pra não pesar rodando o dia
   inteiro numa TV. */
const estilos = `
.veu { background:
  radial-gradient(120% 80% at 50% 0%, transparent 40%, rgba(11,16,20,.85) 100%),
  linear-gradient(to top, rgba(11,16,20,.92) 0%, transparent 26%); }
/* z-index 0 no container é o que impede o mapa de cobrir os painéis: os panes
   internos do Leaflet vão até 700, e sem um contexto de empilhamento próprio
   eles sobem por cima de qualquer coisa que não declare z-index. O mapa
   renderizava perfeito e os números ficavam invisíveis atrás dele. */
.leaflet-container { background: #0B1014; z-index: 0; }

.pino { position: relative; width: 26px; height: 26px; }
.pino .nucleo { position: absolute; inset: 8px; border-radius: 50%;
  background: #6B7C85; box-shadow: 0 0 0 2px rgba(11,16,20,.9); }
.pino-on .nucleo { background: #FF7A3D; box-shadow: 0 0 0 2px rgba(11,16,20,.9), 0 0 14px 3px rgba(255,122,61,.55); }
.pino-on .anel { position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid rgba(255,122,61,.8); animation: bater 2.4s ease-out infinite; }
@keyframes bater { 0% { transform: scale(.35); opacity: .9 } 100% { transform: scale(1.5); opacity: 0 } }

.ent { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%;
  background: rgba(11,16,20,.85); font-size: 15px; line-height: 1; }
.ent-on  { border: 2px solid #34D399; box-shadow: 0 0 12px 2px rgba(52,211,153,.4); }
.ent-off { border: 2px solid rgba(148,163,175,.5); filter: grayscale(.6); opacity: .75; }

.brilho { width: 18px; height: 18px; border-radius: 50%;
  background: radial-gradient(circle, rgba(52,211,153,.95) 0%, rgba(52,211,153,.25) 45%, transparent 70%);
  animation: respirar 3.2s ease-in-out infinite; }
@keyframes respirar { 0%,100% { transform: scale(.75); opacity: .55 } 50% { transform: scale(1.15); opacity: 1 } }

/* o tracejado anda: e a rota deixa de ser um risco e vira movimento */
.rota-viva { animation: correr 1.2s linear infinite; }
@keyframes correr { to { stroke-dashoffset: -16; } }

@media (prefers-reduced-motion: reduce) {
  .pino-on .anel, .brilho, .rota-viva { animation: none; }
}
`;
