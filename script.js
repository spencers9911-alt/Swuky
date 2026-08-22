
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

const avatarModal = document.getElementById('avatarModal');
const customizeAvatarBtn = document.getElementById('customizeAvatarBtn');
const avatarMessage = document.getElementById('avatarMessage');

const avatarSkin = document.getElementById('avatarSkin');
const avatarHair = document.getElementById('avatarHair');
const avatarOutfit = document.getElementById('avatarOutfit');
const avatarCoreShape = document.getElementById('avatarCoreShape');
const avatarCoreColor = document.getElementById('avatarCoreColor');

const hairColors = {
  dark: '#171c25',
  brown: '#633f2b',
  blonde: '#d7ad5a',
  white: '#dbe4ed'
};

function applyAvatarPreview(config = {}) {
  const skin = config.skin || avatarSkin.value;
  const hair = config.hair || avatarHair.value;
  const outfit = config.outfit || avatarOutfit.value;
  const coreShape = config.coreShape || avatarCoreShape.value;
  const coreColor = config.coreColor || avatarCoreColor.value;

  document.getElementById('v1Head').style.background = skin;
  document.querySelectorAll('.v1-arm').forEach(el => el.style.background = skin);
  document.getElementById('v1Hair').style.background = hairColors[hair] || hairColors.dark;
  document.getElementById('v1Torso').style.background = outfit;

  const core = document.getElementById('v1Core');
  core.style.background = coreColor;
  core.style.boxShadow = `0 0 24px ${coreColor}`;
  core.style.borderRadius = coreShape === 'circle' ? '50%' : coreShape === 'square' ? '5px' : '5px';
  core.style.transform = coreShape === 'diamond' ? 'rotate(45deg)' : 'none';
}

[avatarSkin, avatarHair, avatarOutfit, avatarCoreShape, avatarCoreColor].forEach(el => {
  el.addEventListener('change', () => applyAvatarPreview());
});

customizeAvatarBtn.addEventListener('click', async () => {
  hideMessage(avatarMessage);
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data } = await supabaseClient
    .from('profiles')
    .select('avatar_config')
    .eq('id', user.id)
    .single();

  const cfg = data?.avatar_config || {};
  if (cfg.skin) avatarSkin.value = cfg.skin;
  if (cfg.hair) avatarHair.value = cfg.hair;
  if (cfg.outfit) avatarOutfit.value = cfg.outfit;
  if (cfg.coreShape) avatarCoreShape.value = cfg.coreShape;
  if (cfg.coreColor) avatarCoreColor.value = cfg.coreColor;

  applyAvatarPreview(cfg);
  openModal(avatarModal);
});

document.getElementById('saveAvatarBtn').addEventListener('click', async () => {
  const btn = document.getElementById('saveAvatarBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  hideMessage(avatarMessage);

  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('You need to be logged in.');

    const avatar_config = {
      version: 1,
      skin: avatarSkin.value,
      hair: avatarHair.value,
      outfit: avatarOutfit.value,
      coreShape: avatarCoreShape.value,
      coreColor: avatarCoreColor.value
    };

    const { error } = await supabaseClient
      .from('profiles')
      .update({ avatar_config })
      .eq('id', user.id);

    if (error) throw error;

    showMessage(avatarMessage, 'Avatar saved to your Swuky account.', 'success');
    avatarMessage.classList.remove('hidden');
  } catch (err) {
    showMessage(avatarMessage, err.message || 'Could not save avatar.', 'error');
    avatarMessage.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save avatar';
  }
});
