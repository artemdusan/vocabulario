import { PARTS_OF_SPEECH } from '../constants';

export const parseCSV = (text) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const wordIdx = header.findIndex(h => h === 'word' || h === 'słowo');
  const classIdx = header.findIndex(h => 
    h === 'class' || h === 'partofspeech' || h === 'część mowy' || h === 'type'
  );
  
  if (wordIdx === -1) return [];
  
  return lines.slice(1)
    .map(line => {
      const cols = line.split(',').map(c => c.trim());
      const word = cols[wordIdx];
      let partOfSpeech = classIdx !== -1 ? cols[classIdx]?.toLowerCase() : 'noun';
      
      // Normalize part of speech
      if (!PARTS_OF_SPEECH.includes(partOfSpeech)) {
        partOfSpeech = 'noun';
      }
      
      return { word, partOfSpeech };
    })
    .filter(row => row.word && row.word.length > 0);
};
