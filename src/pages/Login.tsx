import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Chrome } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  loginWithEmail, 
  registerWithEmail, 
  updateUserName, 
  loginWithGoogle 
} from '../firebase';
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
  const { user } = useAuth();

  // Redirect if already logged in (and not anonymous)
  React.useEffect(() => {
    if (user && !user.isAnonymous) {
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
        await loginWithEmail(email, password);
        setSuccess('Login realizado com sucesso!');
      } else {
        if (!name) throw new Error('Por favor, insira o seu nome.');
        const userCredential = await registerWithEmail(email, password);
        await updateUserName(userCredential.user, name);
        setSuccess('Conta criada com sucesso!');
      }
    } catch (err: any) {
      // Don't log expected auth errors as "errors" to avoid cluttering the console
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential', 'auth/email-already-in-use', 'auth/weak-password', 'auth/invalid-email'].includes(err.code)) {
        console.warn('Auth feedback:', err.code);
      } else {
        console.error('Auth error:', err);
      }

      let message = 'Ocorreu um erro ao processar o seu pedido.';
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Email ou palavra-passe incorretos.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Este email já está em uso. Se já tem uma conta, tente iniciar sessão.';
      } else if (err.code === 'auth/weak-password') {
        message = 'A palavra-passe deve ter pelo menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'O formato do email não é válido.';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'O login com email e palavra-passe não está ativado no Firebase Console.';
      } else if (err.code === 'auth/user-disabled') {
        message = 'Esta conta foi desativada.';
      } else if (err.code === 'auth/too-many-requests') {
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
      const { resetPassword } = await import('../firebase');
      await resetPassword(email);
      setResetEmailSent(true);
      setSuccess('Email de recuperação enviado! Verifique a sua caixa de entrada.');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError('Não foi possível enviar o email de recuperação. Verifique se o email está correto.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      setSuccess('Login com Google realizado com sucesso!');
    } catch (err: any) {
      console.error('Google Auth error:', err);
      
      let message = 'Erro ao entrar com o Google.';
      
      if (err.code === 'auth/popup-blocked') {
        message = 'O popup foi bloqueado pelo seu navegador. Por favor, permita popups para este site.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        message = 'O login foi cancelado.';
      } else if (err.message?.includes('403') || err.code === 'auth/internal-error') {
        message = 'Erro 403: O domínio desta aplicação ainda não está totalmente autorizado no Google Cloud Console. Por favor, tente novamente em alguns minutos ou use o login por email.';
      }
      
      setError(message);
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

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
              <span className="bg-white px-4 text-zinc-400">Ou continue com</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 bg-white border border-black/5 rounded-2xl font-bold text-zinc-900 hover:bg-zinc-50 transition-all flex items-center justify-center space-x-3 shadow-sm disabled:opacity-50"
          >
            <Chrome size={20} className="text-primary" />
            <span>Google</span>
          </button>

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
