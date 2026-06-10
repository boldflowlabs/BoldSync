const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'flows' });
  console.log("columns via rpc:", data, error);
  
  // Alternative: try to fetch 1 row
  const { data: row, error: rowErr } = await supabase.from('flows').select('*').limit(1);
  console.log("row:", row, rowErr);
}

main().catch(console.error);
