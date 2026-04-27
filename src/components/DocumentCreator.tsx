import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Download, Loader2, CheckCircle2, AlertCircle, ChevronRight, CreditCard, Sparkles, Crown } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, PageNumber, NumberFormat, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { generateDocumentContent } from '../services/gemini.ts';
import { db, auth, saveDocument, incrementUsage } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const FREE_DOC_LIMIT = 1;

const DOCUMENT_TYPES = [
  { 
    id: 'employment', 
    name: 'የሥራ ውል (Employment Contract)', 
    fields: ['የቀጣሪ ስም', 'የቀጣሪ አድራሻ/ስልክ', 'የሠራተኛ ስም', 'የሠራተኛ አድራሻ', 'የሥራ ኃላፊነት', 'ወርሃዊ ደመወዝ', 'የመጀመሪያ የሥራ ቀን', 'የውል ዘመን'] 
  },
  { 
    id: 'rent', 
    name: 'የቤት ኪራይ ውል (Rent Agreement)', 
    fields: ['የአከራይ ስም', 'የአከራይ ስልክ', 'የተከራይ ስም', 'የተከራይ ስልክ', 'የቤቱ አድራሻ', 'የቤቱ ካርታ ቁጥር', 'ወርሃዊ ኪራይ', 'የቅድመ ክፍያ (ወራት)'] 
  },
  { 
    id: 'loan', 
    name: 'የብድር ውል (Loan Agreement)', 
    fields: ['የአበዳሪ ስም', 'የተበዳሪ ስም', 'የብድሩ መጠን', 'አመታዊ ወለድ (%)', 'የመመለሻ ጊዜ', 'ዋስትና ካለ'] 
  },
  { 
    id: 'partnership', 
    name: 'የሽርክና ውል (Partnership Agreement)', 
    fields: ['የባለቤቶች ስሞች', 'የንግድ ተቋሙ ስም', 'የመጀመሪያ መዋዕለ ንዋይ', 'የትርፍ ክፍፍል ሁኔታ', 'የሥራ ክፍፍል'] 
  },
  { 
    id: 'donation', 
    name: 'የስጦታ ውል (Gift/Donation Deed)', 
    fields: ['ሰጪ (Donator)', 'ተቀባይ (Donee)', 'የሚሰጠው ንብረት', 'የንብረት ግምት', 'ምክንያት'] 
  },
  { 
    id: 'sla', 
    name: 'የአገልግሎት ደረጃ ውል (SLA)', 
    fields: ['አገልግሎት ሰጪ', 'አገልግሎት ተቀባይ', 'የአገልግሎት ዓይነት', 'የአገልግሎት ጥራት መለኪያ', 'የውል ቆይታ'] 
  },
  { 
    id: 'sales', 
    name: 'የሽያጭ ውል (Sales Agreement)', 
    fields: ['የሻጭ ስም', 'የሻጭ አድራሻ', 'የገዢ ስም', 'የገዢ አድራሻ', 'የሚሸጠው ንብረት', 'የሽያጭ ዋጋ', 'የምስክሮች ስም', 'የውል ቀን'] 
  },
  { 
    id: 'lawsuit', 
    name: 'የክስ ማመልከቻ (Lawsuit/Claim)', 
    fields: ['ከሳሽ (Plaintiff)', 'ተከሳሽ (Defendant)', 'የፍርድ ቤት ስም', 'የክሱ ምክንያት (Cause)', 'የጥያቄው ዝርዝር (Claim Detail)', 'ማስረጃዎች (Evidence)', 'ተዛማጅ አንቀጾች ካሉ'] 
  },
  { 
    id: 'terms', 
    name: 'አጠቃላይ የአጠቃቀም ደንብ (Terms and Conditions)', 
    fields: ['የድርጅቱ ስም', 'የድርጅቱ አድራሻ', 'የአገልግሎት ዓይነት', 'ኃላፊነቶች', 'ክፍያ ካለ'] 
  },
  { 
    id: 'hr-policy', 
    name: 'የሰራተኛ ፖሊሲ (HR Policy)', 
    fields: ['የድርጅቱ ስም', 'የድርጅቱ አድራሻ', 'የሥራ ዘርፍ', 'የሥራ ሰዓት', 'የዕረፍት ቀናት', 'የስነ-ምግባር ደንቦች'] 
  },
];

