const fs = require('fs');
const path = require('path');

function fixRoute(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // The broken pattern looks like:
  // return NextResponse.json({ error: 'Unauthorized' }
  //
  //    const orgId = await getSessionOrgId()
  //    if (!orgId) {
  //      return NextResponse.json({ error: 'No active organization selected' }, { status: 400 })
  //    }, { status: 401 })
  const brokenPattern = /return NextResponse\.json\(\{\s*error:\s*'Unauthorized'\s*\}\n\n\s*const orgId = await getSessionOrgId\(\)\n\s*if \(!orgId\) \{\n\s*return NextResponse\.json\(\{\s*error:\s*'No active organization selected'\s*\}, \{\s*status:\s*400\s*\}\)\n\s*\}, \{\s*status:\s*401\s*\}\)/g;
  
  const fix = `return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n  }\n\n  const orgId = await getSessionOrgId()\n  if (!orgId) {\n    return NextResponse.json({ error: 'No active organization selected' }, { status: 400 })\n  }`;

  content = content.replace(brokenPattern, fix);

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed ' + filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      fixRoute(fullPath);
    }
  }
}

walk('src/app/api');
