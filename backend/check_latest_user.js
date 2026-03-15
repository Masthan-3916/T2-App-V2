
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
    const { data: users, error } = await supabase.from('users').select('*').order('updated_at', { ascending: false }).limit(1);
    if (error) console.log('ERROR:', error.message);
    else console.log('LATEST_USER:', JSON.stringify(users[0]));
}
check();