export default function DocumentCreator() {
  const [selectedType, setSelectedType] = useState<typeof DOCUMENT_TYPES[0] | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetCreator = () => {
    setSelectedType(null);
    setFormData({});
    setGeneratedContent(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!selectedType || !auth.currentUser) return;
    
    // Check Limits
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (!data.isSubscribed && (data.docCount || 0) >= FREE_DOC_LIMIT) {
        setShowPaywall(true);
        return;
      }
    }

    setIsGenerating(true);
    setError(null);
    try {
      const content = await generateDocumentContent(selectedType.name, formData);
      setGeneratedContent(content);
      
      // Save to history automatically
      if (auth.currentUser) {
        const title = formData[selectedType.fields[0]] || selectedType.name.split(' (')[0];
        await saveDocument(
          auth.currentUser.uid,
          title,
          selectedType.name.split(' (')[0],
          content,
          formData
        );
        await incrementUsage(auth.currentUser.uid, 'doc');
      }
    } catch (err) {
      setError('ሰነዱን ማዘጋጀት አልተቻለም። እባክዎን እንደገና ይሞክሩ።');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadWordFile = async () => {
    if (!generatedContent || !selectedType) return;

    const sections = generatedContent.split('[SIGNATURE_SECTION]');
    const mainBody = sections[0];
    const signaturePart = sections[1] || '';

    const createParagraph = (text: string, isTitle: boolean = false, isHeader: boolean = false) => {
      const cleanedText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '').trim();
      if (!cleanedText) return null;

      const isArticle = !!(cleanedText.includes('አንቀጽ') || cleanedText.match(/^[፩-፲]+[.]/));

      return new Paragraph({
        children: [
          new TextRun({
            text: cleanedText,
            bold: isTitle || isHeader || isArticle,
            size: isTitle ? 32 : (isHeader || isArticle ? 28 : 24),
            font: "Times New Roman",
          }),
        ],
        alignment: isTitle ? AlignmentType.CENTER : (isHeader ? AlignmentType.CENTER : AlignmentType.JUSTIFIED),
        spacing: {
          before: isTitle ? 600 : (isArticle ? 400 : 200),
          after: 200,
          line: 360, // 1.5 line spacing
        },
        indent: isArticle ? undefined : { firstLine: 450 },
      });
    };

    const paragraphs: Paragraph[] = [];
    
    // Process Main Body
    mainBody.split('\n').forEach((line, index) => {
      const p = createParagraph(line, index === 0);
      if (p) paragraphs.push(p);
    });

    // Process Signature Part
    if (signaturePart) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: "", break: 1 })] })); // Spacer
      
      signaturePart.split('\n').forEach(line => {
        const cleanedLine = line.trim();
        if (!cleanedLine) return;

        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: cleanedLine,
              bold: true,
              size: 24,
              font: "Times New Roman",
            }),
            new TextRun({
              text: "\n__________________________",
              size: 24,
            }),
          ],
          spacing: { before: 400, after: 400 },
        }));
      });
    } else {
      // Default signature lines if marker not found
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: "", break: 2 })] }));
      const signatoryNames = [
        formData['የአከራይ ስም'] || formData['የቀጣሪ ስም'] || formData['የአበዳሪ ስም'] || formData['የባለቤቶች ስሞች'] || 'ውል ሰጪ',
        formData['የተከራይ ስም'] || formData['የሠራተኛ ስም'] || formData['የተበዳሪ ስም'] || 'ውል ተቀባይ'
      ];
      
      signatoryNames.forEach(name => {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ text: `${name}: __________________________`, bold: true, size: 24, font: "Times New Roman" }),
          ],
          spacing: { before: 500 },
        }));
      });
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `የህግ ሰነድ - ${selectedType.name.split(' (')[0]}`,
                    size: 18,
                    color: "666666",
                    font: "Times New Roman",
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    children: ["ገጽ ", PageNumber.CURRENT, " ከ ", PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: "666666",
                    font: "Times New Roman",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: paragraphs,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${selectedType.id}_legal_document.docx`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-12 relative z-10 min-h-full flex flex-col">
      <AnimatePresence mode="wait">
        {!selectedType ? (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col"
          >
            <div className="mb-12 text-center">
              <h2 className="text-4xl font-extrabold text-text-header mb-4 tracking-tight">የሕግ ሰነዶች ማዘጋጃ</h2>
              <p className="text-text-muted max-w-2xl mx-auto text-sm leading-relaxed">አዘጋጅተው ማውረድ የሚፈልጉትን የሰነድ ዓይነት ይምረጡ።</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {DOCUMENT_TYPES.map((type, idx) => (
                <motion.button
                  key={type.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedType(type)}
                  className="glass group p-8 rounded-[32px] text-left transition-all hover:bg-bg-glass hover:scale-[1.03] border border-border-main hover:border-primary/30 relative overflow-hidden"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
                    <FileText size={24} className="text-primary group-hover:text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-text-header mb-2 leading-tight">{type.name.split(' (')[0]}</h3>
                  <p className="text-xs text-text-muted font-medium uppercase tracking-widest">{type.name.split('(')[1]?.replace(')', '') || 'Agreement'}</p>
                  <div className="mt-8 flex items-center gap-2 text-primary font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    ይምረጡ (Select) <ChevronRight size={14} />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col max-w-4xl mx-auto w-full"
          >
            <div className="flex items-center justify-between mb-10">
              <button 
                onClick={resetCreator}
                className="flex items-center gap-2 text-text-muted hover:text-text-header transition-colors group"
              >
                <ChevronRight className="rotate-180" size={18} />
                <span className="text-xs font-black uppercase tracking-widest">ወደ ምርጫ ተመለስ (Back)</span>
              </button>
              <div className="flex items-center gap-2 glass px-4 py-2 rounded-full border border-border-main">
                <FileText size={14} className="text-primary" />
                <span className="text-xs font-bold text-text-header uppercase tracking-wider">{selectedType.name.split(' (')[0]}</span>
              </div>
            </div>

            {!generatedContent ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-[40px] p-8 sm:p-12 relative overflow-hidden border border-border-main shadow-2xl"
              >
                <div className="mb-10 text-center sm:text-left">
                  <h3 className="text-2xl font-black text-text-header mb-2">መረጃዎችን ያስገቡ</h3>
                  <p className="text-text-muted text-xs font-medium italic">ሰነዱን ለማጠናቀቅ ሁሉንም ቦታዎች ይሙሉ</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <AnimatePresence mode="popLayout">
                    {selectedType.fields.map((field, idx) => (
                      <motion.div 
                        key={field}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-3 ml-1">{field}</label>
                        <input
                          type="text"
                          placeholder={`${field}...`}
                          value={formData[field] || ''}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                          className="w-full bg-bg-sidebar/80 border border-border-main rounded-2xl px-6 py-4 text-sm text-text-header placeholder-text-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="mt-12">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || selectedType.fields.some(f => !formData[f])}
                    className={`w-full py-6 rounded-[28px] font-black text-sm flex items-center justify-center gap-4 transition-all relative overflow-hidden group
                      ${isGenerating || selectedType.fields.some(f => !formData[f])
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-primary text-white hover:scale-[1.01] active:scale-[0.99] shadow-2xl shadow-primary/30'}
                    `}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        ሰነዱ እየተዘጋጀ ነው (Generating)...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={20} />
                        ሰነዱን አዘጋጅ (Generate Document)
                      </>
                    )}
                  </button>

                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-3 text-red-400 text-xs font-bold bg-red-400/10 p-5 rounded-2xl mt-6 border border-red-400/20"
                      >
                        <AlertCircle size={18} />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-[48px] p-8 sm:p-12 shadow-2xl border border-border-main"
              >
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-[20px] bg-green-500/20 flex items-center justify-center border border-green-500/10">
                      <CheckCircle2 className="text-green-500" size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-text-header leading-tight">ሰነዱ ዝግጁ ነው!</h3>
                      <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-1 opacity-70">Ready for download</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-bg-sidebar/30 border border-border-main rounded-[32px] p-8 h-[500px] overflow-y-auto mb-10 custom-scrollbar shadow-inner">
                   <pre className="whitespace-pre-wrap text-base text-text-main font-sans leading-[1.9]">
                     {generatedContent}
                   </pre>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setGeneratedContent(null)}
                    className="flex-1 bg-bg-glass text-text-header py-5 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-bg-glass/80 transition-all border border-border-main"
                  >
                    እንደገና አርም (Edit)
                  </button>
                  <button
                    onClick={downloadWordFile}
                    className="flex-[2] bg-primary text-white py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/30 group"
                  >
                    <Download size={24} />
                    ወደ Word ፋይል ቀይር (.docx)
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaywall && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="absolute inset-0 bg-bg-main/95 backdrop-blur-2xl"
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
                <h3 className="text-3xl font-black text-text-header mb-4">የነፃ ሙከራዎ ተጠናቋል</h3>
                <p className="text-text-muted mb-10 leading-relaxed font-bold">
                  ለነፃ ተጠቃሚዎች የሚፈቀደው 1 ሰነድ ብቻ ነው። ተጨማሪ ሰነዶችን ለማዘጋጀት በወር 200 ብር ሰብስክራይብ ያድርጉ ወይም ለዚህ ሰነድ ብቻ 20 ብር ይክፈሉ።
                </p>
                
                <div className="space-y-4">
                   <button className="w-full py-5 bg-primary text-white rounded-3xl font-black flex items-center justify-center gap-3 hover:scale-[1.02] transition-all">
                     <Crown size={20} />
                     ያልተገደበ አገልግሎት (200 ብር/ወር)
                   </button>
                   <button className="w-full py-5 bg-bg-glass text-text-header border border-border-main rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-bg-glass/20 transition-all">
                     <CreditCard size={20} />
                     ለዚህ ሰነድ ብቻ ክፈሉ (20 ብር)
                   </button>
                   <button 
                     onClick={() => setShowPaywall(false)}
                     className="w-full py-4 text-text-muted font-bold text-xs"
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
