const fs = require('fs');
const JSZip = require('jszip');

async function main() {
    const data = fs.readFileSync('public/templates/Create design prototype.zip');
    const zip = await JSZip.loadAsync(data);
    let paths = [];
    zip.forEach((relPath) => paths.push(relPath));
    console.log(paths.filter(p => p.includes('vite.config')));
}
main();
