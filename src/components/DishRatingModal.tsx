import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem } from '../types';
import { Modal } from './Modal';
import { useAuth } from '../AuthContext';
import { useToast } from './ToastProvider';
import { handleFirestoreError, OperationType } from '../firestoreUtils';

interface DishRatingModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

/**
 * Feature 4 — "Avaliar Prato" modal.
 * 1–5 star rating + optional comment, saved to the `dishRatings` collection.
 * The card average updates live via the Firestore subscription.
 */
export const DishRatingModal: React.FC<DishRatingModalProps> = ({ item, onClose }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [userName, setUserName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset the form whenever a new dish is opened
  useEffect(() => {
    if (item) {
      setRating(5);
      setComment('');
      setUserName(user?.displayName || '');
      setError('');
    }
  }, [item, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!userName.trim()) {
      setError('Por favor, insira o seu nome.');
      return;
    }
    if (rating < 1) {
      setError('Selecione uma classificação de 1 a 5 estrelas.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, 'dishRatings'), {
        dishId: item.id,
        userName: userName.trim(),
        rating,
        comment: comment.trim(),
        date: serverTimestamp(),
        isHidden: false,
      });
      showToast('Avaliação enviada! Obrigado ⭐', 'success');
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'dishRatings');
      setError('Erro ao enviar a avaliação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={!!item} onClose={onClose} maxWidth="max-w-lg" showCloseButton={false}>
      <div className="p-8 sm:p-10 space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Avaliar Prato</h3>
            <p className="text-zinc-500 text-sm">{item?.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Star selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">A sua nota</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                  className="focus:outline-none transition-transform active:scale-90 hover:scale-110"
                >
                  <Star
                    size={34}
                    fill={star <= rating ? '#facc15' : 'none'}
                    className={star <= rating ? 'text-secondary' : 'text-zinc-300'}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="rating-name" className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              O seu nome *
            </label>
            <input
              id="rating-name"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Como gostaria de ser chamado?"
              className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="rating-comment" className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Comentário (opcional)
            </label>
            <textarea
              id="rating-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="O que achou deste prato?"
              className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-primary transition-all resize-none"
            />
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Star size={20} fill="currentColor" />
                Enviar Avaliação
              </>
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
};
