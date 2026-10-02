import React, { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { Modal } from '../Modal';
import { useSite } from '../../SiteContext';
import { useToast } from '../ToastProvider';
import { STORAGE_KEY } from './shared';

/**
 * WhatsApp notification modal — validates the Angolan phone number, builds a
 * pre-filled WhatsApp message and opens wa.me. Saves the submission in
 * localStorage to prevent duplicate submissions.
 * (Logic moved verbatim from the old CountdownSection — do not change.)
 */
export const NotificationModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { settings } = useSite();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; consent?: string }>({});
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Pre-fill from a previous submission (if any)
  useEffect(() => {
    if (!open) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setName(data.name || '');
        setPhone(data.phone || '');
        setConsent(true);
        setAlreadySubmitted(true);
      } else {
        setAlreadySubmitted(false);
      }
    } catch {
      // ignore corrupted storage
    }
    setErrors({});
  }, [open]);

  /** Angolan mobile numbers: 9 digits starting with 9 (e.g. 923 456 789). */
  const isValidAngolanPhone = (value: string) => /^9\d{8}$/.test(value.replace(/\D/g, ''));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { name?: string; phone?: string; consent?: string } = {};

    if (!name.trim()) nextErrors.name = 'Por favor, insira o seu nome.';
    const digits = phone.replace(/\D/g, '');
    if (!digits) nextErrors.phone = 'Por favor, insira o seu número do WhatsApp.';
    else if (!isValidAngolanPhone(digits)) nextErrors.phone = 'Número inválido. Use o formato 9XX XXX XXX (Angola).';
    if (!consent) nextErrors.consent = 'É necessário aceitar receber notificações pelo WhatsApp.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Build the pre-filled WhatsApp message
    const restaurantDigits = (settings?.whatsapp || '+244 923 456 789').replace(/\D/g, '') || '244923456789';
    const message = `Olá Polaris! 👋 Quero ser notificado quando as entregas estiverem disponíveis. Nome: ${name.trim()} | Número: +244${digits}`;
    const waUrl = `https://wa.me/${restaurantDigits}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Save locally to avoid duplicate submissions
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name.trim(), phone: digits, at: new Date().toISOString() }));
    } catch {
      // localStorage unavailable — flow continues
    }

    showToast(`Obrigado ${name.trim().split(' ')[0]}! Vais ser notificado assim que as entregas estiverem disponíveis. 🎉`, 'success', 5000);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="p-8 sm:p-10 space-y-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Fica a par do lançamento! 🔔</h3>
          <p className="text-zinc-500 text-sm">
            Deixa os teus dados e avisamos-te pelo WhatsApp assim que as entregas começarem.
          </p>
        </div>

        {alreadySubmitted && (
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-sky-700 text-sm font-medium">
            Já mostrou interesse antes — os seus dados foram pré-preenchidos. Pode confirmar novamente.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <label htmlFor="notify-name" className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Nome Completo *
            </label>
            <input
              id="notify-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="O seu nome"
              className={`w-full px-5 py-4 bg-zinc-50 border rounded-2xl focus:outline-none focus:border-primary transition-all ${errors.name ? 'border-red-400' : 'border-black/5'}`}
            />
            {errors.name && <p className="text-xs font-medium text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="notify-phone" className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Número do WhatsApp *
            </label>
            <div className={`flex items-stretch rounded-2xl border bg-zinc-50 overflow-hidden transition-all ${errors.phone ? 'border-red-400' : 'border-black/5 focus-within:border-primary'}`}>
              <span className="flex items-center gap-1.5 px-4 bg-zinc-100 text-sm font-bold text-zinc-600 border-r border-black/5">
                🇦🇴 +244
              </span>
              <input
                id="notify-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9XX XXX XXX"
                className="flex-grow px-4 py-4 bg-transparent focus:outline-none"
              />
            </div>
            {errors.phone && <p className="text-xs font-medium text-red-500">{errors.phone}</p>}
          </div>

          <div className="space-y-1">
            <label className="flex items-start space-x-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-black/10 text-primary focus:ring-primary"
              />
              <span className="text-sm text-zinc-600 font-medium">
                Aceito receber notificações pelo WhatsApp *
              </span>
            </label>
            {errors.consent && <p className="text-xs font-medium text-red-500 ml-8">{errors.consent}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
          >
            <BellRing size={22} />
            Notifica-me pelo WhatsApp
          </button>
        </form>
      </div>
    </Modal>
  );
};
