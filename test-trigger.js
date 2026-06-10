const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const orgId = '9f40753b-c424-4094-80d7-dc4385cb647a';
  const contactId = 'af4d48b4-be6f-484d-bf0a-6818f7d1b37d'; // From the test-automations.js output

  console.log("Testing triggerMatches logic locally...");
  
  const { data: automations } = await supabase
      .from('automations')
      .select('*')
      .eq('org_id', orgId)
      .eq('trigger_type', 'keyword_match')
      .eq('is_active', true);
      
  console.log("Automations found:", automations?.length);
  
  const ctx = { message_text: 'Hi' };
  
  for (const automation of automations) {
    let match = false;
    const cfg = automation.trigger_config;
    if (automation.trigger_type === 'keyword_match') {
      const text = (ctx?.message_text ?? '').toString();
      const haystack = cfg.case_sensitive ? text : text.toLowerCase();
      match = cfg.keywords.some((raw) => {
        const k = cfg.case_sensitive ? raw : raw.toLowerCase();
        return cfg.match_type === 'exact' ? haystack === k : haystack.includes(k);
      });
    }
  }

  console.log("Checking active flows...");
  const { data: activeFlows, error: afErr } = await supabase.from('flows').select('*').eq('org_id', orgId).eq('is_active', true);
  console.log("Active flows:", activeFlows, afErr);
  
  if (activeFlows && activeFlows.length > 0) {
    const { data: startNodes } = await supabase.from('flow_nodes').select('*').eq('flow_id', activeFlows[0].id).eq('node_type', 'start');
    console.log("Start nodes for active flow:", startNodes);
  }
}

main().catch(console.error);
