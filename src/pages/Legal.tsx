import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ScrollText, Truck, AlertTriangle } from 'lucide-react';
import { useSite } from '../SiteContext';

/**
 * Documentos legais. Pontos marcados com [A CONFIRMAR] exigem confirmação da
 * Polaris (e, onde indicado, validação jurídica) antes da publicação
 * definitiva — nada disto afirma conformidade certificada.
 */
const POLARIS_NAME = 'Polaris Fast-Food';

const Promo: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-2xl p-4 leading-relaxed">
    <strong className="font-black flex items-center gap-2 mb-1"><AlertTriangle size={15} /> {title}</strong>
    {text}
  </p>
);

type Doc = { key: string; title: string; sections: { title: string; paras: string[] }[] };

const DOCS: Record<string, Doc> = {
  privacidade: {
    key: 'politica-privacidade',
    title: 'Política de Privacidade',
    sections: [
      {
        title: '1. Quem somos e porque existe esta política',
        paras: [
          `${POLARIS_NAME} opera um serviço de encomenda online de fast-food em Huambo, Angola. Esta política explica que dados pessoais tratamos, porque os tratamos e quais são os seus direitos.`,
          'Aplica-se às visitas ao site e às encomendas feitas por clientes com conta ou como visitantes.',
        ],
      },
      {
        title: '2. Que dados recolhemos e porquê',
        paras: [
          'Conta: nome, email, palavra-passe (armazenada apenas como hash criptográfico por parte do fornecedor de autenticação) e, se os preencher, telefone, endereço e bairro habituais no seu perfil.',
          'Encomendas: artigos pedidos, quantidades, subtotal calculado no servidor, modalidade (entrega ou levantamento), bairro, endereço de entrega, telefone de contacto, notas e estado do pagamento.',
          'Comprovativos de transferência: o ficheiro que anexa (imagem ou PDF) fica guardado de forma privada e só é visível para a equipa que valida o pagamento e para si, através de acesso autorizado. Nunca é publicado num endereço público.',
          'Avaliações: nome indicado, classificação e comentário — publicados apenas após moderação.',
        ],
      },
      {
        title: '3. Finalidades e bases do tratamento',
        paras: [
          'Processamos os dados para criar e entregar encomendas, validar pagamentos, responder a pedidos e melhorar o serviço. O tratamento decorre da execução do contrato de encomenda; os dados do perfil refletem a sua vontade de os preencher e servem para pré-preencher o checkout.',
          `Base legal referencial: Lei n.º 22/11, de 30 de junho (Lei de Protecção de Dados Pessoais de Angola). [A CONFIRMAR juridicamente — a aplicação concreta depende da operação da empresa.]`,
        ],
      },
      {
        title: '4. Serviços externos',
        paras: [
          'Aplicação hospedada em Vercel; base de dados PostgreSQL em Neon. Ambos processam dados técnicos por conta do site.',
          'WhatsApp (Meta): se escolher falar connosco pelo WhatsApp, o que escreve e os números de contacto vão para essa plataforma nos termos dela.',
          'O pagamento eletrónico, quando ativado, partilhará os dados mínimos com o fornecedor oficial; hoje permanece desativado.',
        ],
      },
      {
        title: '5. Conservação',
        paras: [
          'Os dados de conta mantêm-se enquanto a conta existir. As encomendas e comprovativos guardam-se pelo período razoável de gestão comercial e fiscal. [A CONFIRMAR com a contabilidade da Polaris — prazos exatos dependem das obrigações fiscais angolanas.]',
        ],
      },
      {
        title: '6. Segurança',
        paras: [
          'Sessões em cookies httpOnly; autorização no servidor; comprovativos armazenados de forma privada; o site nunca recebe nem guarda os dados bancários do cliente (só os dados da conta da Polaris para receber transferências).',
          'Nenhum sistema é 100% seguro, mas limitamos o acesso interno e monitorizamos as rotas administrativas. Não enviamos palavras-passe por email nem ligações de recuperação usáveis por terceiros que conhecem apenas o seu email.',
        ],
      },
      {
        title: '7. Direitos e contactos',
        paras: [
          'Pode pedir acesso às suas dados, correção, eliminação da conta ou esclarecimento em qualquer momento.',
          'Canal: os números de WhatsApp e contacto publicados nesta página. [A CONFIRMAR que número institucional deve tratar pedidos de privacidade — sem designação de encarregado nesta fase.]',
        ],
      },
    ],
  },
  termos: {
    key: 'termos',
    title: 'Termos e Condições',
    sections: [
      {
        title: '1. O que é este site',
        paras: [
          `${POLARIS_NAME} expõe o seu menu e permite encomendar online para entrega no Huambo ou levantamento na loja (perto da estação PCH).`,
        ],
      },
      {
        title: '2. Encomendas, produtos e preços',
        paras: [
          'Os preços, quantidades, extras e taxas são recalculados no servidor a partir do menu oficial; o site não aceita valores manipulados no navegador. O menu pode mudar (falta de stock, fim de promoção) — artigos esgotados são recusados com aviso.',
          'Imagens são ilustrativas. Se chegar algo diferente do pedido, fale connosco pelo WhatsApp e resolvemos.',
        ],
      },
      {
        title: '3. Conta e utilização adequada',
        paras: [
          'A conta é pessoal e não pode ser usada para encomendar em nome de terceiros sem o seu consentimento. Tentativas repetidas de acesso com credenciais erradas bloqueiam temporariamente o acesso (3 falhas seguidas).',
        ],
      },
      {
        title: '4. Responsabilidade',
        paras: [
          `Limitamo-nos ao que razoavelmente está ao alcance do serviço: encomendar, preparar e entregar. Nada aqui exclui direitos que a lei confere aos consumidores. [A CONFIRMAR juridicamente — redação destina-se a ser justa em qualquer caso, perto do previsto para comércio eletrónico em Angola.]`,
        ],
      },
      {
        title: '5. Contato',
        paras: [
          'Telefone e WhatsApp publicados no site. Horário base: 11:00–23:00; o salão pode ajustar ocasionalmente.',
        ],
      },
    ],
  },
  encomendas: {
    key: 'politica-encomendas',
    title: 'Encomendas, Pagamentos, Entregas e Cancelamentos',
    sections: [
      {
        title: '1. Como funciona uma encomenda',
        paras: [
          'Escolhe a modalidade (entrega ao domicílio ou levantamento), o bairro no caso de entrega, os artigos e a modalidade de pagamento. Ao finalizar, o servidor valida tudo e dá-lhe uma referência (ex.: POL-XXXXXX) que serve para acompanhar a encomenda.',
          'A encomenda só é considerada paga e autorizada a preparação definitiva depois de o pagamento ser confirmado — ou pelo nosso painel de gestão (transferência) ou pela plataforma de pagamento eletrónico quando ativada. Um email ou mensagem sem saldo confirmado não constitui pagamento.',
        ],
      },
      {
        title: '2. Pagamento por transferência bancária',
        paras: [
          'Publicamos a conta bancária oficial da Polaris e o valor exato. Transfira e anexe o comprovativo na própria encomenda (imagem ou PDF, até 4 MB). O comprovativo é analisado pela equipa; a encomenda fica «suspensa» até essa análise e pode ser rejeitada com justificação (ex.: valor diferente, compra duplicada).',
          'Transferências sem comprovativo anexado não acionam a preparação — alertamo-lo por WhatsApp se não chegarmos ao comprovativo.',
        ],
      },
      {
        title: '3. Entrega ao domicílio',
        paras: [
          'Entregamos nos bairros listados (área de cobertura de Huambo). A taxa depende do bairro e é mostrada antes de finalizar. Se o seu bairro não aparecer, fale connosco por WhatsApp — quando conseguirmos, adicionamos. O tempo estimado é indicativo e depende do trânsito e do clima.',
        ],
      },
      {
        title: '4. Levantamento na loja',
        paras: [
          'Levantamento perto da estação PCH, Huambo. Sem taxa de entrega. Quando a encomenda ficar pronta avisamos pelo WhatsApp e o próprio estado fica visível no site. [A CONFIRMAR com a Polaris o horário contínuo de levantamento e a janela típica de disponibilidade.]',
        ],
      },
      {
        title: '5. Cancelamentos e reclamações',
        paras: [
          'Pode cancelar no site enquanto a encomenda estiver pendente de pagamento ou comprovativo submetido. Depois do pagamento confirmado e da preparação iniciada, fale connosco via WhatsApp e esforçamo-nos por resolver o caso antes de sair para entrega.',
          'Reclamar é simples: mande mensagem com a referência da encomenda; respondemos no mesmo dia útil.',
        ],
      },
    ],
  },
};

