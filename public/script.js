document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('bankingForm');
  const branchSelect = document.getElementById('branch');
  const branchOtherGroup = document.getElementById('branchOtherGroup');
  const branchOtherInput = document.getElementById('branchOther');
  const alertBox = document.getElementById('alertBox');
  const submitBtn = document.getElementById('submitBtn');

  // Toggle "Other Branch" input visibility
  branchSelect.addEventListener('change', () => {
    if (branchSelect.value === 'Other') {
      branchOtherGroup.classList.remove('hidden');
      branchOtherInput.setAttribute('required', 'true');
    } else {
      branchOtherGroup.classList.add('hidden');
      branchOtherInput.removeAttribute('required');
      branchOtherInput.value = '';
      clearError(branchOtherInput);
    }
  });

  // Setup live validation on blur/input
  const inputs = form.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('invalid')) {
        validateField(input);
      }
    });
  });

  // Form submit handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    let isFormValid = true;
    inputs.forEach(input => {
      const isValid = validateField(input);
      if (!isValid) {
        isFormValid = false;
      }
    });

    if (!isFormValid) {
      showAlert('Please fix the errors before submitting. / يرجى تصحيح الأخطاء قبل الإرسال.', 'error');
      return;
    }

    // Prepare payload
    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });

    // Send payload
    try {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Submitting... / جاري الإرسال...';

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        showAlert('✓ Banking details submitted successfully! / تم إرسال تفاصيل الحساب البنكي بنجاح!', 'success');
        form.reset();
        branchOtherGroup.classList.add('hidden');
        branchOtherInput.removeAttribute('required');
        // Clear all invalid classes
        inputs.forEach(input => input.classList.remove('invalid'));
      } else {
        showAlert(`Error: ${result.error || 'Submission failed'} / فشلت العملية`, 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Connection error. Please try again. / خطأ في الاتصال، يرجى المحاولة مرة أخرى.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Submit Details / إرسال البيانات';
    }
  });

  // Field validation function
  function validateField(input) {
    const id = input.id;
    const val = input.value.trim();
    let isValid = true;
    let errorMsg = '';

    // Check required fields
    if (input.hasAttribute('required') && !val) {
      isValid = false;
      errorMsg = 'This field is required. / هذا الحقل مطلوب.';
    } else if (val) {
      // Validate English Names (letters and spaces only)
      if (['firstNameEn', 'fatherNameEn', 'grandfatherNameEn', 'familyNameEn'].includes(id)) {
        if (!/^[a-zA-Z\s]+$/.test(val)) {
          isValid = false;
          errorMsg = 'Must be in English letters only. / يجب أن يكون بحروف إنجليزية فقط.';
        }
      }
      // Validate Arabic Names (Arabic characters and spaces only)
      else if (['firstNameAr', 'fatherNameAr', 'grandfatherNameAr', 'familyNameAr'].includes(id)) {
        if (!/^[\u0600-\u06FF\s]+$/.test(val)) {
          isValid = false;
          errorMsg = 'Must be in Arabic letters only. / يجب أن يكون بحروف عربية فقط.';
        }
      }
      // Validate IBAN
      else if (id === 'iban') {
        const cleanIban = val.replace(/\s+/g, '').toUpperCase();
        if (!cleanIban.startsWith('JO')) {
          isValid = false;
          errorMsg = 'IBAN must start with JO. / يجب أن يبدأ رقم الآيبان بـ JO.';
        } else if (cleanIban.length !== 30) {
          isValid = false;
          errorMsg = `IBAN must be exactly 30 characters (Current length: ${cleanIban.length}). / يجب أن يكون 30 خانة.`;
        } else if (!/^[A-Z0-9]+$/.test(cleanIban)) {
          isValid = false;
          errorMsg = 'Must contain letters and numbers only. / يجب أن يحتوي على حروف وأرقام فقط.';
        }
      }
      // Validate SWIFT Code
      else if (id === 'swift') {
        const cleanSwift = val.replace(/\s+/g, '').toUpperCase();
        if (!/^[A-Z0-9]{8}$|^[A-Z0-9]{11}$/.test(cleanSwift)) {
          isValid = false;
          errorMsg = 'SWIFT Code must be 8 or 11 alphanumeric characters. / يجب أن يكون 8 أو 11 خانة.';
        }
      }
    }

    if (!isValid) {
      showFieldError(input, errorMsg);
    } else {
      clearError(input);
    }

    return isValid;
  }

  function showFieldError(input, msg) {
    input.classList.add('invalid');
    const errorSpan = document.getElementById(`${input.id}Error`);
    if (errorSpan) {
      errorSpan.innerText = msg;
      errorSpan.style.opacity = '1';
    }
  }

  function clearError(input) {
    input.classList.remove('invalid');
    const errorSpan = document.getElementById(`${input.id}Error`);
    if (errorSpan) {
      errorSpan.innerText = '';
      errorSpan.style.opacity = '0';
    }
  }

  function showAlert(msg, type) {
    alertBox.innerText = msg;
    alertBox.className = `alert ${type}`;
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    alertBox.className = 'alert hidden';
    alertBox.innerText = '';
  }
});
