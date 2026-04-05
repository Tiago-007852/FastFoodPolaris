import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, Send, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useSite } from '../SiteContext';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../firestoreUtils';

export const ReviewsSection: React.FC = () => {
  const { reviews } = useSite();
  const approvedReviews = reviews.filter(r => r.isApproved);
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [userName, setUserName] = useState(user?.displayName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [visibleCount, setVisibleCount] = useState(3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !userName.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      await addDoc(collection(db, 'reviews'), {
        userName,
        comment,
        rating,
        date: serverTimestamp(),
        userId: user?.uid || null,
        isApproved: false // Set to false for moderation
      });
      
      setSubmitStatus('success');
      setComment('');
      setRating(5);
      setTimeout(() => {
        setIsFormOpen(false);
        setSubmitStatus('idle');
      }, 3000);
    } catch (error) {
      console.error("Error submitting review:", error);
      setSubmitStatus('error');
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showMore = () => {
    setVisibleCount(prev => prev + 3);
  };

  return (
    <section className="py-24 bg-white" id="reviews">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Feedback</h2>
            <h3 className="text-4xl font-black tracking-tight text-zinc-900">O Que Dizem os Nossos Clientes</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center space-x-2 bg-secondary/10 px-6 py-3 rounded-2xl border border-secondary/20">
              <div className="flex text-secondary">
                {[...Array(5)].map((_, i) => <Star key={i} size={20} fill="currentColor" />)}
              </div>
              <span className="font-black text-zinc-900">4.9/5.0</span>
            </div>
            
            <button
              onClick={() => setIsFormOpen(true)}
              className="px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-hover transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <MessageSquare size={18} />
              Deixar Avaliação
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <AnimatePresence mode="popLayout">
            {approvedReviews.slice(0, visibleCount).map((review, idx) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx % 3 * 0.1 }}
                className="bg-zinc-50 p-8 rounded-3xl border border-black/5 relative flex flex-col h-full"
              >
                <div className="flex text-secondary mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={16} 
                      fill={i < review.rating ? "currentColor" : "none"} 
                      className={i < review.rating ? "text-secondary" : "text-zinc-300"}
                    />
                  ))}
                </div>
                <p className="text-zinc-600 italic mb-8 leading-relaxed flex-grow">"{review.comment}"</p>
                <div className="flex items-center space-x-4 mt-auto">
                  <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-hover font-bold text-lg uppercase">
                    {review.userName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900">{review.userName}</h4>
                    <p className="text-zinc-400 text-[10px] uppercase tracking-widest font-bold">Cliente Verificado</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {visibleCount < approvedReviews.length && (
          <div className="flex justify-center">
            <button
              onClick={() => setVisibleCount(prev => prev + 3)}
              className="px-8 py-3 border-2 border-zinc-200 text-zinc-600 rounded-full font-bold hover:bg-zinc-50 transition-all"
            >
              Ver Mais Avaliações
            </button>
          </div>
        )}

        {/* Modal Form */}
        <AnimatePresence>
          {isFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFormOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 sm:p-12">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-3xl font-black text-zinc-900 tracking-tight">Sua Avaliação</h3>
                    <button 
                      onClick={() => setIsFormOpen(false)}
                      className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                    >
                      <X size={24} className="text-zinc-400" />
                    </button>
                  </div>

                  {submitStatus === 'success' ? (
                    <div className="py-12 text-center space-y-4">
                      <div className="flex justify-center">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                          <CheckCircle2 size={40} />
                        </div>
                      </div>
                      <h4 className="text-2xl font-bold text-zinc-900">Obrigado pelo feedback!</h4>
                      <p className="text-zinc-500">Sua avaliação foi enviada com sucesso.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Sua Nota</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              className="focus:outline-none transition-transform active:scale-90"
                            >
                              <Star
                                size={32}
                                fill={star <= rating ? "#F59E0B" : "none"}
                                className={star <= rating ? "text-amber-500" : "text-zinc-200"}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Seu Nome</label>
                        <input
                          type="text"
                          required
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          placeholder="Como gostaria de ser chamado?"
                          className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Seu Comentário</label>
                        <textarea
                          required
                          rows={4}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Conte-nos sobre a sua experiência..."
                          className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                        />
                      </div>

                      {submitStatus === 'error' && (
                        <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-xl">
                          <AlertCircle size={18} />
                          <p className="text-sm font-medium">Erro ao enviar. Tente novamente.</p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Send size={20} />
                            Enviar Avaliação
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
