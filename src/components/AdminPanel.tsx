import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, FileText, MessageSquare, TrendingUp, Shield, Crown, Search, CheckCircle2, XCircle, Briefcase, Award } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

interface UserData {
  id: string;
  uid: string;
  displayName: string;
  phoneNumber: string;
  role: string;
  isSubscribed: boolean;
  chatCount: number;
  docCount: number;
  createdAt: any;
  lastLogin: any;
}

interface LawyerData {
  id: string;
  uid: string;
  displayName: string;
  specialization: string;
  isVerified: boolean;
  rating: number;
  badge?: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [lawyers, setLawyers] = useState<LawyerData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'users' | 'lawyers'>('users');
  const [filterType, setFilterType] = useState<'all' | 'pro' | 'free' | 'verified' | 'unverified'>('all');
  const [stats, setStats] = useState({
    totalUsers: 0,
    proUsers: 0,
    totalChats: 0,
    totalDocs: 0,
    totalLawyers: 0
  });

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserData));
      setUsers(usersData);
      
      const pro = usersData.filter(u => u.isSubscribed).length;
      const chats = usersData.reduce((acc, u) => acc + (u.chatCount || 0), 0);
      const docs = usersData.reduce((acc, u) => acc + (u.docCount || 0), 0);
      
      setStats(prev => ({
        ...prev,
        totalUsers: usersData.length,
        proUsers: pro,
        totalChats: chats,
        totalDocs: docs
      }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubLawyers = onSnapshot(collection(db, 'lawyers'), (snapshot) => {
      const lawyersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LawyerData));
      setLawyers(lawyersData);
      setStats(prev => ({ ...prev, totalLawyers: lawyersData.length }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'lawyers'));

    return () => {
      unsubUsers();
      unsubLawyers();
    };
  }, []);

  const toggleSubscription = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { isSubscribed: !currentStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleLawyerVerification = async (lawyerId: string, currentStatus: boolean) => {
    try {
      const lawyerRef = doc(db, 'lawyers', lawyerId);
      await updateDoc(lawyerRef, { isVerified: !currentStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(user => {
    const data = user.displayName?.toLowerCase() + user.phoneNumber?.toLowerCase();
    const matchesSearch = data.includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'pro' && user.isSubscribed) || 
                         (filterType === 'free' && !user.isSubscribed);
    return matchesSearch && matchesFilter;
  });

  const filteredLawyers = lawyers.filter(lawyer => {
    const data = lawyer.displayName?.toLowerCase() + lawyer.specialization?.toLowerCase();
    const matchesSearch = data.includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'verified' && lawyer.isVerified) || 
                         (filterType === 'unverified' && !lawyer.isVerified);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-12 relative z-10 flex flex-col gap-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white flex items-center gap-4">
            <Shield className="text-primary" size={40} />
            የአስተዳዳሪ ፓነል (Admin Panel)
          </h2>
          <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">የተጠቃሚዎች እና የአገልግሎት አስተዳደር</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="glass px-6 py-4 rounded-3xl border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">ጠቅላላ ገቢ (ግምት)</p>
              <p className="text-xl font-black text-white">{stats.proUsers * 200} ብር</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'ጠቅላላ ተጠቃሚዎች', value: stats.totalUsers, color: 'text-blue-500', icon: Users },
          { label: 'ጠበቆች', value: stats.totalLawyers, color: 'text-rose-500', icon: Briefcase },
          { label: 'ፕሮ ተጠቃሚዎች', value: stats.proUsers, color: 'text-amber-500', icon: Crown },
          { label: 'ጠቅላላ ጥያቄዎች', value: stats.totalChats, color: 'text-emerald-500', icon: MessageSquare },
          { label: 'ጠቅላላ ሰነዶች', value: stats.totalDocs, color: 'text-purple-500', icon: FileText }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-6 rounded-[32px] border border-white/5 flex flex-col gap-4"
          >
            <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest leading-none mb-2">{stat.label}</p>
              <p className="text-3xl font-black text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-4 border-b border-white/5 pb-1">
        {[
          { id: 'users', label: 'ተጠቃሚዎች (Users)', icon: Users },
          { id: 'lawyers', label: 'ጠበቆች (Lawyers)', icon: Briefcase }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setView(tab.id as any); setFilterType('all'); }}
            className={`px-8 py-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all border-b-2
              ${view === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-300'}
            `}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass rounded-[40px] border border-white/5 overflow-hidden flex flex-col">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              placeholder={view === 'users' ? "በስም ወይም በስልክ ይፈልጉ..." : "ጠበቃ በስም ይፈልጉ..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-navy/50 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-navy/50 p-1.5 rounded-2xl border border-white/5">
            {view === 'users' ? [
              { id: 'all', label: 'ሁሉም' },
              { id: 'pro', label: 'ፕሮ (Pro)' },
              { id: 'free', label: 'ነፃ (Free)' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id as any)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${filterType === type.id ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {type.label}
              </button>
            )) : [
              { id: 'all', label: 'ሁሉም' },
              { id: 'verified', label: 'ተረጋግጠዋል' },
              { id: 'unverified', label: 'አልተረጋገጡም' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id as any)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${filterType === type.id ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {view === 'users' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">ተጠቃሚ (User)</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">ስታተስ (Status)</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">አጠቃቀም (Usage)</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">ምዝገባ (Joined)</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">እርምጃዎች</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black uppercase">
                          {user.displayName?.charAt(0) || <Users size={18}/>}
                        </div>
                        <div>
                          <p className="text-white font-black">{user.displayName || 'ያልተገለጸ ስም'}</p>
                          <p className="text-slate-500 text-xs font-bold">{user.phoneNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                        ${user.isSubscribed ? 'bg-amber-500/20 text-amber-500 border-amber-500/20' : 'bg-slate-800 text-slate-600 border-white/5'}
                      `}>
                        {user.isSubscribed ? (
                          <>
                            <Crown size={10} />
                            ፕሮ (Pro)
                          </>
                        ) : (
                          'ነፃ (Free)'
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <MessageSquare size={14} className="text-slate-700" />
                          <span className="text-white font-black">{user.chatCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-slate-700" />
                          <span className="text-white font-black">{user.docCount || 0}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs text-slate-500 font-bold">
                      {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => toggleSubscription(user.id, user.isSubscribed)}
                        className={`p-2 rounded-xl border transition-all
                          ${user.isSubscribed 
                            ? 'border-red-500/20 text-red-500 hover:bg-red-500/10' 
                            : 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10'}
                        `}
                      >
                        {user.isSubscribed ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">ጠበቃ (Lawyer)</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">ልዩ ሙያ (Specialization)</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">ደረጃ (Rating)</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">ማረጋገጫ (Status)</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">እርምጃዎች</th>
                </tr>
              </thead>
              <tbody>
                {filteredLawyers.map((lawyer) => (
                  <tr key={lawyer.id} className="border-b border-white/5 group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 font-black uppercase">
                          {lawyer.displayName?.charAt(0) || <Briefcase size={18}/>}
                        </div>
                        <div>
                          <p className="text-white font-black">{lawyer.displayName}</p>
                          <p className="text-slate-500 text-xs font-bold">UID: {lawyer.uid.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-slate-300 font-bold">
                      {lawyer.specialization}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Award size={14} />
                        <span className="font-black text-sm">{lawyer.rating}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                        ${lawyer.isVerified ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' : 'bg-slate-800 text-slate-600 border-white/5'}
                      `}>
                        {lawyer.isVerified ? 'ተረጋግጧል' : 'ያልተረጋገጠ'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => toggleLawyerVerification(lawyer.id, lawyer.isVerified)}
                        className={`p-2 rounded-xl border transition-all
                          ${lawyer.isVerified 
                            ? 'border-red-500/20 text-red-500 hover:bg-red-500/10' 
                            : 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10'}
                        `}
                      >
                        {lawyer.isVerified ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
