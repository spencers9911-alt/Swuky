
const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = window.SWUKY_CONFIG;
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const signupModal = document.getElementById('signupModal');
const loginModal = document.getElementById('loginModal');
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const signupMessage = document.getElementById('signupMessage');
const loginMessage = document.getElementById('loginMessage');

const loggedOutNav = document.getElementById('loggedOutNav');
const loggedInNav = document.getElementById('loggedInNav');
const navUsername = document.getElementById('navUsername');
const heroUsername = document.getElementById('heroUsername');
const heroStatus = document.getElementById('heroStatus');
const profileSection = document.getElementById('profileSection');
const profileUsername = document.getElementById('profileUsername');
const profileDisplayName = document.getElementById('profileDisplayName');
const profileJoined = document.getElementById('profileJoined');
const heroSignup = document.getElementById('heroSignup');

function openModal(modal) {
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

function showMessage(el, message, type='') {
  el.textContent = message;
  el.className = 'form-message';
  if (type) el.classList.add(type);
}

function hideMessage(el) {
  el.classList.add('hidden');
}

document.getElementById('signupOpen').addEventListener('click', () => openModal(signupModal));
document.getElementById('heroSignup').addEventListener('click', () => openModal(signupModal));
document.getElementById('loginOpen').addEventListener('click', () => openModal(loginModal));

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(document.getElementById(btn.dataset.close)));
});

[signupModal, loginModal].forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal(modal);
  });
});

function cleanUsername(value) {
  return value.trim().replace(/\s+/g, '');
}

function validUsername(username) {
  return /^[A-Za-z0-9_]{3,20}$/.test(username);
}

async function usernameExists(username) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .limit(1);

  if (error) throw error;
  return data.length > 0;
}

signupForm.addEventListener('submit', async e => {
  e.preventDefault();
  hideMessage(signupMessage);

  const username = cleanUsername(document.getElementById('signupUsername').value);
  const displayName = document.getElementById('signupDisplayName').value.trim() || username;
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const submit = document.getElementById('signupSubmit');

  if (!validUsername(username)) {
    showMessage(signupMessage, 'Username must be 3–20 characters using only letters, numbers, or underscores.', 'error');
    signupMessage.classList.remove('hidden');
    return;
  }

  submit.disabled = true;
  submit.textContent = 'Creating account...';

  try {
    if (await usernameExists(username)) {
      showMessage(signupMessage, 'That username is already taken.', 'error');
      signupMessage.classList.remove('hidden');
      return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName
        },
        emailRedirectTo: window.location.origin
      }
    });

    if (error) throw error;

    if (data.session) {
      showMessage(signupMessage, 'Account created. Welcome to Swuky.', 'success');
      signupMessage.classList.remove('hidden');
      await refreshAuthState();
      setTimeout(() => closeModal(signupModal), 700);
    } else {
      showMessage(
        signupMessage,
        'Account created. Check your email to confirm your address, then log in.',
        'success'
      );
      signupMessage.classList.remove('hidden');
    }
  } catch (err) {
    showMessage(signupMessage, err.message || 'Could not create account.', 'error');
    signupMessage.classList.remove('hidden');
  } finally {
    submit.disabled = false;
    submit.textContent = 'Create account';
  }
});

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  hideMessage(loginMessage);

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const submit = document.getElementById('loginSubmit');

  submit.disabled = true;
  submit.textContent = 'Logging in...';

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    showMessage(loginMessage, 'Logged in.', 'success');
    loginMessage.classList.remove('hidden');
    await refreshAuthState();
    setTimeout(() => closeModal(loginModal), 500);
  } catch (err) {
    showMessage(loginMessage, err.message || 'Could not log in.', 'error');
    loginMessage.classList.remove('hidden');
  } finally {
    submit.disabled = false;
    submit.textContent = 'Log in';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  await refreshAuthState();
});

document.getElementById('profileChip').addEventListener('click', () => {
  if (!profileSection.classList.contains('hidden')) {
    profileSection.scrollIntoView({ behavior: 'smooth' });
  }
});

async function loadProfile(user) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('username, display_name, created_at')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Profile load error:', error);
    return null;
  }
  return data;
}

async function refreshAuthState() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session?.user) {
    loggedOutNav.classList.remove('hidden');
    loggedInNav.classList.add('hidden');
    profileSection.classList.add('hidden');

    navUsername.textContent = '@player';
    heroUsername.textContent = '@player';
    heroStatus.textContent = 'Create an account to claim your identity.';
    heroSignup.classList.remove('hidden');
    return;
  }

  const profile = await loadProfile(session.user);
  const username = profile?.username || session.user.user_metadata?.username || 'player';
  const displayName = profile?.display_name || session.user.user_metadata?.display_name || username;

  loggedOutNav.classList.add('hidden');
  loggedInNav.classList.remove('hidden');
  profileSection.classList.remove('hidden');

  navUsername.textContent = '@' + username;
  heroUsername.textContent = '@' + username;
  heroStatus.textContent = 'Your Swuky account is live.';
  heroSignup.classList.add('hidden');

  profileUsername.textContent = '@' + username;
  profileDisplayName.textContent = displayName;

  if (profile?.created_at) {
    const d = new Date(profile.created_at);
    profileJoined.textContent = d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

supabaseClient.auth.onAuthStateChange(() => {
  refreshAuthState();
});

refreshAuthState();
