const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("Checking waba_accounts...");
  const { data: accounts, error: accErr } = await supabase.from('waba_accounts').select('*');
  console.log("waba_accounts:", accounts, accErr);

  console.log("Checking automations...");
  const { data: automations, error: autErr } = await supabase.from('automations').select('*');
  console.log("automations:", automations, autErr);

  console.log("Checking flow_runs...");
  const { data: flows, error: flowErr } = await supabase.from('flow_runs').select('*').eq('status', 'active');
  console.log("Active flow_runs:", flows, flowErr);

  console.log("Checking logs...");
  const { data: logs, error: logErr } = await supabase.from('automation_logs').select('*').order('created_at', { ascending: false }).limit(2);
  console.log("logs:", logs, logErr);
}

main().catch(console.error);