const LEGAL_META: Record<string, { TitleIcon: React.ComponentType<{ size?: number; className?: string }>; subtitle: string }> = {
  privacidade: { TitleIcon: ScrollText, subtitle: 'Como tratamos os seus dados — de forma transparente e mínima.' },
  termos: { TitleIcon: FileText, subtitle: 'Regras de utilização do site e das encomendas.' },
  encomendas: { TitleIcon: Truck, subtitle: 'Modalidades, pagamentos, entregas, cancelamentos.' },
};

export const LegalPage: React.FC<{ doc: string }> = ({ doc }) => {
  const { settings } = useSite();
  const meta = DOCS[doc];
  const { TitleIcon, subtitle } = LEGAL_META[doc];

  useEffect(() => { window.scrollTo(0, 0); }, [doc]);

  if (!meta) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <header className="space-y-3 mb-10">
        <div className="p-3.5 w-fit rounded-2xl bg-primary/10 text-primary"><TitleIcon size={24} /></div>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900">{meta.title}</h1>
        <p className="text-zinc-500">{subtitle}</p>
      </header>

      <div className="space-y-8">
        {meta.sections.map(section => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-lg font-black text-zinc-900">{section.title}</h2>
            <div className="space-y-3">
              {section.paras.map((p, idx) => (
                <p key={idx} className="text-sm text-zinc-600 leading-relaxed">{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-black/5 space-y-2 text-xs text-zinc-400">
        <p>
          Última atualização: {new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}. Contacto
          {settings?.email ? ` · ${settings.email}` : ''}{settings?.phone ? ` · ${settings.phone}` : ''}.
        </p>
        <p>Este texto é informativo e será ajustado antes da publicação final com a confirmação da direção da Polaris e validação jurídica onde marcado.</p>
        <div className="flex flex-wrap gap-4 pt-2">
          <Link to="/politica-privacidade" className="font-bold text-primary hover:underline">Privacidade</Link>
          <Link to="/termos" className="font-bold text-primary hover:underline">Termos</Link>
          <Link to="/politica-encomendas" className="font-bold text-primary hover:underline">Encomendas e pagamentos</Link>
        </div>
      </div>
    </div>
  );
};
