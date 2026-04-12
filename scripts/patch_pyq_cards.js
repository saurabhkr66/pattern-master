const fs = require('fs');
const file = 'components/patterns/PatternRow.tsx';
let content = fs.readFileSync(file, 'utf8');

const START = 27659; // start of pyqs.map((pyq
const END = 30570;   // position of "))}" at end of map

const before = content.slice(0, START);
const after = content.slice(END + 3); // skip "))}"

const newPYQSection = `pyqs.map((pyq: any, i: number) => {
                               const examSlug = (pyq.exam_type || 'gate').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-cse';
                               const subSlug = (pattern.subject || pattern.topic_name || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                               const topSlug = (pattern.topic_name || 'topic').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                               const seoUrl = \`/\${examSlug}/\${subSlug}/\${topSlug}/pyq-\${pyq.id}\`;
                               return (
                               <div key={pyq.id} className="relative group/card">
                                 <button
                                   onClick={() => setSelectedPyq(pyq)}
                                   className="w-full group flex flex-col p-5 rounded-2xl border-2 border-orange-50 dark:border-white/5 bg-white dark:bg-[#111] hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/5 transition-all text-left relative overflow-hidden h-full"
                                 >
                                   <div className="flex justify-between items-start mb-3">
                                     <span className="text-[10px] font-black text-gray-200 dark:text-gray-400 group-hover:text-orange-200 transition-colors">#{i + 1}</span>
                                     <div className="flex items-center gap-1.5">
                                       {pyq.images && pyq.images.length > 0 && (
                                         <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                           🖼️ Image
                                         </span>
                                       )}
                                       <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-orange-500 text-white shadow-sm">
                                         {pyq.year}
                                       </span>
                                       <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                                         {pyq.exam_type}
                                       </span>
                                     </div>
                                   </div>
                                   <MathRenderer 
                                     content={pyq.question_text} 
                                     className="text-xs font-bold text-gray-700 dark:text-gray-300 line-clamp-3 mb-4 flex-grow" 
                                   />
                                   <div className="flex items-center justify-between mt-auto pt-3 border-t border-orange-50 dark:border-white/5">
                                     <span className="text-[9px] font-black text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Solve \u2192</span>
                                     {pyq.attempts?.[0] && (
                                       <span className={\`text-[10px] font-bold \${pyq.attempts[0].is_correct ? "text-green-500" : "text-red-400"}\`}>
                                         {pyq.attempts[0].is_correct ? "\u2713 Correct" : "\u2715 Try Again"}
                                       </span>
                                     )}
                                   </div>
                                 </button>
                                 <a
                                   href={seoUrl}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   onClick={e => e.stopPropagation()}
                                   title="Open question page"
                                   className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-white/10 z-10"
                                 >
                                   <ExternalLink size={11} className="text-gray-400 hover:text-orange-500" />
                                 </a>
                               </div>
                             );})
`;

fs.writeFileSync(file, before + newPYQSection + after, 'utf8');
console.log('✅ PYQ permalink icons added successfully');
