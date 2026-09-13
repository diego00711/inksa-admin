// BannerManagementPage.jsx

import React, { useState, useEffect, useRef, useContext } from 'react';
import authService from '../services/authService';
import { API_BASE_URL } from '../services/api';
import { NotificationContext } from '../context/NotificationContext';
import { Loader2 } from 'lucide-react';
import { mensagemDeErro } from '../utils/mensagemDeErro.js';

// --- Helpers de agendamento (datetime-local <-> ISO) ---
// datetime-local trabalha em horário LOCAL; o backend guarda timestamptz (UTC).
function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16); // 'YYYY-MM-DDTHH:mm'
}
function localInputToIso(val) {
  if (!val) return null;
  const d = new Date(val); // interpreta como horário local
  return isNaN(d) ? null : d.toISOString();
}
function fmtDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d) ? null : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
// Status efetivo do banner combinando ativo + janela de tempo.
function bannerStatus(b) {
  if (!b.is_active) return { label: 'Inativo', cls: 'bg-gray-200 text-gray-600' };
  const now = Date.now();
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return { label: 'Agendado', cls: 'bg-blue-100 text-blue-800' };
  if (b.ends_at && new Date(b.ends_at).getTime() < now) return { label: 'Expirado', cls: 'bg-orange-100 text-orange-800' };
  return { label: 'No ar', cls: 'bg-green-100 text-green-800' };
}

