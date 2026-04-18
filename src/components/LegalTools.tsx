import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, TrendingUp, FileCheck, ClipboardList, Gavel, AlertTriangle, ChevronRight, Wand2, ArrowLeft, Loader2, Info, Paperclip, FileText, Image as ImageIcon, X } from 'lucide-react';
import { useLegalTool } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

type ToolId = 'risk-analyzer' | 'outcome-predictor' | 'loophole-finder' | 'property-analyzer' | 'labor-analyzer' | 'family-analyzer' | 'tax-analyzer' | 'procedural-guide' | 'court-guide';

interface Tool {
  id: ToolId;
  type: 'analyzer' | 'guide';
  title: string;
  desc: string;
  icon: any;
  color: string;
  bg: string;
  placeholder: string;
  options?: string[];
}

const TOOLS: Tool[] = [
  {
    id: 'procedural-guide',
    type: 'guide',
    title: 'ደረጃ-በደረጃ መመሪያ (Guides)',
    desc: 'የፍርድ ቤት፣ የንግድ ፈቃድ፣ የታክስ እና ለተለያዩ የመንግስት አገልግሎቶች ዝርዝር መመሪያ።',
    icon: FileCheck,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    placeholder: 'ተጨማሪ ዝርዝር ካለዎት እዚህ ይጥቀሱ...',
    options: [
      'የፍርድ ቤት ሂደት (Court Procedure)',
      'የንግድ ፈቃድ (Business Permit)',
      'የታክስ ምዝገባ (Tax Registration)',
      'የሊዝ ውል እድሳት (Lease Renewal)',
      'የስም ዝውውር (Title Transfer)',
      'የመሬት ግንኙነት (Land Services)',
      'ሌላ (Other)'
    ]
  },
  {
    id: 'risk-analyzer',
    type: 'analyzer',
    title: 'የውል ስጋት መተንተኛ',
    desc: 'ውሎችን መርምረው ያሉባቸውን ክፍተቶች እና ሊያስከትሉ የሚችሉትን ስጋቶች ይለዩ።',
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    placeholder: 'የውሉን ይዘት እዚህ ይቅዱ እና ይለጥፉ ወይም ዶክመንት ያያይዙ...'
  },
  {
    id: 'outcome-predictor',
    type: 'analyzer',
    title: 'የውሳኔ ግምት (Outcome Predictor)',
    desc: 'የቀረቡትን ፍሬ ነገሮች መነሻ በማድረግ የፍርድ ቤቱን የውሳኔ አዝማሚያ ይገምቱ።',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    placeholder: 'የክሱን ዝርዝር እና የቀረቡ ማስረጃዎችን በጥብቅ ይግለጹ...'
  },
  {
    id: 'loophole-finder',
    type: 'analyzer',
    title: 'የህግ ክፍተት መፈለጊያ',
    desc: 'በውሎች ወይም በህግ ሰነዶች ውስጥ ያሉ ክፍተቶችን እና ደካማ ነጥቦችን ይፈልጉ።',
    icon: Wand2,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    placeholder: 'ለመተንተን የሚፈልጉትን ሰነድ እዚህ ያስገቡ...'
  },
  {
    id: 'property-analyzer',
    type: 'analyzer',
    title: 'የንብረት ክርክር መተንተኛ',
    desc: 'የቤት፣ የመሬት እና ሌሎች ንብረት ነክ ክርክሮችን በህግ አግባብ ይመልከቱ።',
    icon: Shield,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    placeholder: 'ስለ ንብረቱ እና ስለ ክርክሩ ዝርዝር ሁኔታ ይግለጹ...'
  },
  {
    id: 'labor-analyzer',
    type: 'analyzer',
    title: 'የሰራተኛ ክርክሮች መተንተኛ',
    desc: 'የሰራተኛ እና አሰሪ አለመግባባቶችን በ2011 የሰራተኛ አዋጅ መሰረት ይተንትኑ።',
    icon: ClipboardList,
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    placeholder: 'ስለ ስንብት፣ ስለ ደመወዝ ወይም ስለ ሌሎች የስራ ክርክሮች ይግለጹ...'
  },
  {
    id: 'family-analyzer',
    type: 'analyzer',
    title: 'የቤተሰብ ህግ መተንተኛ',
    desc: 'የጋብቻ፣ የፍቺ እና የውርስ ክርክሮችን በተሻሻለው የቤተሰብ ህግ መሰረት ይተንትኑ።',
    icon: Shield,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    placeholder: 'ስለ ፍቺ፣ ስለ ቀለብ ወይም ስለ ውርስ ክፍፍል ዝርዝር ሁኔታ ይጥቀሱ...'
  },
  {
    id: 'tax-analyzer',
    type: 'analyzer',
    title: 'የታክስ ተገዢነት መተንተኛ',
    desc: 'ንግድዎ ያለበትን የታክስ ግዴታዎች እና ተገዢነት በኢትዮጵያ የታክስ ህጎች መሰረት ይለዩ።',
    icon: FileText,
    color: 'text-amber-600',
    bg: 'bg-amber-600/10',
    placeholder: 'ስለ ተመላሽ ታክስ፣ ስለ ተጨማሪ እሴት ታክስ (VAT) ወይም ስለ ገቢ ግብር ይግለጹ...'
  }
];

