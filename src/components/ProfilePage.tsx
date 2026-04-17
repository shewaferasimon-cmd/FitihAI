import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, Crown, History, FileText, MessageSquare, ChevronRight, Edit3, Check, Loader2, Download, Trash2 } from 'lucide-react';
import { db, auth, updateDisplayName, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc } from 'firebase/firestore';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, PageNumber } from 'docx';

interface UserProfile {
  uid: string;
  phoneNumber: string;
  displayName: string;
  address?: string;
  role: string;
  isSubscribed: boolean;
  createdAt: any;
  chatCount?: number;
  docCount?: number;
  balance?: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [activeTab, setActiveTab] = useState<'docs' | 'chats'>('docs');
  const [docs, setDocs] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen to profile
    const profileUnsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserProfile;
        setProfile(data);
        setNewName(data.displayName || '');
      }
      setIsLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}`));

    // Listen to documents
    const docsQuery = query(
      collection(db, 'documents'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const docsUnsub = onSnapshot(docsQuery, (snapshot) => {
      setDocs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'documents'));

    // Listen to chats
    const chatsQuery = query(
      collection(db, 'users', auth.currentUser.uid, 'chats'),
      orderBy('createdAt', 'desc')
    );
    const chatsUnsub = onSnapshot(chatsQuery, (snapshot) => {
      setChats(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${auth.currentUser?.uid}/chats`));

    return () => {
      profileUnsub();
      docsUnsub();
      chatsUnsub();
    };
  }, []);

  const handleUpdateName = async () => {
    if (!auth.currentUser || !newName.trim()) return;
    try {
      await updateDisplayName(auth.currentUser.uid, newName);
      setIsEditingName(false);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadDoc = async (docData: any) => {
    // Re-use logic from DocumentCreator for high-fidelity export
    const sections = docData.content.split('[SIGNATURE_SECTION]');
    const mainBody = sections[0];
    const signaturePart = sections[1] || '';

    const createParagraph = (text: string, isTitle: boolean = false) => {
      const cleanedText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '').trim();
      if (!cleanedText) return null;
      const isArticle = !!(cleanedText.includes('አንቀጽ') || cleanedText.match(/^[፩-፲]+[.]/));
      return new Paragraph({
        children: [new TextRun({ text: cleanedText, bold: isTitle || isArticle, size: isTitle ? 32 : (isArticle ? 28 : 24), font: "Times New Roman" })],
        alignment: isTitle ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
        spacing: { before: isTitle ? 600 : 200, after: 200, line: 360 },
        indent: isArticle ? undefined : { firstLine: 450 },
      });
    };

    const paragraphs: Paragraph[] = [];
    mainBody.split('\n').forEach((line, index) => {
      const p = createParagraph(line, index === 0);
      if (p) paragraphs.push(p);
    });

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: `የህግ ሰነድ - ${docData.type}`, size: 18, color: "666666", font: "Times New Roman" })], alignment: AlignmentType.RIGHT })] }) },
        footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ children: ["ገጽ ", PageNumber.CURRENT, " ከ ", PageNumber.TOTAL_PAGES], size: 18, color: "666666", font: "Times New Roman" })], alignment: AlignmentType.CENTER })] }) },
        children: paragraphs,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${docData.title}_legal_document.docx`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-12 relative z-10 min-h-full flex flex-col">
      {/* Profile Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[40px] p-10 mb-12 relative overflow-hidden"
      >
        <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[80px]" />
        
        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="relative group">
            <div className="w-32 h-32 rounded-[48px] bg-primary/20 flex items-center justify-center border-2 border-primary/30 shadow-2xl shadow-primary/20">
              <User size={64} className="text-primary" />
            </div>
            <div className={`absolute -bottom-2 -right-2 p-3 rounded-2xl ${profile?.isSubscribed ? 'bg-amber-500 shadow-amber-500/40' : 'bg-slate-700'} shadow-lg border border-white/10`}>
              <Crown size={20} className="text-white" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              {isEditingName ? (
                <div className="flex items-center gap-2 bg-navy/50 p-2 rounded-2xl border border-white/10">
                  <input 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-transparent border-none text-2xl font-black text-white focus:outline-none px-4"
                    autoFocus
                  />
                  <button onClick={handleUpdateName} className="p-3 bg-primary rounded-xl text-white">
                    <Check size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <h2 className="text-4xl font-black text-white tracking-tight">
                    {profile?.displayName || 'ያልተገለጸ ስም'}
                  </h2>
                  <button onClick={() => setIsEditingName(true)} className="p-2 text-slate-500 hover:text-primary transition-colors">
                    <Edit3 size={18} />
                  </button>
                </div>
              )}
              <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                ${profile?.isSubscribed 
                  ? 'bg-amber-500/20 text-amber-500 border-amber-500/20' 
                  : 'bg-slate-800 text-slate-500 border-white/5'}
              `}>
                {profile?.isSubscribed ? 'ፕሮ ተጠቃሚ (Pro User)' : 'ነፃ ተጠቃሚ (Free User)'}
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-6">
              <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                <Phone size={14} className="text-primary" />
                {profile?.phoneNumber}
              </div>
              {profile?.address && (
                <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                  <span className="text-primary">📍</span>
                  {profile.address}
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-500 font-medium text-xs uppercase tracking-wider">
                የተመዘገበበት ቀን: {profile?.createdAt instanceof Timestamp ? profile.createdAt.toDate().toLocaleDateString() : 'መረጃ የለም'}
              </div>
            </div>

            {/* Usage Stats */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
               <div className="bg-navy/30 border border-white/5 rounded-2xl p-4">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">ውይይቶች (Chats)</p>
                  <p className="text-xl font-black text-white">{profile?.chatCount || 0}</p>
               </div>
               <div className="bg-navy/30 border border-white/5 rounded-2xl p-4">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">ሰነዶች (Docs)</p>
                  <p className="text-xl font-black text-white">{profile?.docCount || 0}</p>
               </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* History Tabs */}
      <div className="flex-1 flex flex-col">
        <div className="flex gap-10 border-b border-white/5 mb-10 pb-4">
          {[
            { id: 'docs', label: 'ያዘጋጇቸው ሰነዶች', icon: FileText, count: docs.length },
            { id: 'chats', label: 'የቀድሞ ውይይቶች', icon: MessageSquare, count: chats.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 font-black text-sm uppercase tracking-widest relative pb-4 transition-all
                ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}
              `}
            >
              <tab.icon size={18} />
              {tab.label}
              <span className="bg-white/5 px-2 py-0.5 rounded-lg text-[10px]">{tab.count}</span>
              {activeTab === tab.id && (
                <motion.div layoutId="profile-tab-line" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'docs' ? (
              <motion.div 
                key="docs-gallery"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {docs.length === 0 ? (
                  <div className="col-span-full py-20 text-center glass rounded-3xl border-dashed border-2 border-white/5">
                    <FileText size={48} className="mx-auto text-slate-800 mb-4" />
                    <p className="text-slate-500 font-bold">እስካሁን ያዘጋጁት ሰነድ የለም</p>
                  </div>
                ) : (
                  docs.map((doc) => (
                    <motion.div 
                      key={doc.id}
                      className="glass group p-6 rounded-[32px] border border-white/5 hover:border-primary/20 transition-all flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <FileText size={20} className="text-primary" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase">
                          {doc.createdAt instanceof Timestamp ? doc.createdAt.toDate().toLocaleDateString() : ''}
                        </span>
                      </div>
                      <h4 className="text-white font-black text-lg mb-2 leading-tight">{doc.title}</h4>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-6">{doc.type}</p>
                      
                      <button 
                        onClick={() => downloadDoc(doc)}
                        className="mt-auto w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition-all"
                      >
                        <Download size={14} />
                        አውርድ (Download)
                      </button>
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="chats-gallery"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {chats.length === 0 ? (
                  <div className="py-20 text-center glass rounded-3xl border-dashed border-2 border-white/5">
                    <MessageSquare size={48} className="mx-auto text-slate-800 mb-4" />
                    <p className="text-slate-500 font-bold">እስካሁን ያደረጉት ውይይት የለም</p>
                  </div>
                ) : (
                  chats.map((chat) => (
                    <div 
                      key={chat.id}
                      className={`p-6 rounded-3xl glass border border-white/5 flex gap-6 ${chat.role === 'user' ? 'bg-navy/20' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${chat.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-300'}`}>
                        {chat.role === 'user' ? <User size={18} /> : <MessageSquare size={18} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            {chat.role === 'user' ? 'እርስዎ' : 'ፍትህ AI'}
                          </span>
                          <span className="text-[10px] text-slate-700 font-bold">
                            {chat.createdAt instanceof Timestamp ? chat.createdAt.toDate().toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{chat.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