const BannerManagementPage = () => {
  const { notify } = useContext(NotificationContext);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const fileInputRef = useRef(null);
  
  const getInitialFormData = () => ({
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    is_active: true,
    text_position: 'center',
    starts_at: '', // horário local no input; vira ISO no submit
    ends_at: '',
    duration_seconds: '', // segundos na tela (vazio = padrão do app)
    audience: 'cliente', // app-alvo: cliente / parceiro / entregador
    is_sponsored: false, // mostra o selo "Patrocinado"
    sponsor_name: '', // nome do anunciante (quando patrocinado)
    // Alcance geográfico: vazio = banner nacional (aparece pra todo mundo).
    // Com CEP preenchido, só aparece pra quem está dentro do raio.
    geo_cep: '',
    geo_city: '',
    geo_latitude: '',
    geo_longitude: '',
    geo_radius_km: ''
  });

  const [formData, setFormData] = useState(getInitialFormData());

  // ─── Oferta Relâmpago ────────────────────────────────────────────────────
  // Banner e cupom nascem JUNTOS (um endpoint só, /relampago/<id>/criar):
  // banner que promete desconto sem cupom é propaganda enganosa, e cupom sem
  // banner ninguém consegue ativar — a reserva só nasce do toque no banner.
  const [lojas, setLojas] = useState([]);
  const [itensDaLoja, setItensDaLoja] = useState([]);
  const [relampago, setRelampago] = useState({
    ligado: false,
    restaurant_id: '',
    menu_item_id: '',
    discount_type: 'fixed',
    discount_value: '',
    reserva_minutos: '5',
    max_uses: '',
    min_order_value: '',
  });
  const [disparando, setDisparando] = useState(null); // id do banner em disparo

  useEffect(() => {
    // Lista de lojas pro seletor da oferta. Falha em silêncio: sem ela o admin
    // ainda cria banner normal, só não consegue amarrar oferta.
    (async () => {
      try {
        // API_BASE_URL (o import), não API_URL: o alias local só é declarado
        // mais abaixo no corpo do componente, e depender da ordem de execução
        // pra isso funcionar é pedir pra quebrar quando alguém mover a linha.
        const r = await fetch(`${API_BASE_URL}/api/admin/restaurants`, {
          headers: { Authorization: `Bearer ${authService.getToken()}` },
        });
        if (!r.ok) return;
        const j = await r.json();
        const lista = Array.isArray(j) ? j : (j?.data || j?.restaurants || []);
        setLojas(lista.filter((l) => l?.id));
      } catch { /* seletor fica vazio */ }
    })();
  }, []);
  const [geoBuscando, setGeoBuscando] = useState(false);

  // CEP -> cidade + coordenadas do centro da cidade. É o que define o alcance
  // do banner: quem estiver a mais de `geo_radius_km` daqui não vê o anúncio.
  const handleGeoCepChange = async (e) => {
    const bruto = e.target.value.replace(/\D/g, '').slice(0, 8);
    const mascarado = bruto.length > 5 ? `${bruto.slice(0, 5)}-${bruto.slice(5)}` : bruto;
    setFormData(f => ({ ...f, geo_cep: mascarado }));
    if (bruto.length !== 8) return;

    setGeoBuscando(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${bruto}/json/`);
      const cep = await r.json();
      if (cep?.erro) { setError('CEP não encontrado.'); return; }

      // cidade/UF -> lat/lon pelo NOSSO backend (mesma rota que os 3 apps
      // usam): cache, User-Agent correto e provedor trocável num lugar só.
      const q = new URLSearchParams({ city: cep.localidade || '', state: cep.uf || '' });
      const g = await fetch(`${API_BASE_URL}/api/public/geocode?${q}`);
      const j = g.ok ? await g.json() : null;
      const plat = Number(j?.data?.lat);
      const plng = Number(j?.data?.lng);
      if (!Number.isFinite(plat) || !Number.isFinite(plng)) {
        setError('Não foi possível localizar a cidade desse CEP.'); return;
      }

      setFormData(f => ({
        ...f,
        geo_city: `${cep.localidade} - ${cep.uf}`,
        geo_latitude: plat,
        geo_longitude: plng,
        geo_radius_km: f.geo_radius_km || 50, // padrão razoável pra uma cidade
      }));
      setError('');
    } catch {
      setError('Falha ao consultar o CEP.');
    } finally {
      setGeoBuscando(false);
    }
  };

  const API_URL = API_BASE_URL;

  useEffect(( ) => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError('');
      const token = authService.getToken();
      
      const response = await fetch(`${API_URL}/api/banners`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

      const data = await response.json();
      setBanners(Array.isArray(data.data) ? data.data : []);
      
    } catch (error) {
      console.error('Erro ao carregar banners:', error);
      setError('Erro ao carregar banners: ' + mensagemDeErro(error, 'tente de novo.', 'sem conexão agora — tente quando o sinal voltar.'));
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de arquivo não permitido.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    await uploadImage(file);
  };

  const uploadImage = async (file) => {
    try {
      setUploading(true);
      setError('');
      const token = authService.getToken();
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const response = await fetch(`${API_URL}/api/upload/banner-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataUpload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, image_url: data.data.url }));
      
    } catch (error) {
      console.error('Erro no upload:', error);
      setError('Erro no upload da imagem: ' + mensagemDeErro(error, 'tente de novo.', 'sem conexão agora — tente quando o sinal voltar.'));
      setImagePreview('');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // VALIDAÇÃO CORRIGIDA: Apenas a imagem é obrigatória
    if (!formData.image_url) {
      setError('A imagem do banner é obrigatória');
      return;
    }

    // Janela de agendamento coerente: fim depois do início.
    if (formData.starts_at && formData.ends_at && new Date(formData.ends_at) <= new Date(formData.starts_at)) {
      setError('A data de fim deve ser depois da data de início.');
      return;
    }

    try {
      setError('');
      const token = authService.getToken();

      const url = editingBanner
        ? `${API_URL}/api/banners/${editingBanner.id}`
        : `${API_URL}/api/banners`;

      const method = editingBanner ? 'PUT' : 'POST';

      // Converte os horários locais dos inputs para ISO (UTC) ou null.
      // geo_cep é só da tela (serve pra achar a cidade) — não vai pro banco.
      const { geo_cep, ...semCep } = formData;
      const payload = {
        ...semCep,
        starts_at: localInputToIso(formData.starts_at),
        ends_at: localInputToIso(formData.ends_at),
        duration_seconds: formData.duration_seconds === '' ? null : Number(formData.duration_seconds),
        // Vazio = banner nacional (sem restrição de região).
        geo_latitude: formData.geo_latitude === '' ? null : Number(formData.geo_latitude),
        geo_longitude: formData.geo_longitude === '' ? null : Number(formData.geo_longitude),
        geo_radius_km: formData.geo_radius_km === '' ? null : Number(formData.geo_radius_km),
        geo_city: formData.geo_city || null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      // ─── Oferta relâmpago: cria o cupom e amarra no banner ───────────────
      //
      // Só DEPOIS de o banner existir, porque a oferta mora nele. Se falhar, o
      // banner fica no ar SEM oferta — e o aviso precisa dizer isso com todas
      // as letras: um banner que promete desconto e não entrega é pior que
      // banner nenhum, e o admin tem que saber pra desativar.
      let avisoOferta = '';
      if (relampago.ligado && !editingBanner?.tem_relampago) {
        const novo = await response.clone().json().catch(() => ({}));
        const bannerId = editingBanner?.id || novo?.data?.id || novo?.id;

        if (!bannerId) {
          avisoOferta = ' ⚠️ Mas NÃO consegui criar a oferta (não achei o id do banner). Edite o banner e tente de novo.';
        } else if (!relampago.restaurant_id) {
          avisoOferta = ' ⚠️ Mas a oferta NÃO foi criada: faltou escolher a loja.';
        } else {
          try {
            const ro = await fetch(`${API_URL}/api/coupons/relampago/${bannerId}/criar`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                restaurant_id: relampago.restaurant_id,
                discount_type: relampago.discount_type,
                discount_value: Number(relampago.discount_value || 0),
                reserva_minutos: Number(relampago.reserva_minutos || 5),
                menu_item_id: relampago.menu_item_id || null,
                max_uses: relampago.max_uses === '' ? null : Number(relampago.max_uses),
                min_order_value: relampago.min_order_value === '' ? 0 : Number(relampago.min_order_value),
              }),
            });
            const jo = await ro.json().catch(() => ({}));
            avisoOferta = ro.ok
              ? ` ⚡ Oferta criada (cupom ${jo?.data?.code}).`
              : ` ⚠️ Banner salvo, mas a oferta NÃO foi criada: ${jo?.error || 'erro desconhecido'}`;
          } catch (e) {
            avisoOferta = ` ⚠️ Banner salvo, mas a oferta NÃO foi criada: ${mensagemDeErro(e, 'falha ao criar a oferta')}`;
          }
        }
      }

      const ofertaFalhou = avisoOferta.includes('⚠️');
      notify(
        (editingBanner ? 'Banner atualizado com sucesso!' : 'Banner criado com sucesso!') + avisoOferta,
        ofertaFalhou ? 'warning' : 'success',
      );

      // ⚠️ FALHA DA OFERTA FICA NA TELA, não só num aviso que some.
      //
      // Em 13/09/2026 o banner do Gelaê foi criado e o cupom não (um tipo de
      // desconto que o banco recusava). O aviso passou, o Diego seguiu achando
      // que a oferta existia, e só descobriu quando eu fui conferir no banco.
      //
      // Esse é o pior estado possível: um banner no ar prometendo desconto sem
      // nada por trás. Então além do aviso, o formulário FICA ABERTO com o erro
      // em vermelho — assim não dá pra seguir sem ver.
      if (ofertaFalhou) {
        setError(`O banner foi salvo, mas a OFERTA não. ${avisoOferta.replace('⚠️', '').trim()} `
                 + 'Desative o banner ou tente criar a oferta de novo editando ele — '
                 + 'um banner prometendo desconto sem cupom é pior que banner nenhum.');
        await loadBanners();
        return;   // não fecha o formulário: a pendência tem que ficar visível
      }

      await loadBanners();
      resetForm();
    } catch (error) {
      setError('Erro ao salvar banner: ' + mensagemDeErro(error, 'tente de novo.', 'sem conexão agora — tente quando o sinal voltar.'));
      notify('Erro ao salvar banner: ' + mensagemDeErro(error, 'tente de novo.', 'sem conexão agora — tente quando o sinal voltar.'), 'error');
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      is_active: banner.is_active !== undefined ? banner.is_active : true,
      text_position: banner.text_position || 'center',
      starts_at: isoToLocalInput(banner.starts_at),
      ends_at: isoToLocalInput(banner.ends_at),
      duration_seconds: banner.duration_seconds ?? '',
      audience: banner.audience || 'cliente',
      is_sponsored: !!banner.is_sponsored,
      sponsor_name: banner.sponsor_name || '',
      geo_cep: '',
      geo_city: banner.geo_city || '',
      geo_latitude: banner.geo_latitude ?? '',
      geo_longitude: banner.geo_longitude ?? '',
      geo_radius_km: banner.geo_radius_km ?? ''
    });
    setImagePreview(banner.image_url || '');
    setShowForm(true);
    setError('');
  };

  const handleDeleteConfirmed = async (banner) => {
    setConfirmDeleteId(null);
    try {
      setError('');
      const token = authService.getToken();

      const response = await fetch(`${API_URL}/api/banners/${banner.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      notify('Banner deletado com sucesso!', 'success');
      await loadBanners();
    } catch (error) {
      setError('Erro ao deletar banner: ' + mensagemDeErro(error, 'tente de novo.', 'sem conexão agora — tente quando o sinal voltar.'));
      notify('Erro ao deletar banner: ' + mensagemDeErro(error, 'tente de novo.', 'sem conexão agora — tente quando o sinal voltar.'), 'error');
    }
  };

  const handleToggleStatus = async (banner) => {
    try {
      setError('');
      const token = authService.getToken();

      const response = await fetch(`${API_URL}/api/banners/${banner.id}/toggle-status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      notify(`Banner ${banner.is_active ? 'desativado' : 'ativado'} com sucesso!`, 'success');
      await loadBanners();
    } catch (error) {
      setError('Erro ao alterar status: ' + mensagemDeErro(error, 'tente de novo.', 'sem conexão agora — tente quando o sinal voltar.'));
      notify('Erro ao alterar status: ' + mensagemDeErro(error, 'tente de novo.', 'sem conexão agora — tente quando o sinal voltar.'), 'error');
    }
  };

  // Itens da loja escolhida, pro seletor da oferta. Recarrega a cada troca de
  // loja e ZERA o item selecionado junto — senão a oferta ficaria apontando pro
  // X-Bacon de outro restaurante, e o backend recusaria sem o admin entender.
  useEffect(() => {
    if (!relampago.restaurant_id) { setItensDaLoja([]); return; }
    let vivo = true;
    (async () => {
      try {
        // Rota PÚBLICA, a mesma que o app do cliente usa pra desenhar o
        // cardápio. A /api/menu do parceiro exige token de RESTAURANTE — o
        // admin tomaria 403 e o seletor ficaria vazio sem dizer por quê.
        const r = await fetch(`${API_BASE_URL}/api/restaurants/${relampago.restaurant_id}/menu`);
        if (!r.ok) return;
        const j = await r.json();
        // ⚠️ Esta rota devolve os itens ANINHADOS por categoria:
        //   { categories: [ { name, items: [...] } ] }
        // Procurar `data`/`items` na raiz não acha nada e o seletor fica vazio
        // — sem erro, sem aviso, só uma lista que parece não ter itens. Foi
        // exatamente o que aconteceu na primeira vez que o Diego abriu a tela.
        const lista = Array.isArray(j)
          ? j
          : (j?.categories || []).flatMap((c) => c?.items || [])
            .concat(j?.data || [], j?.items || []);
        if (vivo) setItensDaLoja(lista.filter((i) => i?.id));
      } catch { /* seletor fica vazio; a oferta vira do pedido inteiro */ }
    })();
    return () => { vivo = false; };
  }, [relampago.restaurant_id]);

  /**
   * Dispara o push da oferta relâmpago.
   *
   * Pergunta o público na hora, e não no cadastro, porque a decisão muda com o
   * momento: no começo da campanha faz sentido avisar quem já é cliente da
   * loja; quando está acabando, vale abrir pra todo mundo.
   *
   * ⚠️ Push não tem desfazer. Por isso confirma antes, dizendo em texto simples
   * pra quem vai — e não com o nome interno do público.
   */
  const dispararPush = async (banner, rodada) => {
    const publico = window.prompt(
      'Pra quem enviar?\n\n' +
      '1 = Todos os clientes com notificação ligada (é o que traz gente nova)\n' +
      '2 = Só quem já pediu nesta loja (lista morna, converte mais)\n' +
      '3 = Só quem está no raio da loja (⚠️ hoje alcança pouca gente: só quem\n' +
      '    abriu o app depois de 12/09 tem posição guardada)\n\n' +
      'Digite 1, 2 ou 3:',
      '1',
    );
    if (publico === null) return;
    const mapa = { 1: 'todos', 2: 'ja_pediram', 3: 'no_raio' };
    const alvo = mapa[String(publico).trim()];
    if (!alvo) { notify('Opção inválida. Use 1, 2 ou 3.', 'warning'); return; }

    // QUANTOS AVISAR AGORA.
    //
    // É o controle de custo: se a oferta tem 10 lanches, avisar 50 pessoas faz
    // 40 receberem um convite e levarem "esta oferta acabou" na cara. Quem
    // sobrar continua elegível — apertar o botão de novo manda pro próximo
    // lote, porque o servidor só registra quem recebeu de verdade.
    const quantosTxt = window.prompt(
      'Avisar quantas pessoas AGORA?\n\n' +
      'Dica: use o número de ofertas que você tem. Se são 10 lanches, avise 10 —\n' +
      'depois é só apertar de novo pra mandar pro próximo lote.\n\n' +
      'Digite 1 pra testar em você mesmo. Vazio = todas de uma vez.',
      '10',
    );
    if (quantosTxt === null) return;
    const quantos = quantosTxt.trim() === '' ? 0 : Number(quantosTxt);
    if (!Number.isFinite(quantos) || quantos < 0) { notify('Número inválido.', 'warning'); return; }

    const comoChamam = { todos: 'todos os clientes', ja_pediram: 'quem já pediu nesta loja', no_raio: 'quem está no raio da loja' };
    const qual = rodada === 'ultima_chamada' ? 'ÚLTIMA CHAMADA' : 'aviso de abertura';
    if (!window.confirm(
      `Enviar ${qual} para ${quantos ? `até ${quantos} de ` : ''}${comoChamam[alvo]}?\n\n` +
      'Só recebe quem estiver com o app FECHADO — quem está com o app aberto já vê o banner.\n\n' +
      'Notificação não tem desfazer.'
    )) return;

    setDisparando(banner.id);
    try {
      const r = await fetch(`${API_URL}/api/coupons/relampago/${banner.id}/disparar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authService.getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ publico: alvo, rodada, so_app_fechado: true, quantos }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { notify(j?.error || 'Não foi possível enviar.', 'error'); return; }
      const d = j?.data || {};
      notify(
        d.enviados > 0
          ? `Enviado para ${d.enviados} cliente(s).`
            + (d.sobraram ? ` Sobraram ${d.sobraram} — aperte de novo pro próximo lote.` : '')
            + (d.tokens_limpos ? ` ${d.tokens_limpos} token(s) morto(s) limpo(s).` : '')
          : (d.aviso || 'Ninguém elegível agora.'),
        d.enviados > 0 ? 'success' : 'warning',
      );
    } catch (e) {
      notify(mensagemDeErro(e, 'Falha ao enviar a notificação'), 'error');
    } finally {
      setDisparando(null);
    }
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
    // Limpa a oferta junto. Sem isto, abrir o formulário de novo já viria com a
    // oferta LIGADA e a loja da vez anterior selecionada — e o admin criaria
    // uma segunda oferta sem perceber.
    setRelampago({
      ligado: false, restaurant_id: '', menu_item_id: '', discount_type: 'fixed',
      discount_value: '', reserva_minutos: '5', max_uses: '', min_order_value: '',
    });
    setEditingBanner(null);
    setShowForm(false);
    setError('');
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        <span className="ml-3 text-gray-500">Carregando banners...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-3xl font-bold">Gerenciar Banners</h1>
        <button
          onClick={() => {
            setEditingBanner(null);
            setFormData(getInitialFormData());
            setImagePreview('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            setShowForm(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors min-h-[44px]"
        >
          Novo Banner
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Erro: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto mx-4">
            <h2 className="text-xl font-bold mb-4">{editingBanner ? 'Editar Banner' : 'Novo Banner'}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Título</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  // required foi removido
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Subtítulo</label>
                <textarea value={formData.subtitle} onChange={(e) => setFormData({...formData, subtitle: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" rows="2" />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Imagem do Banner *</label>
                {imagePreview && (
                  <div className="mb-3 relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded border" />
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">×</button>
                  </div>
                )}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={uploading} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50">
                    {uploading ? 'Enviando...' : (imagePreview ? 'Trocar Imagem' : 'Selecionar Imagem')}
                  </button>
                </div>
                <input type="url" value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 mt-2 text-sm" placeholder="URL da imagem" readOnly={!!imagePreview} />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Link de Destino</label>
                <input type="text" value={formData.link_url} onChange={(e) => setFormData({...formData, link_url: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" placeholder="/recompensas ou https://..." />
              </div>

              {/* Onde o banner aparece (app-alvo) + patrocínio */}
              <div className="mb-4 border-t pt-4">
                <label className="block text-sm font-medium mb-2">Onde aparece <span className="text-gray-400 font-normal">(app)</span></label>
                <select
                  value={formData.audience}
                  onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cliente">App do Cliente (carrossel na home)</option>
                  <option value="parceiro">App do Parceiro (faixa no painel)</option>
                  <option value="entregador">App do Entregador (faixa no painel)</option>
                </select>
                <label className="flex items-center mt-3">
                  <input
                    type="checkbox"
                    checked={formData.is_sponsored}
                    onChange={(e) => setFormData({ ...formData, is_sponsored: e.target.checked })}
                    className="mr-2"
                  />
                  Patrocinado <span className="text-gray-400 text-xs ml-1">(mostra o selo “Patrocinado”)</span>
                </label>
                {formData.is_sponsored && (
                  <input
                    type="text"
                    value={formData.sponsor_name}
                    onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 mt-2 text-sm"
                    placeholder="Nome do anunciante (ex.: Embalagens Sul)"
                  />
                )}
              </div>

              {/* ── Alcance geográfico ────────────────────────────────────────
                  Vazio = banner nacional. Com CEP + raio, só aparece pra quem
                  está perto: um parceiro de Lages não é exibido em São Paulo
                  (nem é cobrado por essa exibição). */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alcance geográfico
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Deixe em branco para exibir no Brasil inteiro. Informe o CEP da cidade
                  do anunciante para mostrar só na região dele.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={formData.geo_cep}
                    onChange={handleGeoCepChange}
                    maxLength={9}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="CEP (00000-000)"
                  />
                  <input
                    type="text"
                    value={formData.geo_city}
                    readOnly
                    className="border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm text-gray-600"
                    placeholder="Cidade"
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.geo_radius_km}
                    onChange={(e) => setFormData({ ...formData, geo_radius_km: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="Raio em km (ex.: 50)"
                  />
                </div>
                {geoBuscando && <p className="text-xs text-gray-500 mt-1">Buscando CEP…</p>}
                {formData.geo_latitude ? (
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-green-700">
                      ✓ Alcance: {formData.geo_city || 'região definida'} · {formData.geo_radius_km || 50} km
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({
                        ...f, geo_cep: '', geo_city: '', geo_latitude: '', geo_longitude: '', geo_radius_km: ''
                      }))}
                      className="text-red-600 hover:underline"
                    >
                      Tornar nacional
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">🌎 Banner nacional (sem restrição de região)</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Posição do Texto</label>
                <select
                  value={formData.text_position}
                  onChange={(e ) => setFormData({ ...formData, text_position: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="center">Centro</option>
                  <option value="left">Esquerda</option>
                  <option value="right">Direita</option>
                </select>
              </div>

              {/* Agendamento (opcional) — permite alugar o espaço por um período */}
              <div className="mb-4 border-t pt-4">
                <label className="block text-sm font-medium mb-2">Programação <span className="text-gray-400 font-normal">(opcional — vira renda de espaço alugado)</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Início</label>
                    <input
                      type="datetime-local"
                      value={formData.starts_at}
                      onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fim</label>
                    <input
                      type="datetime-local"
                      value={formData.ends_at}
                      onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">Deixe em branco para exibir sem limite de tempo. Fora da janela, o banner some sozinho dos apps.</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Tempo de exposição <span className="text-gray-400 font-normal">(segundos na tela)</span></label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.duration_seconds}
                  onChange={(e) => setFormData({ ...formData, duration_seconds: e.target.value })}
                  placeholder="Padrão (ex.: 5)"
                  className="w-full sm:w-40 border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Quanto tempo este banner fica na tela antes de girar. Quem paga mais fica mais tempo (ex.: 30). Em branco = padrão.</p>
              </div>

              <div className="mb-6">
                {/* ─── OFERTA RELÂMPAGO ─────────────────────────────────── */}
                <div className="mt-4 rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
                  <label className="flex items-center font-semibold text-orange-900">
                    <input
                      type="checkbox"
                      checked={relampago.ligado}
                      disabled={Boolean(editingBanner?.tem_relampago)}
                      onChange={(e) => setRelampago({ ...relampago, ligado: e.target.checked })}
                      className="mr-2"
                    />
                    ⚡ Oferta Relâmpago
                  </label>
                  <p className="mt-1 text-xs text-orange-800">
                    {editingBanner?.tem_relampago
                      ? 'Este banner já tem uma oferta. Pra trocar, apague o banner e crie outro.'
                      : 'O cliente toca no banner, a oferta fica reservada pra ele por alguns minutos e a loja abre com o cupom já no carrinho. O desconto é absorvido pela Inksa, e não empilha com o Clube.'}
                  </p>

                  {relampago.ligado && !editingBanner?.tem_relampago && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Loja da oferta *</label>
                        <select
                          value={relampago.restaurant_id}
                          onChange={(e) => setRelampago({ ...relampago, restaurant_id: e.target.value, menu_item_id: '' })}
                          className="w-full rounded-md border-gray-300 text-sm"
                        >
                          <option value="">Escolha a loja…</option>
                          {lojas.map((l) => (
                            <option key={l.id} value={l.id}>{l.restaurant_name || l.trade_name || l.id}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Item da oferta <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <select
                          value={relampago.menu_item_id}
                          disabled={!relampago.restaurant_id}
                          onChange={(e) => setRelampago({
                            ...relampago,
                            menu_item_id: e.target.value,
                            // Com item, o número passa a ser PREÇO, não desconto.
                            discount_type: e.target.value ? 'fixed' : relampago.discount_type,
                          })}
                          className="w-full rounded-md border-gray-300 text-sm disabled:bg-gray-100"
                        >
                          <option value="">Sem item — desconto no pedido inteiro</option>
                          {itensDaLoja.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} — R$ {Number(i.price || 0).toFixed(2).replace('.', ',')}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          {relampago.menu_item_id
                            ? 'Com item escolhido, o valor abaixo é o PREÇO que esse item vai custar na oferta. O desconto vale só pra ele, e só uma unidade.'
                            : 'Sem item, o desconto vale sobre o pedido inteiro — inclusive se o cliente colocar só uma bebida no carrinho.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Desconto</label>
                          <select
                            value={relampago.discount_type}
                            disabled={Boolean(relampago.menu_item_id)}
                            onChange={(e) => setRelampago({ ...relampago, discount_type: e.target.value })}
                            className="w-full rounded-md border-gray-300 text-sm"
                          >
                            <option value="fixed">R$ fixo</option>
                            <option value="percentage">% do pedido</option>
                            <option value="free_delivery">Frete grátis</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            {relampago.menu_item_id
                              ? 'Preço da oferta R$'
                              : relampago.discount_type === 'percentage' ? 'Quanto %' : 'Quanto R$'}
                          </label>
                          <input
                            type="number" min="0" step="0.01"
                            disabled={relampago.discount_type === 'free_delivery'}
                            value={relampago.discount_value}
                            onChange={(e) => setRelampago({ ...relampago, discount_value: e.target.value })}
                            className="w-full rounded-md border-gray-300 text-sm disabled:bg-gray-100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Minutos pra usar</label>
                          <input
                            type="number" min="1" max="60"
                            value={relampago.reserva_minutos}
                            onChange={(e) => setRelampago({ ...relampago, reserva_minutos: e.target.value })}
                            className="w-full rounded-md border-gray-300 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Quantas (vazio = ∞)</label>
                          <input
                            type="number" min="1"
                            value={relampago.max_uses}
                            onChange={(e) => setRelampago({ ...relampago, max_uses: e.target.value })}
                            className="w-full rounded-md border-gray-300 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Pedido mín. R$</label>
                          <input
                            type="number" min="0" step="0.01"
                            value={relampago.min_order_value}
                            onChange={(e) => setRelampago({ ...relampago, min_order_value: e.target.value })}
                            className="w-full rounded-md border-gray-300 text-sm"
                          />
                        </div>
                      </div>

                      <p className="text-xs text-gray-500">
                        Cada cliente usa <strong>uma vez</strong>, e o relógio dele começa no toque —
                        deixar passar não dá outra chance. A oferta some junto com o banner:
                        preencha o <strong>Fim</strong> na Programação acima, senão ela não tem prazo.
                      </p>
                    </div>
                  )}
                </div>

                <label className="flex items-center"><input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} className="mr-2" />Banner ativo</label>
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={uploading || !formData.image_url} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
                  {editingBanner ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
        {banners.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum banner encontrado.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">App</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posição Texto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Programação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {banners.map((banner) => (
                <tr key={banner.id}>
                  <td className="px-6 py-4"><img src={banner.image_url} alt={banner.title || 'Banner'} className="w-16 h-10 object-cover rounded border" /></td>
                  <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{banner.title || <span className="text-gray-400 italic">Sem título</span>}</div></td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 capitalize">
                      {banner.audience === 'parceiro' ? 'Parceiro' : banner.audience === 'entregador' ? 'Entregador' : 'Cliente'}
                    </span>
                    {banner.is_sponsored && (
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-amber-600 font-semibold" title={banner.sponsor_name || ''}>
                        🏷️ Patrocinado
                      </div>
                    )}
                    {banner.tem_relampago && (
                      <div className="mt-2">
                        <div className="text-[10px] uppercase tracking-wide text-orange-600 font-bold">⚡ Relâmpago</div>
                        {/* Dois botões de propósito: a "última chamada" é uma
                            campanha SEPARADA, com chave própria — por isso ela
                            alcança quem já recebeu o primeiro aviso. Cada
                            pessoa recebe no máximo dois pushes por oferta. */}
                        <div className="mt-1 flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={disparando === banner.id}
                            onClick={() => dispararPush(banner, 'inicio')}
                            className="rounded bg-orange-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                          >
                            {disparando === banner.id ? 'Enviando…' : 'Avisar clientes'}
                          </button>
                          <button
                            type="button"
                            disabled={disparando === banner.id}
                            onClick={() => dispararPush(banner, 'ultima_chamada')}
                            className="rounded border border-orange-600 px-2 py-1 text-[11px] font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                          >
                            Última chamada
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm capitalize text-gray-700">{banner.text_position || 'Centro'}</span>
                  </td>
                  <td className="px-6 py-4">
                    {banner.starts_at || banner.ends_at ? (
                      <div className="text-xs text-gray-600 leading-tight">
                        <div>{fmtDateTime(banner.starts_at) ? `De ${fmtDateTime(banner.starts_at)}` : 'Desde já'}</div>
                        <div>{fmtDateTime(banner.ends_at) ? `Até ${fmtDateTime(banner.ends_at)}` : 'Sem fim'}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Sem limite</span>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      ⏱ {banner.duration_seconds ? `${banner.duration_seconds}s` : 'padrão'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const st = bannerStatus(banner);
                      return (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${st.cls}`}>
                          {st.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => handleEdit(banner)} className="text-indigo-600 hover:text-indigo-900 min-h-[44px] inline-flex items-center">Editar</button>
                      <button onClick={() => handleToggleStatus(banner)} className={`min-h-[44px] inline-flex items-center ${banner.is_active ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}>{banner.is_active ? 'Desativar' : 'Ativar'}</button>
                      {confirmDeleteId === banner.id ? (
                        <span className="flex items-center gap-1 text-xs">
                          <span className="text-gray-600">Confirmar?</span>
                          <button onClick={() => handleDeleteConfirmed(banner)} className="text-red-600 font-semibold hover:underline min-h-[44px] inline-flex items-center">Sim</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-gray-400 hover:underline min-h-[44px] inline-flex items-center">Não</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(banner.id)} className="text-red-600 hover:text-red-900 min-h-[44px] inline-flex items-center">Deletar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </div>
      </div>
    </div>
  );
};

export default BannerManagementPage;
