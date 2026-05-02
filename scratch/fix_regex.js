
const fs = require('fs');
const files = [
  'components/test/TestAnalysis.tsx',
  'components/test/TestEngine.tsx',
  'components/question/QuestionViewer.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the broken regexes. 
  // Broken: /\\[([\s\S]*?)\\]/g  (2 backslashes)
  // Target: /\\\[([\s\S]*?)\\\]/g (3 backslashes)
  
  // Note: in JS strings, we need to escape the backslashes.
  // To match 2 backslashes in the file, we use 2 in the string? No, 4?
  // Let's use a simpler regex on the content.
  
  content = content.replace(/\\.replace\(\/\\\\\\\[/g, '.replace(/\\\\\\\\\['); // from 2 to 3
  // Wait, no. Let's just use exact match.
  
  const broken1 = '.replace(/\\\\\\[([\\s\\S]*?)\\\\\\]/g';
  const fixed1  = '.replace(/\\\\\\\\\\\[([\\s\\S]*?)\\\\\\\\\\\\\]/g';
  
  // This is getting confusing. 
  // Let's just use a very safe replacement.
  
  // We want to change any occurrence of /\\[ to /\\\[
  content = content.split('/\\\\\\[(').join('/\\\\\\\\\\\[(');
  content = content.split(')\\\\\\]/g').join(')\\\\\\\\\\\\\]/g');
  content = content.split('/\\\\\\((').join('/\\\\\\\\\\\\\\((');
  content = content.split(')\\\\\\)/g').join(')\\\\\\\\\\\\\\\\\\)/g');

  fs.writeFileSync(file, content);
});
