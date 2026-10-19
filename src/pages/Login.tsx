import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ApiError, authApi } from '../lib/api';
import { useAuth } from '../AuthContext';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/* Requisitos visíveis e corretos para o registo — o servidor (better-auth)
 * continua a validar de verdade; isto é apenas uma caixa de ajuda honesta. */
const passwordRules = (password: string) => [
  { label: '10+ caracteres', ok: password.length >= 10 },
  { label: 'Uma letra maiúscula', ok: /[A-ZÂÁÉÊÍÓÔÕÚÇ]/.test(password) },
  { label: 'Um dígito', ok: /[0-9]/.test(password) },
];
const passwordScore = (password: string) => passwordRules(password).filter(r => r.ok).length;
const strengthLabel = ['', 'Fraca', 'Razoável', 'Forte', 'Forte'];

export const Login: React.FC = () => {
  /** `?token=…` da ligação de recuperação — salta direto para a nova palavra-passe. */
  const urlToken = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', []);

  const [isLogin, setIsLogin] = useState(() => !(new URLSearchParams(window.location.search).get('mode') === 'signup'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** Fluxo de recuperação: 0 inicio sessão/conta · 1 pedir ligação · 2 ligação enviada · 3 definir nova. */
  const [resetStep, setResetStep] = useState(urlToken ? 3 : 0);
  const [resetToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState('');
  const [newConfirm, setNewConfirm] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { user, refresh } = useAuth();

  // Redireciona para o sítio de onde veio assim que existe sessão (mas não
  // abandona o formulário de redefinição a meio).
  React.useEffect(() => {
    if (user && resetStep === 0) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location, resetStep]);

  const rules = useMemo(() => passwordRules(isLogin ? '' : password), [isLogin, password]);
  const score = useMemo(() => passwordScore(password), [password]);
  const rulesOk = rules.every(r => r.ok);
  const newRules = useMemo(() => passwordRules(resetStep === 3 ? newPassword : ''), [resetStep, newPassword]);
  const newScoreValue = useMemo(() => passwordScore(resetStep === 3 ? newPassword : ''), [resetStep, newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isValidEmail(email)) {
      setError('O formato do email não é válido.');
      return;
    }
    if (!isLogin) {
      if (!name.trim()) { setError('Por favor, insira o seu nome.'); return; }
      if (password !== confirmPassword) {
        setError('A confirmação da palavra-passe não coincide.');
        return;
      }
      if (!rulesOk) {
        setError('A palavra-passe ainda não cumpre os requisitos visíveis abaixo.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await authApi.signIn(email.trim(), password);
        setSuccess('Login realizado com sucesso!');
      } else {
        await authApi.signUp(name.trim(), email.trim(), password);
        setSuccess('Conta criada com sucesso!');
      }
      await refresh();
    } catch (err) {
      const apiErr = err as ApiError;
      const code = apiErr.code || '';
      let message = apiErr.message || 'Ocorreu um erro ao processar o seu pedido.';

      if (code === 'INVALID_EMAIL_OR_PASSWORD' || code === 'USER_NOT_FOUND') {
        message = 'Email ou palavra-passe incorretos.';
      } else if (code === 'USER_ALREADY_EXISTS' || code === 'EMAIL_ALREADY_EXISTS') {
        message = 'Este email já está em uso. Se já tem uma conta, tente iniciar sessão.';
      } else if (code === 'PASSWORD_TOO_SHORT') {
        message = 'A palavra-passe deve ter pelo menos 8 caracteres.';
      } else if (code === 'INVALID_EMAIL') {
        message = 'O formato do email não é válido.';
      } else if (code === 'ACCOUNT_LOCKED' || apiErr.status === 429) {
        message = apiErr.message || 'O acesso está temporariamente bloqueado (3 tentativas falhadas). Tente mais tarde ou recupere a sua palavra-passe.';
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /** Pede a ligação de recuperação — mensagem neutra, sem revelar se existe conta. */
  const handleForgotPassword = async () => {
    if (!email || !isValidEmail(email)) {
      setError('Por favor, insira um email válido primeiro.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authApi.requestPasswordReset(email.trim());
      setResetStep(2);
      setResetMessage(
        'Se existir uma conta com este email, acabou de seguir para ele uma ligação de recuperação. Verifique também a pasta de spam — o link expira e só pode ser usado uma vez.',
      );
    } catch (err) {
      console.warn('[auth] reset request:', (err as ApiError)?.code || (err as ApiError)?.status);
      setResetMessage('Não foi possível iniciar a recuperação agora. Tente de novo daqui a pouco ou fale com a equipa via WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  /** Com o token do link (query ?token=), define a nova palavra-passe. */
  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== newConfirm) {
      setError('A confirmação não coincide com a nova palavra-passe.');
      return;
    }
    if (!newRules.every(r => r.ok)) {
      setError('A nova palavra-passe ainda não cumpre os requisitos visíveis.');
      return;
    }
    if (!resetToken) {
      setError('Link de recuperação inválido — peça um novo.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(resetToken, newPassword);
      setSuccess('Palavra-passe redefinida com sucesso! Inicie sessão com a nova.');
      setResetStep(0);
      setNewPassword('');
      setNewConfirm('');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(
        apiErr.status === 401
          ? 'Este link de recuperação já não é válido (expirou ou já foi usado). Peça outro em «Esqueceu-se?».'
          : 'Não foi possível redefinir a palavra-passe.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-zinc-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-black/5 border border-black/5 overflow-hidden"
      >
        <div className="p-8 sm:p-12 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-zinc-900">
              {resetStep === 3 ? 'Nova palavra-passe'
                : resetStep === 2 ? 'Recuperação enviada'
                : isLogin ? 'Bem-vindo de volta' : 'Criar nova conta'}
            </h1>
            <p className="text-zinc-500">
              {resetStep === 0
                ? (isLogin ? 'Inicie sessão para gerir os seus pedidos.' : 'Registe-se para uma experiência personalizada.')
                : resetStep === 3 ? 'Defina a sua nova palavra-passe.' : 'Recuperação de acesso — verifique o seu email.'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-start space-x-3 text-sm"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                key="ok"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-2xl flex items-start space-x-3 text-sm"
              >
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {resetStep <= 1 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <label htmlFor="signup-name" className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                    <input
                      id="signup-name" type="text" required autoComplete="name"
                      value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome"
                      className="w-full pl-12 pr-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="auth-email" className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input
                    id="auth-email" type="email" required autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemplo@email.com"
                    className="w-full pl-12 pr-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label htmlFor="auth-password" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Palavra-passe</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setResetStep(1)}
                      className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
                    >
                      Esqueceu-se?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {!isLogin && password.length > 0 && (
                  <div className="space-y-2.5 px-1">
                    <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${score <= 1 ? 'bg-red-400' : score === 2 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                        style={{ width: `${(score / 3) * 100}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Força: {strengthLabel[score]}</p>
                    <ul className="space-y-1.5">
                      {rules.map(r => (
                        <li key={r.label} className={`flex items-center gap-2 text-[11px] font-semibold ${r.ok ? 'text-emerald-600' : 'text-zinc-400'}`}>
                          {r.ok ? <CheckCircle2 size={12} /> : <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 inline-block" />}
                          {r.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <label htmlFor="auth-confirm" className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Confirmar palavra-passe</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                    <input
                      id="auth-confirm"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••"
                      className={`w-full pl-12 pr-5 py-4 bg-zinc-50 border rounded-2xl focus:outline-none transition-all ${
                        confirmPassword && confirmPassword !== password
                          ? 'border-red-200 focus:border-red-400'
                          : 'border-black/5 focus:border-primary'
                      }`}
                    />
                    {confirmPassword && confirmPassword !== password && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500"><AlertCircle size={18} /></span>
                    )}
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-[11px] text-red-500 font-semibold">As duas palavras-passe não coincidem.</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center space-x-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{loading ? 'A processar...' : (isLogin ? 'Entrar' : 'Criar Conta')}</span>
                {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          )}

          {resetStep >= 2 && resetStep !== 3 && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 leading-relaxed">{resetMessage}</p>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="w-full py-4 bg-zinc-100 text-zinc-800 font-bold text-sm rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-60"
              >
                Não recebi nada — pedir de novo
              </button>
              <button
                type="button"
                onClick={() => { setResetStep(0); setError(null); }}
                className="w-full text-sm font-bold text-primary hover:underline"
              >
                Voltar ao início de sessão
              </button>
            </div>
          )}

          {resetStep === 3 && (
            <form onSubmit={handleNewPassword} className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 border border-black/5 rounded-xl px-4 py-3">
                <KeyRound size={14} className="text-primary shrink-0" />
                <span>Link de recuperação detetado. O token expira e é de uso único.</span>
              </div>
              <div className="space-y-2">
                <label htmlFor="new-password" className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Nova palavra-passe</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full pl-12 pr-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                {newPassword.length > 0 && (
                  <div className="space-y-2 px-1">
                    <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${newScoreValue <= 1 ? 'bg-red-400' : newScoreValue === 2 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                        style={{ width: `${(newScoreValue / 3) * 100}%` }}
                      />
                    </div>
                    <ul className="space-y-1.5">
                      {newRules.map(r => (
                        <li key={r.label} className={`flex items-center gap-2 text-[11px] font-semibold ${r.ok ? 'text-emerald-600' : 'text-zinc-400'}`}>
                          {r.ok ? <CheckCircle2 size={12} /> : <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 inline-block" />}
                          {r.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="new-confirm" className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Confirmar nova palavra-passe</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input
                    id="new-confirm"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={newConfirm}
                    onChange={(e) => setNewConfirm(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full pl-12 pr-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{loading ? 'A processar...' : 'Definir nova palavra-passe'}</span>
              </button>
            </form>
          )}

          {resetStep === 0 && (
            <>
              <div className="text-center pt-2">
                <button
                  onClick={() => { setIsLogin(!isLogin); setError(null); setSuccess(null); }}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  {isLogin ? 'Não tem uma conta? Registe-se' : 'Já tem uma conta? Inicie sessão'}
                </button>
              </div>
              {isLogin && (
                <p className="text-[11px] text-zinc-400 text-center leading-relaxed flex items-start gap-2">
                  <ShieldCheck size={14} className="shrink-0 mt-0.5" />
                  3 tentativas falhadas bloqueiam o acesso temporariamente em todos os dispositivos. Use «Esqueceu-se?» para desbloquear mais cedo.
                </p>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
