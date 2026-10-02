import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ApiError, authApi } from '../lib/api';
import { useAuth } from '../AuthContext';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refresh } = useAuth();

  // Redirect as soon as a session exists
  React.useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isLogin) {
        await authApi.signIn(email, password);
        setSuccess('Login realizado com sucesso!');
      } else {
        if (!name) throw new Error('Por favor, insira o seu nome.');
        await authApi.signUp(name, email, password);
        setSuccess('Conta criada com sucesso!');
      }
      await refresh();
    } catch (err) {
      const apiErr = err as ApiError;
      // Don't log expected auth errors as "errors" to avoid cluttering the console
      if (apiErr.status >= 400 && apiErr.status < 500) {
        console.warn('Auth feedback:', apiErr.code || apiErr.message);
      } else {
        console.error('Auth error:', err);
      }

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
      } else if (apiErr.status === 429) {
        message = 'Demasiadas tentativas. Por favor, tente mais tarde ou recupere a sua palavra-passe.';
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, insira o seu email primeiro.');
      return;
    }
    
    setError(null);
    setLoading(true);
    try {
      await authApi.requestPasswordReset(email);
      setResetEmailSent(true);
      setSuccess('Email de recuperação enviado! Verifique a sua caixa de entrada.');
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Não foi possível enviar o email de recuperação. Verifique se o email está correto.');
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
              {isLogin ? 'Bem-vindo de volta' : 'Criar nova conta'}
            </h1>
            <p className="text-zinc-500">
              {isLogin 
                ? 'Inicie sessão para gerir os seus pedidos.' 
                : 'Registe-se para uma experiência personalizada.'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center space-x-3 text-sm"
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-2xl flex items-center space-x-3 text-sm"
              >
                <CheckCircle2 size={18} />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full pl-12 pr-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full pl-12 pr-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Palavra-passe</label>
                {isLogin && (
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
                  >
                    Esqueceu-se?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center space-x-3 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'A processar...' : (isLogin ? 'Entrar' : 'Criar Conta')}</span>
              {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="text-center pt-4">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-bold text-primary hover:underline"
            >
              {isLogin ? 'Não tem uma conta? Registe-se' : 'Já tem uma conta? Inicie sessão'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
