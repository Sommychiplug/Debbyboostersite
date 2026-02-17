// js/dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/index.html';
    return;
  }

  // Check if admin (redirect to admin panel)
  if (await isAdmin(user.id)) {
    window.location.href = '/admin.html';
    return;
  }

  // Load user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  document.getElementById('user-info').innerHTML = `
    <p>Welcome, ${profile.email}</p>
    <p>Balance: ₦${profile.balance}</p>
  `;
  document.getElementById('balance').innerText = profile.balance;
  document.getElementById('referral-code').innerText = profile.referral_code;

  // Load services into dropdown
  const { data: services } = await supabase.from('services').select('*');
  const serviceSelect = document.getElementById('service');
  services.forEach(s => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = `${s.name} (₦${s.price_per_unit}/unit)`;
    serviceSelect.appendChild(option);
  });

  // Update total price when quantity or service changes
  const quantityInput = document.getElementById('quantity');
  const totalSpan = document.getElementById('total-price');
  async function updateTotal() {
    const serviceId = serviceSelect.value;
    const quantity = parseInt(quantityInput.value) || 0;
    if (serviceId && quantity) {
      const service = services.find(s => s.id == serviceId);
      if (service) {
        if (quantity < service.min_quantity || quantity > service.max_quantity) {
          totalSpan.innerText = 'Invalid quantity';
        } else {
          totalSpan.innerText = (quantity * service.price_per_unit).toFixed(2);
        }
      }
    }
  }
  serviceSelect.addEventListener('change', updateTotal);
  quantityInput.addEventListener('input', updateTotal);

  // Place order
  document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const serviceId = serviceSelect.value;
    const quantity = parseInt(quantityInput.value);
    const link = document.getElementById('link').value;
    const service = services.find(s => s.id == serviceId);
    if (quantity < service.min_quantity || quantity > service.max_quantity) {
      alert('Quantity out of range');
      return;
    }
    const total = quantity * service.price_per_unit;

    const response = await fetch('/.netlify/functions/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, service_id: serviceId, quantity, link, total })
    });
    const result = await response.json();
    if (response.ok) {
      alert('Order placed successfully!');
      location.reload();
    } else {
      alert('Error: ' + result.error);
    }
  });

  // Load orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*, services(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  const ordersDiv = document.getElementById('orders-list');
  if (orders.length === 0) {
    ordersDiv.innerHTML = 'No orders yet.';
  } else {
    ordersDiv.innerHTML = orders.map(o => `
      <div class="border-b py-2">
        <p><strong>${o.services.name}</strong> x${o.quantity} - ₦${o.total_price}</p>
        <p>Status: ${o.status} | ${new Date(o.created_at).toLocaleString()}</p>
      </div>
    `).join('');
  }

  // Withdraw bonus
  document.getElementById('withdraw-btn').addEventListener('click', async () => {
    const amount = prompt('Enter amount to withdraw (minimum ₦1000):');
    if (!amount) return;
    const response = await fetch('/.netlify/functions/withdraw-bonus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, amount: parseFloat(amount) })
    });
    const result = await response.json();
    if (response.ok) {
      alert('Withdrawal request submitted!');
    } else {
      alert('Error: ' + result.error);
    }
  });

  // Logout
  document.getElementById('logout').addEventListener('click', async () => {
    await signOut();
    window.location.href = '/index.html';
  });
});