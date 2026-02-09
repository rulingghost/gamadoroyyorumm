import XLSX from 'xlsx';
import fs from 'fs';

const files = [
  { path: './Gamador_Meydan_A_Blok (1).xlsx', block: 'A' },
  { path: './Gamador_Meydan_B_Blok.xlsx', block: 'B' }
];

const residentMap = {};

files.forEach(file => {
  const workbook = XLSX.readFile(file.path);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  // header: 1 means headers are in the first row
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  data.forEach(row => {
    const daireNo = row['Daire'];
    const adSoyad = row['Ad Soyad'] || '';
    if (daireNo) {
      const id = `${file.block}${daireNo}`;
      residentMap[id] = adSoyad;
    }
  });
});

fs.writeFileSync('resident_data.json', JSON.stringify(residentMap, null, 2));
console.log('Successfully extracted data to resident_data.json');
