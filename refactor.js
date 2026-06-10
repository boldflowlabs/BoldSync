const fs = require('fs');
const path = require('path');

function processRoute(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Add getSessionOrgId import if createClient is imported from server
  if (content.includes('@/lib/supabase/server') && !content.includes('getSessionOrgId')) {
    content = content.replace(
      /import\s+\{\s*createClient\s*\}\s+from\s+['"]@\/lib\/supabase\/server['"]/,
      "import { createClient, getSessionOrgId } from '@/lib/supabase/server'"
    );
  }

  if (content.includes('supabase.auth.getUser()') && !content.includes('getSessionOrgId()')) {
    const authMatch = content.match(/if\s*\([^\{]*!user[^\)]*\)\s*\{[^}]+\}/);
    if (authMatch) {
      const orgCheck = `\n\n    const orgId = await getSessionOrgId()\n    if (!orgId) {\n      return NextResponse.json({ error: 'No active organization selected' }, { status: 400 })\n    }`;
      content = content.replace(authMatch[0], authMatch[0] + orgCheck);
    } else {
      const authMatch2 = content.match(/if\s*\([^\{]*!user[^\)]*\)\s*return[^\n]+/);
      if (authMatch2) {
        const orgCheck = `\n    const orgId = await getSessionOrgId()\n    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 400 })`;
        content = content.replace(authMatch2[0], authMatch2[0] + orgCheck);
      }
    }
  }

  // Replace .eq('user_id', user.id) with .eq('org_id', orgId)
  content = content.replace(/\.eq\(['"]user_id['"]\s*,\s*user\.id\)/g, ".eq('org_id', orgId)");
  
  // Replace insert({ user_id: user.id, ... }) with insert({ org_id: orgId, user_id: user.id, ... })
  content = content.replace(/user_id:\s*user\.id/g, 'org_id: orgId, user_id: user.id');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Processed ' + filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      processRoute(fullPath);
    }
  }
}

walk('src/app/api');
