const fs = require('fs');
const JSZip = require('jszip');

async function main() {
  const data = fs.readFileSync('./public/templates/Create design prototype.zip');
  const zip = await JSZip.loadAsync(data);
  let totalSize = 0;
  
  const files = [];
  zip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir) {
      files.push({ name: relativePath, size: zipEntry._data.uncompressedSize });
    }
  });

  files.sort((a, b) => b.size - a.size);
  
  console.log("Top 10 largest files in ZIP:");
  files.slice(0, 10).forEach(f => {
      console.log(`${(f.size / 1024 / 1024).toFixed(2)} MB: ${f.name}`);
      totalSize += f.size;
  });
  console.log(`\nTotal uncompressed size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}
main();
