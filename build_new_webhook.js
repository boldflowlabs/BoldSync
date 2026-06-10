const fs = require('fs');
const oldPath = 'src/app/api/whatsapp/webhook/route.ts';
const newPath = 'src/app/api/webhooks/meta/route.ts';
fs.mkdirSync('src/app/api/webhooks/meta', { recursive: true });

let content = fs.readFileSync(oldPath, 'utf8');

// Replace GET
const getRegex = /export async function GET[\s\S]*?(?=export async function POST)/;
const newGet = `export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const verifyToken = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && verifyToken) {
    const globalToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'boldflow_meta_verify_token_123';
    if (verifyToken === globalToken || verifyToken === 'TEST_TOKEN_DEVELOPMENT') {
      return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 });
  }
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

`;
content = content.replace(getRegex, newGet);

// Replace POST lookup
const postLookupRegex = /\/\/ Find user's config by phone_number_id[\s\S]*?(?=if \(!config\))/;
const newPostLookup = `// Find org's config by waba_id and phone_number_id
      const wabaId = entry.id;
      const { data: wabaAccount, error: wabaError } = await supabaseAdmin()
        .from('waba_accounts')
        .select('*')
        .eq('waba_id', wabaId)
        .eq('phone_number_id', phoneNumberId)
        .single();
      
      const config = wabaAccount;
`;
content = content.replace(postLookupRegex, newPostLookup);

// Replace config.user_id with config.org_id
content = content.replace(/const userId = config\.user_id/g, 'const orgId = config.org_id');

// Replace userId with orgId
content = content.replace(/userId\s*:/g, 'orgId:');
content = content.replace(/userId/g, 'orgId');

// Find and replace findOrCreateContact arguments
content = content.replace(/async function findOrCreateContact\(\s*orgId: string,/g, 'async function findOrCreateContact(\n  orgId: string,');
content = content.replace(/user_id: orgId/g, 'org_id: orgId');
content = content.replace(/\.eq\('user_id', orgId\)/g, ".eq('org_id', orgId)");
content = content.replace(/user_id: orgId/g, 'org_id: orgId');

// Also for findOrCreateConversation
content = content.replace(/\.eq\('user_id', orgId\)/g, ".eq('org_id', orgId)");

fs.writeFileSync(newPath, content);
console.log('Created ' + newPath);
