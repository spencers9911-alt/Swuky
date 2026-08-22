
const signupModal = document.getElementById('signupModal');
const loginModal = document.getElementById('loginModal');

function openModal(modal){ modal.classList.remove('hidden'); }
function closeModal(modal){ modal.classList.add('hidden'); }

document.getElementById('signupOpen').addEventListener('click', () => openModal(signupModal));
document.getElementById('heroSignup').addEventListener('click', () => openModal(signupModal));
document.getElementById('loginOpen').addEventListener('click', () => openModal(loginModal));

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(document.getElementById(btn.dataset.close)));
});

[signupModal, loginModal].forEach(modal => {
  modal.addEventListener('click', e => {
    if(e.target === modal) closeModal(modal);
  });
});

const username = document.getElementById('username');
const previewName = document.getElementById('previewName');

username.addEventListener('input', e => {
  const clean = e.target.value.trim().replace(/\s+/g, '');
  previewName.textContent = clean ? '@' + clean : '@player';
});

document.getElementById('signupForm').addEventListener('submit', e => {
  e.preventDefault();
  document.getElementById('signupForm').classList.add('hidden');
  document.getElementById('signupSuccess').classList.remove('hidden');
});
