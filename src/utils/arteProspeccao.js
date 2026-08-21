/**
 * A arte que o Diego mostra ao parceiro quando vai prospectar.
 *
 * O argumento não é comissão, é recado: "N clientes meus digitaram o nome de
 * vocês procurando pedir". Isso não se conta bem por telefone — se mostra. Por
 * isso a peça sai como PNG: cabe no WhatsApp, no story, ou na tela do celular
 * em cima do balcão.
 *
 * DESENHADO EM CANVAS, DE PROPÓSITO. Podia ser HTML bonito na tela, mas HTML
 * não vira imagem sem biblioteca de terceiro, e o que o parceiro precisa ver é
 * um arquivo que o Diego consegue MANDAR. Aqui é o navegador desenhando: sem
 * dependência nova, sem servidor de imagem, e o download é um clique.
 *
 * Duas regras que a peça não pode quebrar:
 *
 * 1. O NÚMERO É DO BANCO. Ninguém digita. Se a peça dissesse "7" e o dono
 *    perguntasse quem foram, a resposta tem que existir.
 * 2. A OFERTA TEM VALIDADE E ELA EXPIRA SOZINHA. Passado o prazo do Parceiro
 *    Fundador, a faixa de baixo troca para a proposta normal em vez de
 *    continuar prometendo o que não vale mais. Promessa vencida entregue na
 *    mão do dono da loja custa mais caro que a peça inteira vale.
 */

// Prazo do Parceiro Fundador. Quando passar, a arte troca de discurso sozinha
// — não some, só para de prometer meia comissão.
export const FUNDADOR_ATE = new Date('2026-08-31T23:59:59-03:00');

const LARANJA = '#DD5209';
const LARANJA_ESC = '#B23D04';
const PAPEL = '#FDFBF7';
const TINTA = '#17120E';
const TINTA_FRACA = '#6B5C50';

const FAMILIA = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
const fonte = (peso, px) => `${peso} ${px}px ${FAMILIA}`;

export const FORMATOS = {
  post:  { rotulo: 'Post 4:5',   largura: 1080, altura: 1350 },
  story: { rotulo: 'Story 9:16', largura: 1080, altura: 1920 },
};

