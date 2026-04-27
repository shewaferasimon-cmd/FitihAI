import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Lock, ChevronRight, Scale, Loader2, AlertCircle, Mail, Github, Chrome, Eye, EyeOff } from 'lucide-react';
import { syncUserProfile, auth, signInWithGoogle, signInEmail, signUpEmail, signInPhonePassword, signUpPhonePassword } from '../services/firebase';

interface AuthModalProps {
  onSuccess: () => void;
}

export default function AuthModal({ onSuccess }: AuthModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [step, setStep] = useState<'phone' | 'details' | 'lawyer_details'>('phone');
  const [mode, setMode] = useState<'signin' | 'signup' | 'lawyer_signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(true);
  
  // Email Auth State
  const [useEmail, setUseEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Lawyer specific fields
  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  useEffect(() => {
    if (auth.currentUser && step === 'phone') {
      setStep(mode === 'lawyer_signup' ? 'lawyer_details' : 'details');
    }
  }, [mode, step]);

  const handlePhonePasswordAuth = async () => {
    if (!phoneNumber || !password) return;
    setIsLoading(true);
    setError(null);
    try {
      let user;
      if (mode === 'signin') {
        user = await signInPhonePassword(phoneNumber, password);
      } else {
        user = await signUpPhonePassword(phoneNumber, password);
      }
      
      if (mode === 'signup' || mode === 'lawyer_signup') {
        setStep(mode === 'lawyer_signup' ? 'lawyer_details' : 'details');
      } else {
        // Pass the phoneNumber explicitly so syncUserProfile can detect the admin role
        await syncUserProfile(user, { phoneNumber: phoneNumber });
        onSuccess();
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('የተሳሳተ ስልክ ቁጥር ወይም የይለፍ ቃል ነው።');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('ይህ ስልክ ቁጥር ቀድሞውኑ ተመዝግቧል። እባክዎ ይግቡ።');
      } else {
        setError('መግባት አልተቻለም። እባክዎን እንደገና ይሞክሩ።');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      await syncUserProfile(user);
      onSuccess();
    } catch (err: any) {
      setError('በGoogle መግባት አልተቻለም። እባክዎን እንደገና ይሞክሩ።');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    setError(null);
    try {
      let user;
      if (mode === 'signin') {
        user = await signInEmail(email, password);
      } else {
        user = await signUpEmail(email, password);
      }
      
      if (mode === 'signup' || mode === 'lawyer_signup') {
        setStep(mode === 'lawyer_signup' ? 'lawyer_details' : 'details');
      } else {
        await syncUserProfile(user);
        onSuccess();
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('የተሳሳተ ኢሜይል ወይም የይለፍ ቃል ነው።');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('ይህ ኢሜይል ቀድሞውኑ ስራ ላይ ውሏል።');
      } else {
        setError('በኢሜይል መግባት አልተቻለም። እባክዎን እንደገና ይሞክሩ።');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!firstName || !lastName || !address) return;
    setIsLoading(true);
    try {
      if (auth.currentUser) {
        const commonDetails = {
          displayName: `${firstName} ${lastName}`,
          firstName,
          lastName,
          gender,
          age: parseInt(age) || 0,
          occupation,
          address,
          phoneNumber: auth.currentUser.phoneNumber || phoneNumber || '0000000000'
        };

        if (mode === 'lawyer_signup') {
          await syncUserProfile(auth.currentUser, { 
            ...commonDetails,
            role: 'lawyer',
            specialization,
            licenseNumber
          });
        } else {
          await syncUserProfile(auth.currentUser, commonDetails);
        }
        onSuccess();
      }
    } catch (err: any) {
      setError('መረጃውን ማስቀመጥ አልተቻለም።');
    } finally {
      setIsLoading(false);
    }
  };

  const onboardingCards = [
    {
      title: 'እንኳን ወደ ፍትህ AI በደህና መጡ',
      description: 'የኢትዮጵያ የመጀመሪያው በAI የታገዘ የህግ ረዳት። በህግ ጉዳዮች ላይ ፈጣን እና ትክክለኛ መረጃ ያግኙ።',
      icon: <Scale size={60} className="text-primary" />,
      color: 'bg-primary/10'
    },
    {
      title: 'የህግ ረዳት (AI Chat)',
      description: 'ለማንኛውም የህግ ጥያቄዎችዎ በ AI የታገዘ ፈጣን ምላሽ ያግኙ። እንደ የቤት ኪራይ፣ የንግድ ህግ እና ሌሎች።',
      icon: <Phone size={60} className="text-blue-500" />,
      color: 'bg-blue-500/10'
    },
    {
      title: 'ሰነድ አዘጋጅ (Docs)',
      description: 'ውሎች፣ የሰራተኛ ቅጥር ስምምነቶች እና ሌሎች የህግ ሰነዶችን በደቂቃዎች ውስጥ በጥራት ያዘጋጁ።',
      icon: <Lock size={60} className="text-emerald-500" />,
      color: 'bg-emerald-500/10'
    },
    {
      title: 'የህግ መተንተኛ እና ገበያ',
      description: 'የተለያዩ የህግ ሰነዶችን ለመተንተን እና ታማኝ ጠበቃዎችን በቀላሉ ለመፈለግ ይጠቀሙበት።',
      icon: <Scale size={60} className="text-purple-500" />,
      color: 'bg-purple-500/10'
    },
    {
      title: 'ጥንቃቄ እና ውል',
      description: 'ፍትህ AI በአርቴፊሻል ኢንተለጀንስ የሚሰራ ስለሆነ ስህተቶች ሊኖሩ ይችላሉ። ይህንን አገልግሎት በመጠቀም በአገልግሎት ውላችን ተስማምተዋል።',
      icon: <AlertCircle size={60} className="text-rose-500" />,
      color: 'bg-rose-500/10'
    }
  ];

  if (showOnboarding) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-bg-main/60 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-bg-main/90" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-md glass rounded-[40px] p-10 shadow-2xl border border-border-main overflow-hidden text-center"
        >
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={onboardingStep}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 flex flex-col items-center"
            >
              <div className={`w-32 h-32 rounded-[40px] ${onboardingCards[onboardingStep].color} flex items-center justify-center mb-8 border border-white/5`}>
                {onboardingCards[onboardingStep].icon}
              </div>
              <h2 className="text-2xl font-black text-text-header mb-4 tracking-tight leading-tight">
                {onboardingCards[onboardingStep].title}
              </h2>
              <p className="text-text-muted text-base font-bold leading-relaxed px-2">
                {onboardingCards[onboardingStep].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-12 space-y-6 relative z-10">
            <div className="flex justify-center gap-2">
              {onboardingCards.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === onboardingStep ? 'w-8 bg-primary' : 'w-2 bg-text-muted/20'}`}
                />
              ))}
            </div>

            <div className="flex gap-4">
              {onboardingStep < onboardingCards.length - 1 ? (
                <>
                  <button 
                    onClick={() => setShowOnboarding(false)}
                    className="flex-1 py-4 text-sm font-black text-text-muted uppercase tracking-widest hover:text-text-header transition-colors"
                  >
                    Skip
                  </button>
                  <button 
                    onClick={() => setOnboardingStep(prev => prev + 1)}
                    className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Next
                    <ChevronRight size={18} />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setShowOnboarding(false)}
                  className="w-full py-5 bg-primary text-white rounded-3xl font-black text-sm flex items-center justify-center gap-2 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  አሁን እንጀምር (Get Started)
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-8 overflow-y-auto custom-scrollbar bg-bg-main/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-bg-main/40 pointer-events-none"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md glass rounded-[40px] p-8 sm:p-10 my-16 shadow-2xl border border-border-main overflow-hidden flex-shrink-0"
      >
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/40">
              <Scale size={32} className="text-white" />
            </div>
          </div>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-text-header mb-2 tracking-tight">
              {step === 'phone' ? (
                mode === 'signin' ? 'እንኳን ደህና መጡ! (Welcome Back)' : 
                mode === 'signup' ? 'አዲስ አካውንት (Create Account)' : 'የጠበቃ ምዝገባ'
              ) : 'የግል መረጃ'}
            </h2>
            <p className="text-text-muted text-sm font-medium">
              {step === 'phone' 
                ? (mode === 'signin' ? 'ወደ አካውንትዎ ለመግባት መረጃዎን ያስገቡ' : 'መለያ ለመክፈት መረጃዎን ያስገቡ') 
                : mode === 'lawyer_signup' ? 'የጠበቃነት መረጃዎን ያስገቡ' : 'ለመቀጠል ስምዎን እና አድራሻዎን ያስገቡ'}
            </p>
          </div>

          <div className="space-y-6">
            {step === 'phone' ? (
              <div className="space-y-6">
                <div className="flex gap-2 p-1.5 bg-bg-sidebar/50 rounded-[24px] border border-border-main mb-6">
                  <button 
                    onClick={() => setMode('signin')}
                    className={`flex-1 text-[11px] font-black uppercase tracking-widest py-4 rounded-xl transition-all border ${mode === 'signin' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'text-text-muted border-transparent hover:bg-bg-glass hover:text-text-header'}`}
                  >
                    መግቢያ (Log In)
                  </button>
                  <button 
                    onClick={() => setMode('signup')}
                    className={`flex-1 text-[11px] font-black uppercase tracking-widest py-4 rounded-xl transition-all border ${mode === 'signup' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'text-text-muted border-transparent hover:bg-bg-glass hover:text-text-header'}`}
                  >
                    ምዝገባ (Sign Up)
                  </button>
                  <button 
                    onClick={() => setMode('lawyer_signup')}
                    className={`flex-1 text-[11px] font-black uppercase tracking-widest py-4 rounded-xl transition-all border ${mode === 'lawyer_signup' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'text-text-muted border-transparent hover:bg-bg-glass hover:text-text-header'}`}
                  >
                    ጠበቃ (Lawyer)
                  </button>
                </div>

                <div className="flex gap-4 p-1 bg-bg-sidebar/50 rounded-2xl border border-border-main mb-6">
                  <button 
                    onClick={() => setUseEmail(false)}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${!useEmail ? 'bg-primary/20 text-primary border border-primary/20' : 'text-text-muted hover:text-text-header'}`}
                  >
                    ቁጥር (Phone)
                  </button>
                  <button 
                    onClick={() => setUseEmail(true)}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${useEmail ? 'bg-primary/20 text-primary border border-primary/20' : 'text-text-muted hover:text-text-header'}`}
                  >
                    ኢሜይል (Email)
                  </button>
                </div>

                {!useEmail ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-black text-text-muted uppercase tracking-widest mb-3 ml-1">ስልክ ቁጥር (Phone Number)</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">
                          <Phone size={18} />
                        </div>
                        <input
                          type="tel"
                          placeholder="0912..."
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl pl-14 pr-16 py-5 text-text-header placeholder-text-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold text-lg"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">+251</div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3 ml-1">የይለፍ ቃል (Password)</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">
                          <Lock size={18} />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="********"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl pl-14 pr-12 py-5 text-text-header placeholder-text-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                        />
                        <button 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-header transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-black text-text-muted uppercase tracking-widest mb-3 ml-1">ኢሜይል (Email Address)</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          placeholder="email@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl pl-14 pr-6 py-5 text-text-header placeholder-text-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3 ml-1">የይለፍ ቃል (Password)</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">
                          <Lock size={18} />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="********"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl pl-14 pr-12 py-5 text-text-header placeholder-text-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                        />
                        <button 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-header transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : step === 'lawyer_details' ? (
              <div className="space-y-4 max-h-[450px] overflow-y-auto px-1 custom-scrollbar pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3 ml-1">ስም (First Name)</label>
                    <input
                      type="text"
                      placeholder="ስም..."
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl px-6 py-4 text-text-header font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3 ml-1">የአያት ስም (Last Name)</label>
                    <input
                      type="text"
                      placeholder="የአያት..."
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl px-6 py-4 text-text-header font-bold text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3 ml-1">ጾታ (Gender)</label>
                    <select 
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl px-6 py-4 text-text-header font-bold text-sm"
                    >
                      <option value="">ይምረጡ...</option>
                      <option value="Male">ወንድ (Male)</option>
                      <option value="Female">ሴት (Female)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3 ml-1">እድሜ (Age)</label>
                    <input
                      type="number"
                      placeholder="እድሜ..."
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl px-6 py-4 text-text-header font-bold text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-black text-text-muted uppercase tracking-widest mb-3 ml-1">ልዩ ሙያ (Specialization)</label>
                  <select 
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl px-6 py-4 text-text-header font-bold text-sm"
                  >
                    <option value="">ይምረጡ...</option>
                    <option value="Civil Law">የፍትሐ ብሔር ሕግ (Civil)</option>
                    <option value="Criminal Law">የወንጀል ሕግ (Criminal)</option>
                    <option value="Business Law">የንግድ ሕግ (Business)</option>
                    <option value="Labor Law">የሰራተኛ ሕግ (Labor)</option>
                    <option value="Family Law">የቤተሰብ ሕግ (Family)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-black text-text-muted uppercase tracking-widest mb-3 ml-1">የጠበቃነት ፈቃድ ቁጥር (License #)</label>
                  <input
                    type="text"
                    placeholder="Lic/123/..."
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl px-6 py-4 text-text-header font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3 ml-1">አድራሻ (Address)</label>
                  <input
                    type="text"
                    placeholder="ከተማ/ክፍለ ከተማ..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl px-6 py-4 text-text-header font-bold text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[450px] overflow-y-auto px-1 custom-scrollbar pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3 ml-1">ስም (First Name)</label>
                    <input
                      type="text"
                      placeholder="ስም..."
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl px-6 py-4 text-text-header placeholder-text-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3 ml-1">የአያት ስም (Last Name)</label>
                    <input
                      type="text"
                      placeholder="የአያት..."
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl px-6 py-4 text-text-header placeholder-text-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3 ml-1">ጾታ (Gender)</label>
                    <select 
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl px-6 py-4 text-text-header placeholder-text-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold text-sm"
                    >
                      <option value="">ይምረጡ...</option>
                      <option value="Male">ወንድ (Male)</option>
                      <option value="Female">ሴት (Female)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3 ml-1">እድሜ (Age)</label>
                    <input
                      type="number"
                      placeholder="እድሜ..."
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl px-6 py-4 text-text-header placeholder-text-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3 ml-1">ስራ (Occupation)</label>
                  <input
                    type="text"
                    placeholder="የስራ ሁኔታ/መስክ..."
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl px-6 py-4 text-text-header placeholder-text-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3 ml-1">አድራሻ (Address)</label>
                  <input
                    type="text"
                    placeholder="ከተማ/ክፍለ ከተማ..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl px-6 py-4 text-text-header placeholder-text-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold text-sm"
                  />
                </div>
              </div>
            )}

            <button
               onClick={step === 'phone' ? (useEmail ? handleEmailAuth : handlePhonePasswordAuth) : handleSaveDetails}
               disabled={isLoading || (step === 'phone' ? (useEmail ? (!email || !password) : (!phoneNumber || !password)) : step === 'lawyer_details' ? (!firstName || !lastName || !specialization || !licenseNumber || !address) : (!firstName || !lastName || !address))}
               className={`w-full py-6 rounded-3xl font-black text-sm flex items-center justify-center gap-3 transition-all
                 ${isLoading || (step === 'phone' ? (useEmail ? (!email || !password) : (!phoneNumber || !password)) : step === 'lawyer_details' ? (!firstName || !lastName || !specialization || !licenseNumber || !address) : (!firstName || !lastName || !address))
                   ? 'bg-bg-sidebar text-text-muted cursor-not-allowed border border-border-main'
                   : 'bg-primary text-white shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95'}
               `}
            >
               {isLoading ? (
                 <Loader2 className="animate-spin" size={20} />
               ) : (
                 <>
                   {step === 'phone' ? 'ይቀጥሉ (Continue)' : 'ጨርስ (Finish)'}
                   <ChevronRight size={18} />
                 </>
               )}
            </button>

            {step === 'phone' && (
              <div className="space-y-6 mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-main"></div></div>
                  <div className="relative flex justify-center text-xs font-black uppercase tracking-[0.2em] text-text-muted">
                    <span className="bg-bg-sidebar px-4 rounded-full">ወይም (OR)</span>
                  </div>
                </div>

                <button 
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl bg-bg-sidebar/50 border border-border-main flex items-center justify-center gap-3 hover:bg-bg-sidebar transition-all font-bold text-xs text-text-header"
                >
                  <Chrome size={18} />
                  በGoogle ይቀጥሉ (Continue with Google)
                </button>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-3 text-red-500 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 text-xs font-bold"
                >
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1">{error}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
