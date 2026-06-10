const fs = require('fs');

function refactorSendRoute(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Import getSessionOrgId
  if (!content.includes('getSessionOrgId')) {
    content = content.replace(
      "import { createClient } from '@/lib/supabase/server'",
      "import { createClient, getSessionOrgId } from '@/lib/supabase/server'"
    );
  }

  // Get orgId
  if (!content.includes('const orgId = await getSessionOrgId()')) {
    content = content.replace(
      /const limit = checkRateLimit\(/,
      "const orgId = await getSessionOrgId();\n    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 400 });\n\n    const limit = checkRateLimit("
    );
  }

  // Replace user.id with orgId
  content = content.replace(/\.eq\('user_id', user\.id\)/g, ".eq('org_id', orgId)");

  // Replace config lookup
  const configLookupRegex = /\.from\('whatsapp_config'\)[\s\S]*?\.single\(\)/;
  const newConfigLookup = `.from('waba_accounts')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'connected')
      .single()`;
  content = content.replace(configLookupRegex, newConfigLookup);

  // Replace token access
  content = content.replace(/decrypt\(config\.access_token\)/g, 'decrypt(config.access_token_enc)');

  // Remove legacy format upgrade
  const legacyUpgradeRegex = /\/\/ Self-heal legacy CBC[\s\S]*?}\n    }/;
  content = content.replace(legacyUpgradeRegex, '');

  // Rate limiting scope update
  content = content.replace(/checkRateLimit\(`[^`]+user\.id\}`,/g, "checkRateLimit(`send:${orgId}`,");

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Refactored ' + filePath);
  } else {
    console.log('No changes needed or could not apply to ' + filePath);
  }
}

refactorSendRoute('src/app/api/whatsapp/send/route.ts');
refactorSendRoute('src/app/api/whatsapp/send-media/route.ts');
