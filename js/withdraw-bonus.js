const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  try {
    const { user_id, amount } = JSON.parse(event.body);
    if (amount < 1000) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Minimum withdrawal is ₦1000' }) };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user_id)
      .single();
    if (profileError || !profile) {
      return { statusCode: 400, body: JSON.stringify({ error: 'User not found' }) };
    }
    if (profile.balance < amount) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Insufficient balance' }) };
    }

    const { error: withdrawError } = await supabase
      .from('withdrawals')
      .insert({ user_id, amount });

    if (withdrawError) throw withdrawError;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};