import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Lock, ChevronRight, Scale, Loader2, AlertCircle } from 'lucide-react';
import { Mail, Github, Chrome, Eye, EyeOff } from 'lucide-react';
import { syncUserProfile, auth, signInWithGoogle, signInEmail, signUpEmail, signInPhonePassword, signUpPhonePassword } from '../services/firebase';

interface AuthModalProps {
  onSuccess: () => void;
}

export default function AuthModal({ onSuccess }: AuthModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
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
  
  // Email Auth State
  const [useEmail, setUseEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Lawyer specific fields
  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  useEffect(() => {
    // If we have a user but we are still on the phone step, it means we need to collect details
    // This happens after Google/Email signup or the test bypass
    if (auth.currentUser && step === 'phone') {
      setStep(mode === 'lawyer_signup' ? 'lawyer_details' : 'details');
    }
  }, [mode, step]);

  const handleTestBypass = async () => {
    if (phoneNumber === '0933333333' || phoneNumber === '+251933333333') {
      setIsLoading(true);
      setError(null);
      try {
        const { signInAnonymously } = await import('firebase/auth');
        await signInAnonymously(auth);
        setMode('signup');
        setStep('details');
      } catch (err) {
        setError('የሙከራ ምዝገባ መጀመር አልተቻለም።');
      } finally {
        setIsLoading(false);
      }
      return true;
    }
    return false;
  };

  const handlePhonePasswordAuth = async () => {
    if (!phoneNumber) return;
    
    // Check for test bypass first
    const isBypass = await handleTestBypass();
    if (isBypass) return;

    if (!password) return;
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
        await syncUserProfile(user);
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

  const mapErrorMessage = (err: any) => {
    const code = err.code || '';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return 'የተሳሳተ ስልክ ቁጥር ወይም የይለፍ ቃል ነው።';
    }
    if (code === 'auth/email-already-in-use') {
      return 'ይህ ስልክ ቁጥር ቀድሞውኑ ተመዝግቧል። እባክዎ ይግቡ።';
    }
    return 'ስህተት ተከስቷል። እባክዎን እንደገና ይሞክሩ።';
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
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
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
          // Add phone number for anonymous users who are using the test bypass
          phoneNumber: auth.currentUser.isAnonymous ? (phoneNumber.startsWith('+') ? phoneNumber : `+251${phoneNumber.replace(/^0/, '')}`) : auth.currentUser.phoneNumber
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
              {step === 'phone' ? (mode === 'signin' ? 'እንኳን ደህና መጡ' : mode === 'signup' ? 'ይመዝገቡ (Sign Up)' : 'ጠበቃ ሆነው ይመዝገቡ') : 
               'የግል መረጃ'}
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              {step === 'phone' 
                ? 'በስልክ ቁጥርዎ እና በሚስጥር ቁጥርዎ ይግቡ' 
                : mode === 'lawyer_signup' ? 'የጠበቃነት መረጃዎን ያስገቡ' : 'ለመቀጠል ስምዎን እና አድራሻዎን ያስገቡ'}
            </p>
          </div>

          <div className="space-y-6">
            {step === 'phone' ? (
              <div className="space-y-6">
                <div className="flex gap-4 p-1 bg-navy/50 rounded-2xl border border-white/5 mb-6">
                  <button 
                    onClick={() => setUseEmail(false)}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${!useEmail ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    ቁጥር (Phone)
                  </button>
                  <button 
                    onClick={() => setUseEmail(true)}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${useEmail ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    ኢሜይል (Email)
                  </button>
                </div>

                {!useEmail ? (
                  <div className="space-y-4">
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
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">የይለፍ ቃል (Password)</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                          <Lock size={18} />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="********"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-navy/80 border border-white/5 rounded-2xl pl-14 pr-12 py-5 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                        />
                        <button 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">ኢሜይል (Email Address)</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          placeholder="email@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-navy/80 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">የይለፍ ቃል (Password)</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                          <Lock size={18} />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="********"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-navy/80 border border-white/5 rounded-2xl pl-14 pr-12 py-5 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                        />
                        <button 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setMode('signin')}
                    className={`text-[9px] font-black uppercase tracking-widest py-3 rounded-xl transition-all border ${mode === 'signin' ? 'bg-primary text-white border-primary' : 'text-slate-500 border-white/5 hover:text-white'}`}
                  >
                    መግቢያ
                  </button>
                  <button 
                    onClick={() => setMode('signup')}
                    className={`text-[9px] font-black uppercase tracking-widest py-3 rounded-xl transition-all border ${mode === 'signup' ? 'bg-primary text-white border-primary' : 'text-slate-500 border-white/5 hover:text-white'}`}
                  >
                    ተጠቃሚ
                  </button>
                  <button 
                    onClick={() => setMode('lawyer_signup')}
                    className={`text-[9px] font-black uppercase tracking-widest py-3 rounded-xl transition-all border ${mode === 'lawyer_signup' ? 'bg-primary text-white border-primary' : 'text-slate-500 border-white/5 hover:text-white'}`}
                  >
                    ጠበቃ
                  </button>
                </div>
              </div>
            ) : step === 'lawyer_details' ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">ስም (First Name)</label>
                    <input
                      type="text"
                      placeholder="ስም..."
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">የአያት ስም (Last Name)</label>
                    <input
                      type="text"
                      placeholder="የአያት..."
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">ጾታ (Gender)</label>
                    <select 
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold text-sm"
                    >
                      <option value="">ይምረጡ...</option>
                      <option value="Male">ወንድ (Male)</option>
                      <option value="Female">ሴት (Female)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">እድሜ (Age)</label>
                    <input
                      type="number"
                      placeholder="እድሜ..."
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">ልዩ ሙያ (Specialization)</label>
                  <select 
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold text-sm"
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
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">የጠበቃነት ፈቃድ ቁጥር (License #)</label>
                  <input
                    type="text"
                    placeholder="Lic/123/..."
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">አድራሻ (Address)</label>
                  <input
                    type="text"
                    placeholder="ከተማ/ክፍለ ከተማ..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">ስም (First Name)</label>
                    <input
                      type="text"
                      placeholder="ስም..."
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">የአያት ስም (Last Name)</label>
                    <input
                      type="text"
                      placeholder="የአያት..."
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">ጾታ (Gender)</label>
                    <select 
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold text-sm"
                    >
                      <option value="">ይምረጡ...</option>
                      <option value="Male">ወንድ (Male)</option>
                      <option value="Female">ሴት (Female)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">እድሜ (Age)</label>
                    <input
                      type="number"
                      placeholder="እድሜ..."
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">ስራ (Occupation)</label>
                  <input
                    type="text"
                    placeholder="የስራ ሁኔታ/መስክ..."
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">አድራሻ (Address)</label>
                  <input
                    type="text"
                    placeholder="ከተማ/ክፍለ ከተማ..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-navy/80 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold text-sm"
                  />
                </div>
              </div>
            )}

            <button
               onClick={step === 'phone' ? (useEmail ? handleEmailAuth : handlePhonePasswordAuth) : handleSaveDetails}
               disabled={isLoading || (step === 'phone' ? (useEmail ? (!email || !password) : (!phoneNumber || !password)) : step === 'lawyer_details' ? (!firstName || !lastName || !specialization || !licenseNumber || !address) : (!firstName || !lastName || !address))}
               className={`w-full py-6 rounded-3xl font-black text-sm flex items-center justify-center gap-3 transition-all
                 ${isLoading || (step === 'phone' ? (useEmail ? (!email || !password) : (!phoneNumber || !password)) : step === 'lawyer_details' ? (!firstName || !lastName || !specialization || !licenseNumber || !address) : (!firstName || !lastName || !address))
                   ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
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
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                  <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
                    <span className="bg-[#0a0a0c] px-4">ወይም (OR)</span>
                  </div>
                </div>

                <button 
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-3 hover:bg-white/10 transition-all font-bold text-xs text-white"
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
                  className="flex items-start gap-3 text-red-100 text-[11px] font-bold bg-red-500/20 p-4 rounded-2xl border border-red-500/20"
                >
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1">{error}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <p className="text-[10px] text-center text-slate-600 mt-8 font-bold uppercase tracking-widest leading-loose">
            ይህንን በመጠቀም በእኛ የአገልግሎት ውል እና የግላዊነት <br/> መመሪያ ተስማምተዋል።
          </p>
        </div>
      </motion.div>
    </div>
  );
}
