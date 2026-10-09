/* =========================================================
   auth.js — 4-step sign-up flow with demo OTP + photo
   ========================================================= */

(function () {
  'use strict';

  /* ---- DOM refs ---- */
  const steps = [
    document.getElementById('auth-step1'),
    document.getElementById('auth-step2'),
    document.getElementById('auth-step3'),
    document.getElementById('auth-step4'),
  ];
  const dots = document.querySelectorAll('.step-dot');
  const phone = document.getElementById('auth-phone');
  const otpInputs = document.querySelectorAll('.otp-input');
  const otpDisplay = document.getElementById('otp-display');
  const copyBtn = document.getElementById('copy-otp');
  const timerEl = document.getElementById('otp-timer');
  const status = document.getElementById('auth-status');
  const nameInput = document.getElementById('auth-name');
  const ageInput = document.getElementById('auth-age');
  const emailInput = document.getElementById('auth-email');
  const addressInput = document.getElementById('auth-address');
  const pincodeInput = document.getElementById('auth-pincode');
  const landmarkInput = document.getElementById('auth-landmark');
  const photoInput = document.getElementById('auth-photo');
  const photoPreview = document.getElementById('photo-preview');
  const photoPlaceholder = document.getElementById('photo-placeholder');
  const photoDrop = document.getElementById('photo-drop');

  let currentOTP = '';
  let timerInterval = null;
  let photoData = '';

  /* ---- Helpers ---- */
  function notify(msg, type) {
    if (!status) return;
    status.textContent = msg;
    status.className = 'toast show' + (type ? ' toast--' + type : '');
    clearTimeout(status._t);
    status._t = setTimeout(() => status.classList.remove('show'), 2800);
  }

  function goStep(n) {
    steps.forEach((s, i) => s && s.classList.toggle('active', i === n));
    dots.forEach((d, i) => {
      d.classList.toggle('active', i <= n);
      d.classList.toggle('done', i < n);
    });
  }

  function generateOTP() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  function startTimer(seconds) {
    let remaining = seconds;
    if (!timerEl) return;
    timerEl.textContent = remaining + 's';
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      remaining--;
      timerEl.textContent = remaining + 's';
      if (remaining <= 0) {
        clearInterval(timerInterval);
        timerEl.textContent = '';
      }
    }, 1000);
  }

  function validatePhone(num) {
    return /^[6-9]\d{9}$/.test(num.replace(/\s/g, ''));
  }

  function validateOTP(input) {
    return input === currentOTP;
  }

  function validateProfile() {
    const name = nameInput.value.trim();
    const age = ageInput.value.trim();
    const address = addressInput.value.trim();
    const pincode = pincodeInput.value.trim();

    if (!name || name.length < 2) {
      notify('Please enter your full name', 'error');
      nameInput.focus();
      return false;
    }
    if (!age || age < 13 || age > 120) {
      notify('Please enter a valid age (13-120)', 'error');
      ageInput.focus();
      return false;
    }
    if (!address || address.length < 10) {
      notify('Please enter a complete address', 'error');
      addressInput.focus();
      return false;
    }
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      notify('Please enter a valid 6-digit pincode', 'error');
      pincodeInput.focus();
      return false;
    }
    return true;
  }

  function saveProfile() {
    const profile = {
      name: nameInput.value.trim(),
      age: ageInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phone.value.trim(),
      address: addressInput.value.trim(),
      pincode: pincodeInput.value.trim(),
      landmark: landmarkInput.value.trim(),
      photo: photoData || (JSON.parse(localStorage.getItem('jimmi_user')||'{}').photo || ''),
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('jimmi_user', JSON.stringify(profile));
    return profile;
  }

  function handlePhotoFile(file){
    if(!file) return;
    if(!file.type.startsWith('image/')){ notify('Please select an image file', 'error'); return; }
    if(file.size > 5*1024*1024){ notify('Image too large (max 5MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e=>{
      photoData = e.target.result;
      if(photoPreview){ photoPreview.src = photoData; photoPreview.classList.remove('hide'); }
      if(photoPlaceholder) photoPlaceholder.classList.add('hide');
      notify('Photo ready — click Save', 'success');
    };
    reader.readAsDataURL(file);
  }

  /* ---- Photo upload wiring ---- */
  if(photoInput){
    photoInput.addEventListener('change', ()=> {
      if(photoInput.files[0]) handlePhotoFile(photoInput.files[0]);
    });
  }
  if(photoDrop){
    photoDrop.addEventListener('click', ()=> photoInput && photoInput.click());
    photoDrop.addEventListener('dragover', e=> { e.preventDefault(); photoDrop.classList.add('dragover'); });
    photoDrop.addEventListener('dragleave', ()=> photoDrop.classList.remove('dragover'));
    photoDrop.addEventListener('drop', e=>{
      e.preventDefault(); photoDrop.classList.remove('dragover');
      const f = e.dataTransfer.files[0];
      if(f) handlePhotoFile(f);
    });
  }

  /* ---- Step 1: Phone → OTP ---- */
  const sendBtn = document.getElementById('auth-send');
  if(sendBtn) sendBtn.addEventListener('click', () => {
    const num = phone.value.replace(/\s/g, '');
    if (!validatePhone(num)) {
      notify('Please enter a valid 10-digit mobile number', 'error');
      phone.focus();
      return;
    }
    currentOTP = generateOTP();
    if(otpDisplay) otpDisplay.textContent = currentOTP;
    startTimer(30);
    goStep(1);
    if(otpInputs[0]) otpInputs[0].focus();
    notify('OTP sent to +91 ' + num, 'success');
  });

  if(phone) phone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('auth-send').click();
  });

  /* ---- Step 2: OTP verification ---- */
  otpInputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val;
      if (val && idx < otpInputs.length - 1) {
        otpInputs[idx + 1].focus();
      }
      checkOTPComplete();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        otpInputs[idx - 1].focus();
      }
      if (e.key === 'Enter') {
        document.getElementById('auth-verify').click();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      if (paste.length >= 4) {
        otpInputs.forEach((inp, i) => { inp.value = paste[i] || ''; });
        otpInputs[3].focus();
        checkOTPComplete();
      }
    });
  });

  function checkOTPComplete() {
    const code = Array.from(otpInputs).map(i => i.value).join('');
    if (code.length === 4) {
      setTimeout(() => document.getElementById('auth-verify').click(), 200);
    }
  }

  const verifyBtn = document.getElementById('auth-verify');
  if(verifyBtn) verifyBtn.addEventListener('click', () => {
    const code = Array.from(otpInputs).map(i => i.value).join('');
    if (code.length < 4) {
      notify('Please enter the complete OTP', 'error');
      return;
    }
    if (!validateOTP(code)) {
      notify('Invalid OTP. Please try again.', 'error');
      otpInputs.forEach(i => { i.value = ''; });
      otpInputs[0].focus();
      return;
    }
    notify('OTP verified!', 'success');
    setTimeout(() => goStep(2), 500);
  });

  if(copyBtn) copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentOTP).then(() => {
      notify('OTP copied!', 'success');
    }).catch(() => {
      notify('Copy: ' + currentOTP, 'info');
    });
  });

  const resendBtn = document.getElementById('resend-otp');
  if(resendBtn) resendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    currentOTP = generateOTP();
    if(otpDisplay) otpDisplay.textContent = currentOTP;
    startTimer(30);
    otpInputs.forEach(i => { i.value = ''; });
    if(otpInputs[0]) otpInputs[0].focus();
    notify('New OTP sent!', 'success');
  });

  /* ---- Step 3: Profile completion → Go to Photo ---- */
  const completeBtn = document.getElementById('auth-complete');
  if(completeBtn) completeBtn.addEventListener('click', () => {
    if (!validateProfile()) return;
    saveProfile();
    notify('Profile saved! Now add your photo', 'success');
    setTimeout(() => goStep(3), 400);
  });

  /* ---- Step 4: Photo ---- */
  const photoSave = document.getElementById('auth-photo-save');
  const photoSkip = document.getElementById('auth-photo-skip');
  function finishWithPhoto(){
    saveProfile();
    notify('Welcome! Redirecting to store…', 'success');
    dots.forEach(d => { d.classList.add('done'); d.classList.add('success'); });
    setTimeout(() => { window.location.href = 'index.html'; }, 900);
  }
  if(photoSave) photoSave.addEventListener('click', ()=>{
    if(!photoData){
      const prev = JSON.parse(localStorage.getItem('jimmi_user')||'{}').photo;
      if(!prev) { notify('Please add a photo or skip', 'error'); return; }
    }
    finishWithPhoto();
  });
  if(photoSkip) photoSkip.addEventListener('click', ()=> finishWithPhoto());

  /* Allow Enter key on profile fields */
  [nameInput, ageInput, emailInput, addressInput, pincodeInput, landmarkInput].forEach(input => {
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('auth-complete').click();
        }
      });
    }
  });

  /* ---- Init ---- */
  goStep(0);
  if(phone) phone.focus();
})();
