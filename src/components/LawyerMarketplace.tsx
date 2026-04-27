import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Star, MessageSquare, Calendar, ShieldCheck, Award, Briefcase, MapPin, ChevronRight, X, Clock, DollarSign, Filter, CheckCircle } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from 'firebase/firestore';

interface Lawyer {
  id: string;
  uid: string;
  displayName: string;
  specialization: string;
  experience: number;
  bio: string;
  isVerified: boolean;
  rating: number;
  hourlyRate: number;
  badge?: string;
}

export default function LawyerMarketplace({ userId }: { userId: string }) {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpec, setFilterSpec] = useState('All');
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTopic, setBookingTopic] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'lawyers'), where('isVerified', '==', true));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Lawyer));
      setLawyers(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'lawyers'));

    return () => unsub();
  }, []);

  const handleBook = async () => {
    if (!selectedLawyer || !bookingDate || !bookingTopic.trim()) return;

    setIsBooking(true);
    try {
      await addDoc(collection(db, 'consultations'), {
        userId,
        lawyerId: selectedLawyer.uid,
        status: 'pending',
        date: new Date(bookingDate),
        topic: bookingTopic,
        price: selectedLawyer.hourlyRate,
        createdAt: serverTimestamp()
      });
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedLawyer(null);
        setBookingDate('');
        setBookingTopic('');
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBooking(false);
    }
  };

  const filteredLawyers = lawyers.filter(l => {
    const matchesSearch = l.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpec = filterSpec === 'All' || l.specialization === filterSpec;
    return matchesSearch && matchesSpec;
  });

  const specializations = ['All', ...new Set(lawyers.map(l => l.specialization))];

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-12 relative z-10 flex flex-col gap-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-text-header flex items-center gap-4">
            <Briefcase className="text-primary" size={40} />
            የጠበቆች ገበያ (Lawyer Finder)
          </h2>
          <p className="text-text-muted font-bold mt-2 uppercase tracking-widest text-xs">ታማኝ እና ልምድ ካላቸው ጠበቆች ጋር ይገናኙ</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="glass px-6 py-3 rounded-2xl border border-border-main flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
             <span className="text-xs font-black text-text-muted uppercase tracking-widest">{lawyers.length} ጠበቆች ተገኝተዋል</span>
           </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input 
            placeholder="ጠበቃ በስም ይፈልጉ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg-sidebar/50 border border-border-main rounded-2xl pl-12 pr-6 py-4 text-text-header focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
           {specializations.map(spec => (
             <button
               key={spec}
               onClick={() => setFilterSpec(spec)}
               className={`px-6 py-3 rounded-2xl text-xs font-black transition-all border whitespace-nowrap
                 ${filterSpec === spec ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'glass text-text-muted border-border-main hover:text-text-header'}
               `}
             >
               {spec}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLawyers.map((lawyer, i) => (
          <motion.div
            key={lawyer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-8 rounded-[40px] border border-border-main hover:border-primary/40 transition-all group relative overflow-hidden shadow-sm"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl border border-primary/20">
                {lawyer.displayName.charAt(0)}
              </div>
              {lawyer.badge && (
                <div className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-2">
                  <Award size={12} />
                  {lawyer.badge}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-black text-text-header flex items-center gap-2">
                  {lawyer.displayName}
                  {lawyer.isVerified && <CheckCircle size={16} className="text-emerald-500" />}
                </h3>
                <p className="text-primary font-bold text-xs uppercase tracking-widest mt-1">{lawyer.specialization}</p>
              </div>

              <div className="flex items-center gap-6">
                 <div className="flex flex-col gap-1">
                   <span className="text-xs font-black text-text-muted uppercase tracking-widest">ተመክሮ</span>
                   <span className="text-text-header font-black text-sm">{lawyer.experience}+ ዓመታት</span>
                 </div>
                 <div className="flex flex-col gap-1">
                   <span className="text-xs font-black text-text-muted uppercase tracking-widest">ደረጃ</span>
                   <div className="flex items-center gap-1 text-amber-500">
                     <Star size={14} fill="currentColor" />
                     <span className="font-black text-sm">{lawyer.rating}</span>
                   </div>
                 </div>
              </div>

              <p className="text-text-main text-sm font-medium line-clamp-2 leading-relaxed h-10">
                {lawyer.bio}
              </p>

              <div className="pt-6 border-t border-border-main flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-text-muted uppercase tracking-widest block mb-1">ዋጋ/ሰዓት</span>
                  <p className="text-text-header font-black text-lg">{lawyer.hourlyRate} ብር</p>
                </div>
                <button 
                  onClick={() => setSelectedLawyer(lawyer)}
                  className="px-6 py-3 bg-bg-glass hover:bg-primary hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all text-text-header border border-border-main"
                >
                  ቀጠሮ ይያዙ
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedLawyer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-bg-main/80 backdrop-blur-xl"
              onClick={() => !isBooking && setSelectedLawyer(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl glass rounded-[48px] p-8 lg:p-12 overflow-hidden border border-border-main"
            >
              {bookingSuccess ? (
                <div className="text-center py-12 space-y-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
                    <CheckCircle size={48} />
                  </div>
                  <h3 className="text-3xl font-black text-text-header">ቀጠሮዎ በተሳካ ሁኔታ ተመዝግቧል!</h3>
                  <p className="text-text-muted font-bold">ጠበቃው/ዋ ጥያቄዎን መርምረው ምላሽ ይሰጡዎታል። በግል ማህደርዎ መከታተል ይችላሉ።</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-3xl font-black text-text-header mb-2">ቀጠሮ ይያዙ</h3>
                      <p className="text-text-muted font-bold text-sm">ከ {selectedLawyer.displayName} ጋር ለሚደረግ የህግ ምክክር</p>
                    </div>
                    <button onClick={() => setSelectedLawyer(null)} className="p-3 text-text-muted hover:text-text-header bg-bg-glass rounded-2xl">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">የምክክሩ ርዕስ (Topic)</label>
                      <input 
                        placeholder="ለምሳሌ፦ የቤት ሽያጭ ውል ምርመራ"
                        value={bookingTopic}
                        onChange={(e) => setBookingTopic(e.target.value)}
                        className="w-full bg-bg-sidebar/50 border border-border-main rounded-2xl px-6 py-4 text-text-header focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">ቀን እና ሰዓት</label>
                      <input 
                        type="datetime-local"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full bg-bg-sidebar/50 border border-border-main rounded-2xl px-6 py-4 text-text-header focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold appearance-none theme-datetime"
                      />
                    </div>

                    <div className="p-6 bg-bg-sidebar/30 rounded-3xl border border-border-main grid grid-cols-2 gap-4">
                       <div className="flex flex-col gap-1">
                         <span className="text-xs font-black text-text-muted uppercase tracking-widest">አገልግሎት</span>
                         <span className="text-text-header font-black text-sm">የ1 ሰዓት ምክክር</span>
                       </div>
                       <div className="flex flex-col gap-1 text-right">
                         <span className="text-xs font-black text-text-muted uppercase tracking-widest">ክፍያ</span>
                         <span className="text-primary font-black text-lg">{selectedLawyer.hourlyRate} ብር</span>
                       </div>
                    </div>

                    <button
                      onClick={handleBook}
                      disabled={!bookingDate || !bookingTopic.trim() || isBooking}
                      className={`
                        w-full py-5 rounded-3xl font-black flex items-center justify-center gap-3 transition-all
                        ${bookingDate && bookingTopic.trim() && !isBooking 
                          ? 'bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02]' 
                          : 'bg-white/5 text-slate-600'}
                      `}
                    >
                      {isBooking ? 'በመመዝገብ ላይ...' : 'ይመዝገቡ (Confirm Booking)'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