/** Carrega o logo uma vez. Resolve com null se falhar — a arte sai sem ele. */
export function carregarLogo(src = '/inka-logo.png') {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function caixa(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Texto espaçado (canvas não tem letter-spacing em todo navegador). */
function espacado(ctx, texto, x, y, espaco) {
  let cursor = x;
  for (const ch of texto) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + espaco;
  }
  return cursor - x - espaco;
}

/** Maior corpo que faz o texto caber em `linhas` linhas dentro de `maxL`. */
function ajustar(ctx, texto, maxL, corpoIni, peso, linhasMax) {
  let corpo = corpoIni;
  while (corpo > 28) {
    ctx.font = fonte(peso, corpo);
    const linhas = quebrar(ctx, texto, maxL);
    if (linhas.length <= linhasMax && linhas.every((l) => ctx.measureText(l).width <= maxL)) {
      return { corpo, linhas };
    }
    corpo -= 4;
  }
  ctx.font = fonte(peso, corpo);
  return { corpo, linhas: quebrar(ctx, texto, maxL).slice(0, linhasMax) };
}

function quebrar(ctx, texto, maxL) {
  const palavras = String(texto).split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = '';
  for (const p of palavras) {
    const tenta = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(tenta).width <= maxL || !atual) atual = tenta;
    else { linhas.push(atual); atual = p; }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/**
 * Desenha a peça.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} o
 * @param {string} o.nome      nome da loja como o cliente escreveu
 * @param {number} o.pedidos   quantas pessoas pediram (vem do banco)
 * @param {'prospect'|'parceiro'} o.modo
 * @param {'post'|'story'} o.formato
 * @param {HTMLImageElement|null} o.logo
 * @param {Date} [o.hoje]      injetável só para teste
 */
export function desenharArte(canvas, o) {
  const { nome, pedidos, modo = 'prospect', formato = 'post', logo = null } = o;
  const hoje = o.hoje || new Date();
  const fundadorVale = hoje <= FUNDADOR_ATE;

  const { largura: W, altura: H } = FORMATOS[formato] || FORMATOS.post;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const M = 88;
  const util = W - M * 2;

  // ── fundo ────────────────────────────────────────────────────────────────
  ctx.fillStyle = PAPEL;
  ctx.fillRect(0, 0, W, H);

  // Brilho laranja atrás do número. Dá profundidade sem escurecer a peça — o
  // Diego já disse que não gosta de arte escura.
  const brilho = ctx.createRadialGradient(W * 0.78, H * 0.20, 40, W * 0.78, H * 0.20, W * 0.72);
  brilho.addColorStop(0, 'rgba(221,82,9,0.16)');
  brilho.addColorStop(1, 'rgba(221,82,9,0)');
  ctx.fillStyle = brilho;
  ctx.fillRect(0, 0, W, H);

  // ── faixa de baixo ───────────────────────────────────────────────────────
  const faixaH = formato === 'story' ? 620 : 500;
  const faixaY = H - faixaH;
  const fundo = ctx.createLinearGradient(0, faixaY, W, H);
  if (modo === 'parceiro') {
    fundo.addColorStop(0, '#241A12');
    fundo.addColorStop(1, TINTA);
  } else {
    fundo.addColorStop(0, LARANJA);
    fundo.addColorStop(1, LARANJA_ESC);
  }
  ctx.fillStyle = fundo;
  ctx.fillRect(0, faixaY, W, faixaH);

  // ── logo, num adesivo branco ─────────────────────────────────────────────
  // O arquivo do logo tem fundo creme, não transparente. Sobre um retângulo
  // branco arredondado a emenda não aparece e ainda parece proposital.
  let topo = M;
  if (logo && logo.width) {
    const altura = formato === 'story' ? 150 : 132;
    const escala = altura / logo.height;
    const larg = logo.width * escala;
    ctx.save();
    ctx.shadowColor = 'rgba(23,18,14,0.10)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#FFFFFF';
    caixa(ctx, M - 14, topo - 10, larg + 28, altura + 20, 26);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(logo, M, topo, larg, altura);
    topo += altura + 10;
  } else {
    ctx.fillStyle = LARANJA;
    ctx.font = fonte(800, formato === 'story' ? 92 : 82);
    ctx.textBaseline = 'top';
    ctx.fillText('inksa', M, topo);
    topo += (formato === 'story' ? 92 : 82) + 10;
  }

  // ── miolo ────────────────────────────────────────────────────────────────
  ctx.textBaseline = 'alphabetic';
  const um = Number(pedidos) === 1;

  // MEDE ANTES DE DESENHAR. Nome de loja varia de "Yo Frango" a "Restaurante e
  // Churrascaria Sabor da Serra": posicionar no chute funciona no nome curto e
  // joga a última linha por cima da faixa laranja no nome comprido — que é
  // justamente o caso que ninguém testa e o parceiro recebe.
  const corpoRodape = formato === 'story' ? 44 : 38;
  const alvo = ajustar(ctx, nome || 'sua loja', util, formato === 'story' ? 96 : 84, 800, 2);

  // Altura da pilha = do rótulo até a linha de baixo, medida de verdade.
  let corpoNum = formato === 'story' ? 320 : 268;
  const pilha = () => 62 + corpoNum * 0.86 + alvo.linhas.length * alvo.corpo * 1.02 + 58;

  // Ancorado na FAIXA, não no topo. A faixa é o fim fixo da peça; a folga que
  // sobra por causa de nome curto ou formato mais alto vai toda pro respiro de
  // cima, onde ela parece proposital em vez de buraco no meio.
  const yBaixo = () => faixaY - (formato === 'story' ? 96 : 78) - pilha();
  const yTopo  = topo + 64;
  while (yBaixo() < yTopo && corpoNum > 150) corpoNum -= 12;

  // Alinhado à esquerda: a peça é um recado, não um cartaz de feira. Tudo
  // centralizado é o jeito mais rápido de parecer template.
  let y = Math.max(yTopo, yTopo + (yBaixo() - yTopo) * 0.55);

  ctx.fillStyle = LARANJA;
  ctx.font = fonte(700, 30);
  espacado(ctx, 'REGISTRADO NO APP DA INKSA', M, y, 4.5);
  y += 62;

  // O número domina. É ele que faz o dono da loja parar pra ouvir.
  ctx.font = fonte(800, corpoNum);
  ctx.fillStyle = LARANJA;
  const numTxt = String(Math.max(1, Number(pedidos) || 1));
  ctx.fillText(numTxt, M, y + corpoNum * 0.74);
  const larguraNum = ctx.measureText(numTxt).width;

  ctx.fillStyle = TINTA;
  ctx.font = fonte(600, formato === 'story' ? 62 : 54);
  ctx.fillText(um ? 'pessoa procurou' : 'pessoas procuraram', M + larguraNum + 26, y + corpoNum * 0.74);
  y += corpoNum * 0.86;

  // Nome da loja: tinta escura sobre papel. Laranja sobre laranja some, e já
  // sumiu uma vez numa arte anterior.
  ctx.fillStyle = TINTA;
  for (const linha of alvo.linhas) {
    y += alvo.corpo * 1.02;
    ctx.font = fonte(800, alvo.corpo);
    ctx.fillText(linha, M, y);
  }

  y += 58;
  ctx.fillStyle = TINTA_FRACA;
  ctx.font = fonte(400, corpoRodape);
  ctx.fillText(
    um ? 'e não achou pra pedir.' : 'e não acharam pra pedir.',
    M, y,
  );

  // ── conteúdo da faixa ────────────────────────────────────────────────────
  const claro = modo === 'parceiro' ? '#FFFFFF' : '#FFFFFF';
  const suave = modo === 'parceiro' ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.82)';
  let fy = faixaY + (formato === 'story' ? 92 : 76);

  ctx.fillStyle = modo === 'parceiro' ? '#FFB27A' : 'rgba(255,255,255,0.85)';
  ctx.font = fonte(700, 28);
  espacado(
    ctx,
    modo === 'parceiro' ? 'VOCÊ JÁ ESTÁ NA INKSA' : (fundadorVale ? 'PARCEIRO FUNDADOR' : 'COMO FUNCIONA'),
    M, fy, 4.5,
  );
  fy += formato === 'story' ? 78 : 68;

  const titulo = modo === 'parceiro'
    ? 'Mas eles não acharam você.'
    : (fundadorVale
        ? 'Metade da comissão nos 6 primeiros meses.'
        : 'Comissão de 15% e repasse toda semana.');
  const t = ajustar(ctx, titulo, util, formato === 'story' ? 70 : 60, 800, 2);
  ctx.fillStyle = claro;
  for (const linha of t.linhas) {
    ctx.font = fonte(800, t.corpo);
    ctx.fillText(linha, M, fy);
    fy += t.corpo * 1.16;
  }

  fy += 18;
  const sub = modo === 'parceiro'
    ? 'Cardápio completo e loja aberta é o que faz aparecer na busca.'
    : (fundadorVale
        ? 'Para quem entrar até 31 de agosto. Depois, comissão cheia de 15%.'
        : 'Sem mensalidade, sem taxa de adesão, cada centavo discriminado.');
  const s = ajustar(ctx, sub, util, formato === 'story' ? 42 : 37, 400, 2);
  ctx.fillStyle = suave;
  for (const linha of s.linhas) {
    ctx.font = fonte(400, s.corpo);
    ctx.fillText(linha, M, fy);
    fy += s.corpo * 1.28;
  }

  ctx.fillStyle = suave;
  ctx.font = fonte(700, formato === 'story' ? 38 : 34);
  ctx.fillText('inksadelivery.com.br', M, H - (formato === 'story' ? 74 : 62));

  return canvas;
}

/** Texto do WhatsApp que acompanha a arte. Quem manda é o Diego, não o app. */
export function mensagemProspeccao({ nome, pedidos, modo, primeiroNome, hoje }) {
  const um = Number(pedidos) === 1;
  const quem = primeiroNome ? `Aqui é o ${primeiroNome}, da Inksa Delivery` : 'Aqui é da Inksa Delivery';
  const fundadorVale = (hoje || new Date()) <= FUNDADOR_ATE;

  if (modo === 'parceiro') {
    return [
      `Oi! ${quem}.`,
      '',
      `${um ? 'Uma pessoa procurou' : `${pedidos} pessoas procuraram`} a ${nome} dentro do nosso app e não ${um ? 'achou' : 'acharam'}.`,
      '',
      'Você já é parceiro — o que costuma segurar é cardápio incompleto ou a loja fechada no horário. Se quiser, eu te ajudo a deixar tudo no ar agora.',
    ].join('\n');
  }

  return [
    `Oi! ${quem}, o delivery daqui da cidade.`,
    '',
    `Estou passando porque ${um ? 'um cliente nosso digitou' : `${pedidos} clientes nossos digitaram`} o nome da ${nome} dentro do app procurando pedir de vocês.`,
    '',
    fundadorVale
      ? 'Como Parceiro Fundador vocês pagam metade da comissão nos 6 primeiros meses (o cadastro vale até 31/08). Sem mensalidade e sem taxa de adesão, com repasse toda semana e cada centavo discriminado.'
      : 'A comissão é de 15%, sem mensalidade e sem taxa de adesão, com repasse toda semana e cada centavo discriminado.',
    '',
    'Posso te mostrar como funciona?',
  ].join('\n');
}
