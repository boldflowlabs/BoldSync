const fs = require('fs');

function refactorEngine(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace userId with orgId
  content = content.replace(/userId\s*:/g, 'orgId:');
  content = content.replace(/userId\b/g, 'orgId');

  // Replace user_id with org_id
  content = content.replace(/user_id/g, 'org_id');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Refactored ' + filePath);
  }
}

refactorEngine('src/lib/flows/engine.ts');
refactorEngine('src/lib/automations/engine.ts');
refactorEngine('src/lib/flows/meta-send.ts');
refactorEngine('src/lib/automations/meta-send.ts');
