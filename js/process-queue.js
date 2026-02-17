const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

exports.handler = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  const { data: orders } = await supabase
    .from('orders')
    .select('*, services(api_service_id)')
    .eq('status', 'pending')
    .limit(10);

  for (const order of orders) {
    // Replace with your actual SMM provider API
    const apiResponse = await fetch('https://smm-api.example.com/order', {
      method: 'POST',
      headers: { 
        'API-Key': process.env.SMM_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service: order.services.api_service_id,
        quantity: order.quantity,
        link: order.target_link
      })
    });

    if (apiResponse.ok) {
      const result = await apiResponse.json();
      await supabase
        .from('orders')
        .update({ status: 'processing', api_order_id: result.order_id })
        .eq('id', order.id);
    } else {
      await supabase
        .from('orders')
        .update({ status: 'failed' })
        .eq('id', order.id);
    }
  }

  return { statusCode: 200, body: 'Processed' };
};