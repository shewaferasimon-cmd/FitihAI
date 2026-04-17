import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Lock, ChevronRight, Scale, Loader2, AlertCircle } from 'lucide-react';
import { setupRecaptcha, sendOTP, syncUserProfile, auth, clearRecaptcha } from '../services/firebase';

interface AuthModalProps {
  onSuccess: () => void;
}

export default function AuthModal({ onSuccess }: AuthModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [address, setAddress] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  useEffect(() => {
    // Hidden div for ReCAPTCHA
    setupRecaptcha('recaptcha-container');

    return () => {
      clearRecaptcha();
    };
  }, []);

  const handleSendOTP = async () => {
    if (!phoneNumber) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await sendOTP(phoneNumber, (window as any).recaptchaVerifier);
      setConfirmationResult(result);
      setStep('otp');
    } catch (err: any) {
      setError(mapErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || !confirmationResult) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await confirmationResult.confirm(otp);
      if (result.user) {
        // If signing up, go to details. If signing in, just sync.
        if (mode === 'signup') {
          setStep('details');
        } else {
          await syncUserProfile(result.user);
          onSuccess();
        }
      }
    } catch (err: any) {
      setError('ትክክለኛ ያልሆነ ኮድ። እባክዎን እንደገና ይሞክሩ።');
    } finally {
      setIsLoading(false);
    }
  };

  const mapErrorMessage = (err: any) => {
    if (err.message?.includes('billing-not-enabled')) {
      return (
        <div className="space-y-2">
          <p>እውነተኛ SMS ለመላክ የFirebase Billing (Blaze Plan) ያስፈልጋል።</p>
          <p className="text-primary">ለሙከራ ያህል እነዚህን ቁጥሮች ይጠቀሙ፦</p>
          <ul className="text-[10px] space-y-1 bg-white/5 p-2 rounded-lg">
            <li>• Admin: +251900000000 (PIN: 123456)</li>
            <li>• Premium: +251911111111 (PIN: 123456)</li>
            <li>• Free: +251922222222 (PIN: 123456)</li>
          </ul>
        </div>
      );
    }
    return err.message || 'ስህተት ተከስቷል። እባክዎን ቁጥርዎን ያረጋግጡ።';
  };

  const handleSaveDetails = async () => {
    if (!displayName || !address) return;
    setIsLoading(true);
    try {
      if (auth.currentUser) {
        await syncUserProfile(auth.currentUser, { displayName, address });
        onSuccess();
      }
    } catch (err: any) {
      setError('መረጃውን ማስቀመጥ አልተቻለም።');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-midnight/90 backdrop-blur-xl"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md glass rounded-[40px] p-10 overflow-hidden"
      >
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/40">
              <Scale size={32} className="text-white" />
            </div>
          </div>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
              {step === 'phone' ? (mode === 'signin' ? 'እንኳን ደህና መጡ' : 'ይመዝገቡ (Sign Up)') : 
               step === 'otp' ? 'ኮድ ያስገቡ' : 'የግል መረጃ'}
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              {step === 'phone' 
                ? 'በኢትዮጵያ ስልክ ቁጥርዎ ይግቡ' 
                : step === 'otp' 
                  ? `${phoneNumber} ላይ የተላከውን 6 አሃዝ ኮድ ያስገቡ`
                  : 'ለመቀጠል ስምዎን እና አድራሻዎን ያስገቡ'}
            </p>
          </div>

          <div className="space-y-6">
            {step === 'phone' ? (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">ስልክ ቁጥር (Phone Number)</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    placeholder="0912..."
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-navy/80 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold text-lg"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600">+251</div>
                </div>

                <div className="mt-8 flex items-center justify-center gap-4">
                  <button 
                    onClick={() => setMode('signin')}
                    className={`text-xs font-bold px-6 py-2 rounded-full transition-all ${mode === 'signin' ? 'bg-primary text-white' : 'text-slate-500 hover:text-white'}`}
                  >
                    መግቢያ (Sign In)
                  </button>
                  <button 
                    onClick={() => setMode('signup')}
                    className={`text-xs font-bold px-6 py-2 rounded-full transition-all ${mode === 'signup' ? 'bg-primary text-white' : 'text-slate-500 hover:text-white'}`}
                  >
                    መመዝገቢያ (Sign Up)
                  </button>
                </div>
              </div>
            ) : step === 'otp' ? (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">የማረጋገጫ ኮድ (Verification Code)</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-navy/80 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 tracking-[1em] font-black text-2xl text-center"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">ሙሉ ስም (Full Name)</label>
                  <input
                    type="text"
                    placeholder="ስምዎን ያስገቡ..."
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">አድራሻ (Address)</label>
                  <input
                    type="text"
                    placeholder="ከተማ/ክፍለ ከተማ..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold"
                  />
                </div>
              </div>
            )}

            <button
              onClick={step === 'phone' ? handleSendOTP : step === 'otp' ? handleVerifyOTP : handleSaveDetails}
              disabled={isLoading || (step === 'phone' ? !phoneNumber : step === 'otp' ? otp.length < 6 : (!displayName || !address))}
              className={`w-full py-6 rounded-3xl font-black text-sm flex items-center justify-center gap-3 transition-all
                ${isLoading || (step === 'phone' ? !phoneNumber : step === 'otp' ? otp.length < 6 : (!displayName || !address))
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-primary text-white shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95'}
              `}
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {step === 'phone' ? 'ይቀጥሉ (Continue)' : step === 'otp' ? 'አረጋግጥ (Verify)' : 'ጨርስ (Finish)'}
                  <ChevronRight size={18} />
                </>
              )}
            </button>

            {step === 'otp' && (
              <button 
                onClick={() => setStep('phone')}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-white transition-colors py-2"
              >
                ቁጥር ለመቀየር ተመለስ (Change Number)
              </button>
            )}

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-3 text-red-100 text-[11px] font-bold bg-red-500/20 p-4 rounded-2xl border border-red-500/20"
                >
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1">{error}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div id="recaptcha-container" className="mt-4 flex justify-center"></div>
          
          <p className="text-[10px] text-center text-slate-600 mt-8 font-bold uppercase tracking-widest leading-loose">
            ይህንን በመጠቀም በእኛ የአገልግሎት ውል እና የግላዊነት <br/> መመሪያ ተስማምተዋል።
          </p>
        </div>
      </motion.div>
    </div>
  );
}
