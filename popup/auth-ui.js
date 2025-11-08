// Auth UI Handler for ChatMarker

document.addEventListener('DOMContentLoaded', function() {
  // Tab switching
  const signInTab = document.getElementById('signInTab');
  const signUpTab = document.getElementById('signUpTab');
  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');

  if (signInTab && signUpTab && signInForm && signUpForm) {
    signInTab.addEventListener('click', () => {
      signInTab.classList.add('active');
      signUpTab.classList.remove('active');
      signInForm.style.display = 'block';
      signUpForm.style.display = 'none';
      clearMessages();
    });

    signUpTab.addEventListener('click', () => {
      signUpTab.classList.add('active');
      signInTab.classList.remove('active');
      signUpForm.style.display = 'block';
      signInForm.style.display = 'none';
      clearMessages();
    });

    // Sign In Form
    signInForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('signInEmail').value;
      const password = document.getElementById('signInPassword').value;
      const submitBtn = signInForm.querySelector('button[type="submit"]');
      const btnText = submitBtn.querySelector('.btn-text');
      const btnLoader = submitBtn.querySelector('.btn-loader');

      // Show loading state
      submitBtn.disabled = true;
      btnText.style.display = 'none';
      btnLoader.style.display = 'inline-flex';

      const result = await signInWithEmail(email, password);

      // Hide loading state
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';

      if (result.success) {
        showSuccess('Signed in successfully!');
        // The auth state listener will handle UI transition
      } else {
        showError(result.error);
      }
    });

    // Sign Up Form
    signUpForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('signUpEmail').value;
      const password = document.getElementById('signUpPassword').value;
      const passwordConfirm = document.getElementById('signUpPasswordConfirm').value;
      const submitBtn = signUpForm.querySelector('button[type="submit"]');
      const btnText = submitBtn.querySelector('.btn-text');
      const btnLoader = submitBtn.querySelector('.btn-loader');

      // Validate passwords match
      if (password !== passwordConfirm) {
        showError('Passwords do not match');
        return;
      }

      // Show loading state
      submitBtn.disabled = true;
      btnText.style.display = 'none';
      btnLoader.style.display = 'inline-flex';

      const result = await signUpWithEmail(email, password);

      // Hide loading state
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';

      if (result.success) {
        showSuccess('Account created successfully!');
        // The auth state listener will handle UI transition
      } else {
        showError(result.error);
      }
    });
  }
});

function clearMessages() {
  const errorDiv = document.getElementById('authError');
  const successDiv = document.getElementById('authSuccess');

  if (errorDiv) errorDiv.style.display = 'none';
  if (successDiv) successDiv.style.display = 'none';
}
