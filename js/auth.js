// js/auth.js

async function signUp(email, password, referralCode = '') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;

  const user = data.user;
  if (user) {
    // Generate a unique referral code for the new user
    const refCode = generateReferralCode();
    // If there's a referral code, find who referred
    let referredBy = null;
    if (referralCode) {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode)
        .single();
      if (referrer) referredBy = referrer.id;
    }

    // Insert profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      referral_code: refCode,
      referred_by: referredBy,
      role: 'user',
      balance: 0,
    });
    if (profileError) throw profileError;

    // If referred, create referral record
    if (referredBy) {
      await supabase.from('referrals').insert({
        referrer_id: referredBy,
        referred_id: user.id,
      });
    }
  }
  return user;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.user;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

function generateReferralCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get current user session
async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

// Check if current user is admin
async function isAdmin(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (error) return false;
  return data.role === 'admin';
}