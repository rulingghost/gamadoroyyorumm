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
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  data.forEach((row) => {
    const daireNo = row['Daire'] || row['DAİRE'] || row['no'] || row['No'];
    const adSoyad = row['Ad Soyad'] || row['AD SOYAD'] || row['İsim'] || row['Müşteri Adı'];
    
    if (daireNo && adSoyad) {
      const id = `${file.block}${daireNo}`;
      residentMap[id] = adSoyad;
    }
  });
});

fs.writeFileSync('resident_data.json', JSON.stringify(residentMap, null, 2));
fs.writeFileSync('src/residents.js', `export const residents = ${JSON.stringify(residentMap, null, 2)};`);
console.log(`Total residents found and saved: ${Object.keys(residentMap).length}`);
