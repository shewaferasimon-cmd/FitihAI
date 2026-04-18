import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Scale, Bot, User, Trash2, Info, ChevronRight, Menu, X, FileEdit, MessageSquare, LogOut, Settings, Shield, Home, Briefcase, Paperclip, Image as ImageIcon, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatWithAI } from './services/gemini.ts';
import DocumentCreator from './components/DocumentCreator.tsx';
import ProfilePage from './components/ProfilePage.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import LegalTools from './components/LegalTools.tsx';
import LawyerMarketplace from './components/LawyerMarketplace.tsx';
import { auth, saveChatMessage, incrementUsage, db } from './services/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { CreditCard, Sparkles, Crown } from 'lucide-react';

const FREE_CHAT_LIMIT = 5;
import AuthModal from './components/AuthModal';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
  timestamp: Date;
}

/**
 * FitihAI Legal Assistant - Clean Minimalism Theme
 */
export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profileExists, setProfileExists] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('user');
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'docs' | 'profile' | 'admin' | 'market' | 'guides' | 'analyzers'>('home');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      parts: [{ text: 'ሰላም! እኔ ፍትህ AI (FitihAI) ነኝ—የኢትዮጵያ የሕግ ረዳት። እንዴት ልረዳዎት እችላለሁ?' }],
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{name: string, type: string, base64?: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Fetch role and check existence
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role || 'user');
          setProfileExists(true);
        } else {
          setProfileExists(false);
        }
      } else {
        setCurrentUser(null);
        setUserRole('user');
        setProfileExists(false);
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, activeTab]);

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading || !currentUser) return;

    // Check Limits
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (!data.isSubscribed && (data.chatCount || 0) >= FREE_CHAT_LIMIT) {
        setShowPaywall(true);
        return;
      }
    }

    const messageParts: any[] = [{ text: input }];

    // Add multimodal files
    attachedFiles.forEach(file => {
      if (file.base64 && file.type.startsWith('image/')) {
        messageParts.push({
          inlineData: {
            data: file.base64,
            mimeType: file.type
          }
        });
      }
    });

    const userMessage: Message = {
      role: 'user',
      parts: messageParts,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    // Save user message to history (omitting image b64 for storage efficiency in this demo)
    if (currentUser) {
      saveChatMessage(currentUser.uid, input + (attachedFiles.length > 0 ? ` [Attached: ${attachedFiles.map(f => f.name).join(', ')}]` : ''), 'user');
    }

    try {
      const formattedMessages = newMessages.map(({ role, parts }) => ({ role, parts }));
      const response = await chatWithAI(formattedMessages);
      
      const aiMessage: Message = {
        role: 'model',
        parts: [{ text: response || 'ይቅርታ፣ ምላሽ ማግኘት አልቻልኩም።' }],
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);

      // Save AI message and increment usage
      if (currentUser) {
        await saveChatMessage(currentUser.uid, response || 'No response', 'model');
        await incrementUsage(currentUser.uid, 'chat');
      }
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: 'ስህተት ተከስቷል። እባክዎን ቆይተው እንደገና ይሞክሩ።' }],
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'model',
        parts: [{ text: 'ሰላም! እኔ የኢትዮጵያ የሕግ ረዳት ነኝ። እንዴት ልረዳዎት እችላለሁ?' }],
        timestamp: new Date(),
      },
    ]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            type: file.type,
            base64: base64.split(',')[1]
          }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="h-screen bg-midnight flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/40">
            <Scale size={32} className="text-white" />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[4px]">ፍትህ AI Loading...</span>
        </motion.div>
      </div>
    );
  }

  if (!currentUser || !profileExists) {
    return <AuthModal onSuccess={() => setProfileExists(true)} />;
  }

  return (
    <div className="flex h-screen bg-midnight text-slate-200 overflow-hidden font-sans">
      {/* Visual Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] animate-float [animation-delay:2s]" />
      </div>

      {/* Sidebar - Midnight Layout */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[280px] bg-navy border-r border-white/5 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full p-6 relative z-10">
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Scale size={18} className="text-white" />
              </div>
              <h1 className="font-bold text-[22px] tracking-tight text-white">ፍትህ AI</h1>
              <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded font-bold tracking-widest leading-normal">PRO</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-500">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto space-y-10 custom-scrollbar pr-2">
            {/* Primary Nav */}
            <div>
               <h2 className="text-[10px] uppercase tracking-[2px] text-slate-500 font-bold mb-5 ml-1">አገልግሎቶች</h2>
               <div className="space-y-2">
                 {[
                   { id: 'home', label: 'ዋና ገጽ', icon: Home },
                   { id: 'chat', label: 'ረዳት ጋር ያውሩ', icon: MessageSquare },
                   { id: 'docs', label: 'ሰነድ አዘጋጅ', icon: FileEdit },
                   { id: 'guides', label: 'መመሪያዎች', icon: FileText },
                   { id: 'analyzers', label: 'መተንተኛ', icon: Scale },
                   { id: 'market', label: 'ጠበቃ ይፈልጉ', icon: Briefcase },
                   { id: 'profile', label: 'የግል ማህደር', icon: User },
                   ...(userRole === 'admin' ? [{ id: 'admin', label: 'አስተዳዳሪ ፓነል', icon: Shield }] : [])
                 ].map(item => (
                   <button 
                    key={item.id}
                    onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all font-semibold text-[13px] relative group
                      ${activeTab === item.id 
                        ? 'bg-primary text-white shadow-xl shadow-primary/20' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                    `}
                   >
                    <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-primary transition-colors'} />
                    {item.label}
                    {activeTab === item.id && (
                      <motion.div layoutId="nav-glow" className="absolute inset-0 rounded-xl bg-primary/20 blur-md -z-10" />
                    )}
                   </button>
                 ))}
               </div>
            </div>

            {activeTab === 'chat' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-[10px] uppercase tracking-[2px] text-slate-500 font-bold mb-4 ml-1">ታዋቂ ጥያቄዎች</h2>
                  <div className="space-y-1">
                    {[
                      'የቤት ኪራይ ውል ህግ',
                      'የንግድ ምዝገባ ሂደት',
                      'የሰራተኛ ስንብት ክፍያ',
                      'የውርስ ክፍፍል ደንብ'
                    ].map((q, i) => (
                      <button 
                        key={i}
                        onClick={() => setInput(q)}
                        className={`w-full text-left p-3 text-xs rounded-lg transition-all text-slate-500 hover:text-white hover:bg-white/5`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-auto">
                  <h2 className="text-[10px] uppercase tracking-[2px] text-slate-500 font-bold mb-4 ml-1">መመሪያዎች</h2>
                  <ul className="text-xs text-slate-400 space-y-3 leading-relaxed font-medium ml-1">
                    <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
                      <div className="w-1 h-1 rounded-full bg-primary" /> የኢትዮጵያ ህገ-መንግስት
                    </li>
                    <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
                      <div className="w-1 h-1 rounded-full bg-primary" /> የፍትሐ ብሔር ሕግ
                    </li>
                    <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
                      <div className="w-1 h-1 rounded-full bg-primary" /> የወንጀለኛ መቅጫ ሕግ
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="glass rounded-[24px] p-4 flex items-center gap-4 border border-white/5">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20">
                <User size={18} className="text-primary" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[11px] font-bold text-white truncate">{currentUser.phoneNumber}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{userRole === 'admin' ? 'አስተዳዳሪ (Admin)' : 'ተጠቃሚ (User)'}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-400 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>

            <div className="pt-6 border-t border-white/5">
              <button 
                onClick={clearChat}
                className="w-full py-4 text-slate-500 hover:text-red-400 transition-all text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-red-400/5 rounded-xl"
              >
                <Trash2 size={14} />
                ውይይቱን አጥፋ (Clear)
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header - Glass Header */}
        <header className="h-[80px] flex-shrink-0 flex items-center justify-between px-10 border-b border-white/5 glass relative z-20">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-400 hover:text-white bg-white/5 rounded-xl lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-3">
               <div className="relative">
                 <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                 <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-40" />
               </div>
               <span className="font-bold text-white text-lg tracking-tight">
                  {activeTab === 'home' ? 'እንኳን ደህና መጡ' :
                   activeTab === 'chat' ? 'የህግ ረዳት' : 
                   activeTab === 'docs' ? 'ሰነድ አዘጋጅ' : 
                   activeTab === 'guides' ? 'ደረጃ-በደረጃ መመሪያ' :
                   activeTab === 'analyzers' ? 'የውል እና የውሳኔ መተንተኛ' :
                   activeTab === 'market' ? 'የጠበቆች ገበያ' :
                   activeTab === 'admin' ? 'የአስተዳዳሪ ፓነል' : 'የግል ማህደር'}
               </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-[11px] bg-primary/20 text-primary px-4 py-1.5 rounded-full font-bold border border-primary/20">ET Law</div>
             <div className="text-[11px] glass text-slate-300 px-4 py-1.5 rounded-full font-bold hidden sm:block">Amharic</div>
          </div>
        </header>

        {activeTab === 'home' ? (
          <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative z-10 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-12">
              <header className="space-y-4">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest"
                >
                  <Sparkles size={12} />
                  እንኳን ደህና መጡ ወደ ፍትህ AI
                </motion.div>
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl lg:text-6xl font-black text-white leading-tight"
                >
                  ዛሬ በምን <span className="text-primary italic">ልርዳዎት?</span>
                </motion.h1>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    id: 'chat',
                    title: 'የህግ ረዳት',
                    desc: 'ለማንኛውም የህግ ጥያቄዎች በGemini AI የታገዘ ፈጣን ምላሽ ያግኙ።',
                    icon: MessageSquare,
                    color: 'text-blue-500',
                    bg: 'bg-blue-500/10',
                    delay: 0.2
                  },
                  {
                    id: 'docs',
                    title: 'ሰነድ አዘጋጅ',
                    desc: 'ኮንትራቶች፣ ውሎች፣ የ HR ፖሊሲ እና የክስ ማመልከቻዎችን ያዘጋጁ።',
                    icon: FileEdit,
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-500/10',
                    delay: 0.3
                  },
                  {
                    id: 'guides',
                    title: 'የደረጃ-በደረጃ መመሪያዎች',
                    desc: 'ለንግድ ፈቃድ፣ ለታክስ እና ለፍርድ ቤት ሂደቶች የሚረዱ መመሪያዎች።',
                    icon: FileText,
                    color: 'text-purple-500',
                    bg: 'bg-purple-500/10',
                    delay: 0.4
                  },
                  {
                    id: 'analyzers',
                    title: 'የህግ መተንተኛ',
                    desc: 'የውል ስጋት ትንተና እና የቀረቡ ፍሬ ነገሮች መነሻ የውሳኔ ግምት።',
                    icon: Scale,
                    color: 'text-rose-500',
                    bg: 'bg-rose-500/10',
                    delay: 0.5
                  },
                  {
                    id: 'market',
                    title: 'የጠበቆች ገበያ',
                    desc: 'ታማኝ እና ልምድ ካላቸው ጠበቆች ጋር ቀጠሮ ይያዙ።',
                    icon: Briefcase,
                    color: 'text-amber-500',
                    bg: 'bg-amber-500/10',
                    delay: 0.6
                  }
                ].map((item) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: item.delay }}
                    onClick={() => setActiveTab(item.id as any)}
                    className="glass p-8 rounded-[40px] text-left border border-white/5 hover:border-primary/40 hover:scale-[1.02] active:scale-95 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <item.icon size={120} />
                    </div>
                    <div className={`w-16 h-16 rounded-2xl ${item.bg} flex items-center justify-center ${item.color} mb-8 border border-white/5`}>
                      <item.icon size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3 flex items-center gap-3">
                      {item.title}
                      <ChevronRight size={20} className="text-primary opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h3>
                    <p className="text-slate-400 font-bold leading-relaxed">{item.desc}</p>
                  </motion.button>
                ))}

                {userRole === 'admin' && (
                  <motion.button
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    onClick={() => setActiveTab('admin')}
                    className="glass p-8 rounded-[40px] text-left border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 hover:scale-[1.02] active:scale-95 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Shield size={120} />
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-8 border border-white/5">
                      <Shield size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3 flex items-center gap-3">
                      አስተዳዳሪ ፓነል
                      <ChevronRight size={20} className="text-amber-500 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h3>
                    <p className="text-slate-400 font-bold leading-relaxed">ተጠቃሚዎችን እና የአገልግሎት ሁኔታን ለማስተላለፍ።</p>
                  </motion.button>
                )}
              </div>

              <section className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[4px] text-slate-500 ml-1">በቅርብ ያሉ ጥያቄዎች</h3>
                <div className="flex flex-wrap gap-3">
                  {['የቤት ኪራይ ህግ', 'የንግድ ፋቃድ', 'የውርስ መብት', 'ፍቺ እና ንብረት'].map((q, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + (i * 0.1) }}
                      onClick={() => { setActiveTab('chat'); setInput(q); }}
                      className="px-6 py-4 rounded-2xl glass border border-white/5 text-sm font-bold text-slate-300 hover:bg-primary/20 hover:text-white transition-all"
                    >
                      {q}
                    </motion.button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : activeTab === 'chat' ? (
          <>
            {/* Message Viewport */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-10 py-12 space-y-12 custom-scrollbar relative z-10"
            >
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`
                        text-[15px] leading-[1.7] p-6 rounded-3xl
                        ${message.role === 'user' 
                          ? 'bg-navy border border-white/10 text-slate-200 rounded-tr-none' 
                          : 'glass border-l-4 border-l-primary text-slate-300 rounded-tl-none'}
                      `}>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>
                            {message.parts[0].text}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <span className="mt-2 text-[10px] text-slate-500 font-medium px-2">
                        {message.role === 'user' ? 'እርስዎ' : 'ፍትህ AI'} • {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <div className="glass p-6 rounded-2xl inline-flex gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:0.2s] shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:0.4s] shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="px-10 pb-10 flex-shrink-0 relative z-20">
              <div className="max-w-4xl mx-auto space-y-4">
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-2">
                    {attachedFiles.map((file, i) => (
                      <div key={i} className="glass pl-3 pr-1 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 group">
                        {file.type.startsWith('image/') ? <ImageIcon size={12} className="text-primary" /> : <FileText size={12} className="text-blue-400" />}
                        <span className="text-[10px] font-bold text-slate-300 max-w-[80px] truncate">{file.name}</span>
                        <button 
                          onClick={() => removeFile(i)}
                          className="p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="glass rounded-[24px] p-2 flex items-center gap-4 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/40 transition-all shadow-2xl">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                  >
                    <Paperclip size={20} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    multiple 
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="ጥያቄዎን እዚህ ይጠይቁ (Ask here in Amharic or English)..."
                    className="flex-1 bg-transparent border-none p-4 focus:outline-none text-[15px] text-white placeholder-slate-500 font-medium"
                  />
                  <button
                    onClick={handleSend}
                    disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                    className={`
                      w-12 h-12 flex items-center justify-center rounded-2xl transition-all
                      ${(input.trim() || attachedFiles.length > 0) && !isLoading 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-110 active:scale-95' 
                        : 'bg-white/5 text-slate-600 cursor-not-allowed'}
                    `}
                  >
                    <Send size={20} />
                  </button>
                </div>
                <p className="text-[10px] text-center text-slate-500 mt-5 font-bold tracking-wider uppercase opacity-60">
                  ትክክለኛ የህግ ውሳኔ ለማግኘት ጠበቃ ማማከርዎን አይርሱ።
                </p>
              </div>
            </div>
          </>
        ) : activeTab === 'docs' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
            <DocumentCreator />
          </div>
        ) : activeTab === 'guides' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
            <LegalTools mode="guide" />
          </div>
        ) : activeTab === 'analyzers' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
            <LegalTools mode="analyzer" />
          </div>
        ) : activeTab === 'market' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
            <LawyerMarketplace userId={currentUser.uid} />
          </div>
        ) : activeTab === 'admin' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
            <AdminPanel />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
            <ProfilePage />
          </div>
        )}
      </main>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-midnight/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaywall && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="absolute inset-0 bg-midnight/95 backdrop-blur-2xl"
               onClick={() => setShowPaywall(false)}
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               className="relative w-full max-w-lg glass rounded-[48px] p-12 text-center"
             >
                <div className="w-20 h-20 rounded-[32px] bg-primary/20 flex items-center justify-center mx-auto mb-8">
                  <Sparkles size={40} className="text-primary" />
                </div>
                <h3 className="text-3xl font-black text-white mb-4">ተጨማሪ ለመጠየቅ ሰብስክራይብ ያድርጉ</h3>
                <p className="text-slate-400 mb-10 leading-relaxed font-bold">
                  ለነፃ ተጠቃሚዎች የሚፈቀደው 5 ጥያቄዎች ብቻ ነው። ያልተገደበ አገልግሎት ለማግኘት በወር 200 ብር ሰብስክራይብ ያድርጉ ወይም ለአንድ ጥያቄ ብቻ 10 ብር ይክፈሉ።
                </p>
                
                <div className="space-y-4">
                   <button className="w-full py-5 bg-primary text-white rounded-3xl font-black flex items-center justify-center gap-3 hover:scale-[1.02] transition-all">
                     <Crown size={20} />
                     ያልተገደበ አገልግሎት (200 ብር/ወር)
                   </button>
                   <button className="w-full py-5 bg-white/5 text-white border border-white/10 rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-white/10 transition-all">
                     <CreditCard size={20} />
                     ለአንድ ጥያቄ ብቻ (10 ብር)
                   </button>
                   <button 
                     onClick={() => setShowPaywall(false)}
                     className="w-full py-4 text-slate-500 font-bold text-xs"
                   >
                     ተመለስ (Cancel)
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