interface LegalToolsProps {
  mode?: 'analyzer' | 'guide';
}

export default function LegalTools({ mode }: LegalToolsProps) {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const filteredTools = mode ? TOOLS.filter(t => t.type === mode) : TOOLS;
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [inputData, setInputData] = useState('');
  const [result, setResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{name: string, type: string, base64?: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTitle = () => {
    if (mode === 'analyzer') return 'የህግ መተንተኛ (Analysis Tools)';
    if (mode === 'guide') return 'ደረጃ-በደረጃ መመሪያዎች (Guides)';
    return 'የላቁ የህግ መሣሪያዎች (Advanced Tools)';
  };

  const getSubTitle = () => {
    if (mode === 'analyzer') return 'የውል እና የውሳኔ መተንተኛ';
    if (mode === 'guide') return 'የንግድ፣ የታክስ እና የፍርድ ቤት መመሪያዎች';
    return 'AI የታገዘ የህግ ምርመራ እና ትንተና';
  };

  // Skip selection if only one tool in filtered list (User Feedback fix)
  React.useEffect(() => {
    if (mode && filteredTools.length === 1 && !selectedTool) {
      setSelectedTool(filteredTools[0]);
    }
  }, [mode, filteredTools, selectedTool]);

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
            base64: base64.split(',')[1] // Just the b64 data
          }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRunTool = async () => {
    if (!selectedTool || isAnalyzing) return;
    
    // For procedural-guide, input might be optional if option is picked
    if (selectedTool.id !== 'procedural-guide' && !inputData.trim() && attachedFiles.length === 0) return;
    
    setIsAnalyzing(true);
    setResult('');
    
    try {
      const combinedInput = `
        ${selectedOption ? `Option: ${selectedOption}\n` : ''}
        ${inputData}
        ${attachedFiles.length > 0 ? `\n[Attached Files: ${attachedFiles.map(f => f.name).join(', ')}]` : ''}
      `;

      // Context-aware tool ID selection
      let toolIdToSend = selectedTool.id;
      if (selectedOption === 'የፍርድ ቤት ሂደት (Court Procedure)') {
        toolIdToSend = 'court-guide';
      }

      // Pass files to AI service
      const response = await useLegalTool(toolIdToSend as any, combinedInput, attachedFiles);
      setResult(response || 'ምንም ምላሽ አልተገኘም።');
    } catch (error) {
      console.error(error);
      setResult('ስህተት ተከስቷል። እባክዎን ቆይተው እንደገና ይሞክሩ።');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getToolState = () => {
    if (selectedTool?.id === 'procedural-guide' && !selectedOption) return 'selection-guide';
    return 'input';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-12 relative z-10">
      <AnimatePresence mode="wait">
        {!selectedTool ? (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div>
              <h2 className="text-4xl font-black text-white flex items-center gap-4">
                <Wand2 className="text-primary" size={40} />
                {getTitle()}
              </h2>
              <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">{getSubTitle()}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map((tool) => (
                <motion.button
                  key={tool.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedTool(tool)}
                  className="glass p-8 rounded-[40px] text-left border border-white/5 hover:border-primary/40 transition-all group relative overflow-hidden"
                >
                  <div className={`w-14 h-14 rounded-2xl ${tool.bg} flex items-center justify-center ${tool.color} mb-6`}>
                    <tool.icon size={28} />
                  </div>
                  <h3 className="text-xl font-black text-white mb-3 flex items-center gap-2">
                    {tool.title}
                    <ChevronRight size={18} className="text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-slate-400 font-bold text-sm leading-relaxed">{tool.desc}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : getToolState() === 'selection-guide' ? (
          <motion.div
            key="guide-select"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="flex items-center justify-between">
              {filteredTools.length > 1 ? (
                <button 
                  onClick={() => setSelectedTool(null)}
                  className="flex items-center gap-2 text-primary font-black text-sm uppercase tracking-widest hover:gap-4 transition-all"
                >
                  <ArrowLeft size={18} />
                  ተመለስ
                </button>
              ) : <div />}
            </div>
            
            <div className="space-y-6">
              <h3 className="text-3xl font-black text-white">የትኛውን መመሪያ ይፈልጋሉ?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTool?.options?.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSelectedOption(opt)}
                    className="glass p-6 rounded-3xl text-left border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all group flex items-center justify-between"
                  >
                    <span className="text-white font-bold">{opt}</span>
                    <ChevronRight size={18} className="text-primary opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="active-tool"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <button 
                onClick={() => { 
                  if (selectedTool?.id === 'procedural-guide' && selectedOption) {
                    setSelectedOption(null);
                  } else {
                    setSelectedTool(null); 
                  }
                  setResult(''); 
                  setInputData('');
                  setAttachedFiles([]);
                }}
                className="flex items-center gap-2 text-primary font-black text-sm uppercase tracking-widest hover:gap-4 transition-all"
              >
                <ArrowLeft size={18} />
                {selectedTool?.id === 'procedural-guide' && selectedOption ? 'ወደ ምርጫው ተመለስ' : 'ተመለስ'}
              </button>
              <div className={`px-4 py-2 rounded-full ${selectedTool?.bg} ${selectedTool?.color} text-[10px] font-black uppercase tracking-widest border border-white/5`}>
                {selectedTool?.title} {selectedOption ? `› ${selectedOption}` : ''}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Input Side */}
              <div className="space-y-6">
                <div className="glass p-8 rounded-[40px] border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white font-black">
                      {selectedTool && React.createElement(selectedTool.icon, { size: 24, className: selectedTool.color })}
                      <span>መረጃዎችን ያስገቡ</span>
                    </div>
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 bg-white/5 hover:bg-primary/20 text-slate-400 hover:text-white rounded-2xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-white/5"
                    >
                      <Paperclip size={16} />
                      ያያይዙ (Attach)
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      multiple 
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                  </div>

                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                       {attachedFiles.map((file, i) => (
                         <div key={i} className="glass pl-4 pr-2 py-2 rounded-xl border border-white/10 flex items-center gap-2 group">
                            {file.type.startsWith('image/') ? <ImageIcon size={14} className="text-primary" /> : <FileText size={14} className="text-blue-400" />}
                            <span className="text-[10px] font-bold text-slate-300 max-w-[100px] truncate">{file.name}</span>
                            <button 
                              onClick={() => removeFile(i)}
                              className="p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                            >
                              <X size={12} />
                            </button>
                         </div>
                       ))}
                    </div>
                  )}

                  <textarea
                    value={inputData}
                    onChange={(e) => setInputData(e.target.value)}
                    placeholder={selectedTool?.placeholder}
                    className="w-full h-64 bg-navy/50 border border-white/5 rounded-3xl p-6 text-white focus:ring-2 focus:ring-primary/40 focus:outline-none font-bold resize-none custom-scrollbar"
                  />
                  <button
                    onClick={handleRunTool}
                    disabled={isAnalyzing}
                    className={`
                      w-full py-5 rounded-3xl font-black flex items-center justify-center gap-3 transition-all
                      ${(inputData.trim() || attachedFiles.length > 0 || selectedOption) && !isAnalyzing 
                        ? 'bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02]' 
                        : 'bg-white/5 text-slate-600'}
                    `}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Wand2 size={20} />
                    )}
                    {isAnalyzing ? 'በመሰናዳት ላይ...' : 'አስገባ (Submit)'}
                  </button>
                </div>

                <div className="glass p-6 rounded-3xl border border-white/5 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
                    <Info size={20} />
                  </div>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed italic">
                    ማሳሰቢያ፦ ይህ መረጃ በAI የታገዘ በመሆኑ ለውሳኔዎችዎ መነሻ እንጂ ፍጹም የህግ መመሪያ አይደለም። ለተሟላ መረጃ ጠበቃ ያማክሩ።
                  </p>
                </div>
              </div>

              {/* Output Side */}
              <div className="glass rounded-[40px] border border-white/5 flex flex-col min-h-[500px] overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">ምላሽ (Response)</span>
                  {result && (
                    <div className="flex gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500" />
                       <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">ተጠናቋል</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar prose prose-invert prose-sm max-w-none">
                  {isAnalyzing ? (
                    <div className="h-full flex flex-col items-center justify-center gap-6 text-slate-600">
                      <div className="relative">
                        <Loader2 size={48} className="animate-spin text-primary" />
                        <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
                      </div>
                      <p className="font-black text-xs uppercase tracking-widest animate-pulse">የህግ መረጃዎችን በመሰብሰብ ላይ...</p>
                    </div>
                  ) : result ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <ReactMarkdown>{result}</ReactMarkdown>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-700">
                      <FileCheck size={48} strokeWidth={1} />
                      <p className="font-bold text-sm">ውጤቱን ለማየት ጀምር የሚለውን ይጫኑ።</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
