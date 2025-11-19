/**
 * Utility script to bulk load guideline documents into the database.
 * Use it from a one-off CLI command (e.g. `node src/modules/rag/rag.loader.js`).
 */
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../../.env');
require('dotenv').config({ path: envPath });

const ragService = require('./rag.service');

async function loadFromDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filePath = path.join(dirPath, entry.name);
    const content = fs.readFileSync(filePath, 'utf8');
    const title = path.basename(entry.name, path.extname(entry.name));

    await ragService.createGuideline({ title, content });
    console.log(`Imported guideline: ${title}`);
  }
}

if (require.main === module) {
  const baseDir = path.resolve(__dirname, '../../rag/guidelines');
  loadFromDirectory(baseDir)
    .then(() => {
      console.log('Guideline import complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
