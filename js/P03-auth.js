// Browser-only preview. Account records, codes and login state are not a security boundary.
'use strict';

const DEMO_PHONE = '09000000000';
const session = window.NobatinoAccount;
const { PREFIX } = session;
const RESEND_DELAY = 120_000;
const CODE_LIFETIME = 300_000;
const VERIFIED_LIFETIME = 600_000;
const MAX_ATTEMPTS = 5;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;
const params = new URLSearchParams(location.search);
const returnTo = session.safeReturn(params.get('next') || document.referrer);
const LOGIN = session.authUrl('login', returnTo);
const REGISTER = session.authUrl('register', returnTo);
const DOCTOR_REGISTER = session.authUrl('register-doctor', returnTo);
const RESET = session.authUrl('reset', returnTo);
let mode = ['register', 'register-doctor', 'reset'].includes(params.get('mode')) ? params.get('mode') : 'login';
const doctorRegistration = mode === 'register-doctor';
const isRegistration = () => mode === 'register' || doctorRegistration;
let phone = '';
let step = 0; // Phone, confirmation, password.
let timer;

const $ = (selector) => document.querySelector(selector);
const flow = $('#flow');
const title = $('#flow-title');
const progress = $('#progress');
const icon = (name, className = '') => '<svg class="icon ' + className + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
const fa = (value) => String(value).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[digit]);
const ascii = (value) => value.replace(/[۰-۹٠-٩]/g, (digit) => String(digit.charCodeAt(0) & 15));
const normalizePhone = (value) => ascii(value).trim().replace(/[\s-]/g, '').replace(/^(?:\+98|0098)(?=9\d{9}$)/, '0');
const validPhone = (value) => /^09\d{9}$/.test(value);
const read = (storage, key) => JSON.parse(storage.getItem(PREFIX + key) ?? 'null');
const write = (storage, key, value) => storage.setItem(PREFIX + key, JSON.stringify(value));
const remove = (storage, key) => storage.removeItem(PREFIX + key);
const account = (number) => read(localStorage, 'account:' + number);
const codeKey = (purpose, number) => 'code:' + purpose + ':' + number;
const getCode = () => read(sessionStorage, codeKey(mode, phone));
const setCode = (challenge) => write(sessionStorage, codeKey(mode, phone), challenge);
const toHex = (bytes) => Array.from(bytes, (n) => n.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => Uint8Array.from(hex.match(/../g), (pair) => parseInt(pair, 16));

function finishSignIn(number) {
  session.signIn(number);
  location.replace(session.accountDestination(returnTo));
}

function returnIfSignedIn() {
  if (mode === 'reset' || !session.current()) return false;
  location.replace(session.accountDestination(returnTo));
  return true;
}
window.addEventListener('pageshow', (event) => { if (event.persisted) returnIfSignedIn(); });

async function digest(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600_000 }, key, 256);
  return toHex(new Uint8Array(bits));
}

const accountLock = (number, job) => navigator.locks
  ? navigator.locks.request(PREFIX + number, job)
  : job();

function issueCode() {
  const now = Date.now();
  const old = getCode();
  if (old && now < old.resendAt) return false;
  let code;
  do {
    code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
  } while (code === old?.code);
  setCode({ code, expiresAt: now + CODE_LIFETIME, resendAt: now + RESEND_DELAY, attempts: 0 });
  return true;
}

function setIntro(heading, description) {
  title.textContent = heading;
  $('#flow-description').textContent = description;
  document.title = heading + ' | نوبتینو';
}

function showError(message, field) {
  const error = $('#form-error');
  error.querySelector('span').textContent = message;
  error.hidden = false;
  if (field) {
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-errormessage', 'form-error');
    field.focus();
  }
}

function clearError() {
  const error = $('#form-error');
  error.hidden = true;
  error.querySelector('span').textContent = '';
  flow.querySelectorAll('[aria-invalid]').forEach((input) => {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-errormessage');
  });
}

const errorBox = () => '<div id="form-error" class="notice notice-error" role="alert" hidden>' + icon('info') + '<span></span></div>';
const primary = (label) => '<button class="primary" type="submit"><span>' + label + '</span>' + icon('arrow') + '</button>';
const actionLink = (url, label, centered = false) => '<div class="flow-actions' +
  (centered ? ' flow-actions-centered' : '') + '"><a class="link-action" href="' + url + '">' + label + '</a></div>';
const doctorRegistrationLink = () => mode === 'register' ? actionLink(DOCTOR_REGISTER, 'ثبت‌نام پزشکان', true) : '';
const note = (lead, url, label) => '<p class="route-note">' + lead + ' <a class="link-action" href="' + url + '">' + label + '</a></p>';
const support = (text) => '<div class="notice notice-success" role="status">' + icon('check') + '<p>' + text + '</p></div>';
const mobileField = () =>
  '<div class="field"><label for="mobile">شماره موبایل</label><div class="field-box">' + icon('phone', 'field-icon') +
  '<input id="mobile" name="username" type="tel" dir="ltr" inputmode="tel" autocomplete="' +
  (mode === 'login' ? 'username' : 'tel-national') + '" placeholder="۰۹۱۲۳۴۵۶۷۸۹" maxlength="24" required></div></div>';
const doctorField = (id, label, symbol, attributes) =>
  '<div class="field"><label for="' + id + '">' + label + '</label><div class="field-box">' + icon(symbol, 'field-icon') +
  '<input id="' + id + '" name="' + id + '" type="text" ' + attributes + ' required></div></div>';
const doctorFields = () =>
  doctorField('firstName', 'نام', 'user', 'dir="auto" autocomplete="given-name" maxlength="80"') +
  doctorField('lastName', 'نام خانوادگی', 'user', 'dir="auto" autocomplete="family-name" maxlength="80"') +
  doctorField('nationalId', 'کد ملی', 'id-card', 'dir="ltr" inputmode="numeric" autocomplete="off" maxlength="10"') +
  doctorField('medicalLicenseNumber', 'شماره پروانه پزشکی', 'id-card', 'dir="auto" autocomplete="off" maxlength="40"');
const passwordField = (id, label, autocomplete, hint = false) =>
  '<div class="field"><label for="' + id + '">' + label + '</label><div class="field-box">' + icon('lock', 'field-icon') +
  '<input id="' + id + '" name="' + id + '" type="password" dir="auto" autocomplete="' + autocomplete + '"' +
  (hint ? ' aria-describedby="password-hint"' : '') + ' maxlength="' + MAX_PASSWORD + '" required>' +
  '<button type="button" class="show-password" data-password="' + id + '" aria-label="نمایش ' + label +
  '">' + icon('eye') + '</button></div>' +
  (hint ? '<p id="password-hint" class="hint">حداقل ۸ نویسه؛ برای تست، یک رمز غیرواقعی انتخاب کنید.</p>' : '') + '</div>';

function mount(body, actions, onSubmit) {
  flow.innerHTML = '<form class="auth-form" novalidate>' + body + errorBox() + actions + '</form>';
  const form = flow.querySelector('form');
  const submit = form.querySelector('button[type=submit]');
  const label = submit.firstElementChild;
  const idle = label.textContent;
  form.addEventListener('input', clearError);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    clearError();
    submit.disabled = true;
    label.textContent = 'لطفاً کمی صبر کنید…';
    try {
      await onSubmit(form);
    } catch {
      showError('پیش‌نمایش در این مرورگر نتوانست اطلاعات را پردازش کند. صفحه را دوباره باز کنید و تلاش کنید.');
    } finally {
      submit.disabled = false;
      label.textContent = idle;
    }
  });
  form.querySelectorAll('[data-password]').forEach((button) => {
    const input = form.elements.namedItem(button.dataset.password);
    const fieldLabel = input.labels[0].textContent;
    button.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-label', (show ? 'پنهان کردن ' : 'نمایش ') + fieldLabel);
      button.innerHTML = icon(show ? 'eye-off' : 'eye');
    });
  });
  return form;
}

function renderLogin(message) {
  setIntro('ورود به نوبتینو', 'با شماره موبایل و رمز عبور وارد حساب کاربری‌تان شوید.');
  const form = mount((message ? support(message) : '') + mobileField() + passwordField('password', 'رمز عبور', 'current-password'),
    actionLink(RESET, 'رمز عبورم را فراموش کرده‌ام') +
    primary('ورود به حساب'), async (fields) => {
    const mobile = fields.elements.username;
    const password = fields.elements.password;
    const number = normalizePhone(mobile.value);
    if (!validPhone(number)) return showError('شماره موبایل را با ۰۹ و به‌صورت ۱۱ رقمی وارد کنید.', mobile);
    if (!password.value) return showError('رمز عبور را وارد کنید.', password);
    const match = await accountLock(number, async () => {
      const entry = account(number);
      return entry && await digest(password.value, fromHex(entry.salt)) === entry.digest;
    });
    if (!match) return showError('شماره موبایل یا رمز عبور درست نیست.', password);
    finishSignIn(number);
  });
  form.elements.username.value = phone;
}

function renderPhone() {
  const registering = isRegistration();
  setIntro(doctorRegistration ? 'ثبت‌نام پزشکان' : registering ? 'ساخت حساب کاربری' : 'بازیابی رمز عبور',
    registering ? 'شماره موبایل‌تان را وارد کنید تا کد تأیید دریافت کنید.'
      : 'شماره موبایلی را وارد کنید که با آن ثبت‌نام کرده‌اید.');
  const demo = '<div class="notice">' + icon('flask') +
    '<div><p><strong>حالت آزمایشی</strong> · پیامک واقعی ارسال نمی‌شود.</p><p>شمارهٔ تست: <bdi dir="ltr">' + fa(DEMO_PHONE) + '</bdi></p>' +
    '<button class="link-action" type="button" id="use-demo">استفاده از شمارهٔ تست</button></div></div>';
  const form = mount(mobileField() + demo, primary('دریافت کد تأیید') + doctorRegistrationLink(), (fields) => {
    const mobile = fields.elements.username;
    const number = normalizePhone(mobile.value);
    if (!validPhone(number)) return showError('شماره موبایل را با ۰۹ و به‌صورت ۱۱ رقمی وارد کنید.', mobile);
    if (registering && account(number)) return showError('این شماره قبلاً ثبت‌نام شده است. گزینهٔ «ورود» را انتخاب کنید.', mobile);
    if (!registering && !account(number)) return showError('با این شماره حسابی پیدا نشد. ابتدا ثبت‌نام کنید.', mobile);
    phone = number;
    const old = getCode();
    if (old?.verifiedUntil) remove(sessionStorage, codeKey(mode, phone));
    issueCode();
    write(sessionStorage, 'active:' + mode, phone);
    step = 1;
    render(true);
  });
  form.elements.username.value = phone;
  $('#use-demo').addEventListener('click', () => {
    clearError();
    form.elements.username.value = fa(DEMO_PHONE);
    form.elements.username.focus();
  });
}

function secondsText(ms) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return fa(String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0'));
}

function renderCode() {
  setIntro('تأیید شماره موبایل', doctorRegistration
    ? 'کد شش رقمی را وارد کنید تا اطلاعات پزشک و رمز عبور را ثبت کنید.'
    : 'کد شش رقمی را وارد کنید تا به مرحلهٔ تعیین رمز عبور بروید.');
  const field = '<div class="field"><label for="code">کد تأیید</label><div class="field-box">' + icon('lock', 'field-icon') +
    '<input id="code" class="otp" name="code" type="text" dir="ltr" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></div></div>';
  const inbox = '<div class="notice">' + icon('flask') + '<div><p><strong>پیامک آزمایشی</strong> برای <bdi dir="ltr">' +
    fa(phone) + '</bdi></p><p id="demo-code-line">کد تأیید: <bdi dir="ltr" id="demo-code" class="demo-code"></bdi></p>' +
    '<p id="demo-code-unavailable" hidden>برای ادامه، یک کد تازه دریافت کنید.</p></div></div>';
  const form = mount(inbox + field,
    primary('تأیید کد') + '<div class="resend-row"><button type="button" class="link-action" id="resend">ارسال دوبارهٔ کد</button>' +
    '<span class="hint" id="timer" hidden>زمان تا ارسال دوباره: <bdi dir="ltr"></bdi></span></div>' +
    '<div class="flow-actions"><button type="button" class="link-action" id="edit-phone">ویرایش شماره موبایل</button></div>' +
    '<div id="resend-status" class="notice notice-success" role="status" hidden>' + icon('check') +
    '<span>کد تازه روی همین صفحه نمایش داده شد.</span></div>', (fields) => {
    const input = fields.elements.code;
    const challenge = getCode();
    const now = Date.now();
    const code = ascii(input.value).trim();
    if (!challenge || now >= challenge.expiresAt) return showError('مهلت کد تمام شده است. یک کد تازه بگیرید.', input);
    if (challenge.attempts >= MAX_ATTEMPTS) return showError('تعداد تلاش‌ها به حد مجاز رسید. یک کد تازه بگیرید.', input);
    if (!/^\d{6}$/.test(code)) return showError('کد تأیید باید شش رقم باشد.', input);
    if (code !== challenge.code) {
      challenge.attempts += 1;
      setCode(challenge);
      updateCode();
      return showError(challenge.attempts === MAX_ATTEMPTS
        ? 'تعداد تلاش‌ها به حد مجاز رسید. یک کد تازه بگیرید.'
        : 'کد واردشده درست نیست. کد نمایش‌داده‌شده را دوباره بررسی کنید.', input);
    }
    challenge.verifiedUntil = now + VERIFIED_LIFETIME;
    delete challenge.code;
    setCode(challenge);
    step = 2;
    render(true);
  });
  const resend = $('#resend');
  const countdown = $('#timer');
  const displayedCode = $('#demo-code');
  const codeLine = $('#demo-code-line');
  const unavailable = $('#demo-code-unavailable');
  const resendStatus = $('#resend-status');

  function updateCode() {
    const challenge = getCode();
    const now = Date.now();
    const delay = (challenge?.resendAt ?? 0) - now;
    const available = Boolean(challenge?.code && challenge.expiresAt > now && challenge.attempts < MAX_ATTEMPTS);
    resend.disabled = delay > 0;
    countdown.hidden = delay <= 0;
    const nextText = secondsText(delay);
    const counter = countdown.firstElementChild;
    if (counter.textContent !== nextText) counter.textContent = nextText;
    codeLine.hidden = !available;
    unavailable.hidden = available;
    const nextCode = available ? fa(challenge.code) : '';
    if (displayedCode.textContent !== nextCode) displayedCode.textContent = nextCode;
  }
  resend.addEventListener('click', () => {
    clearError();
    if (!issueCode()) return;
    form.elements.code.value = '';
    updateCode();
    resendStatus.hidden = false;
    form.elements.code.focus();
  });
  $('#edit-phone').addEventListener('click', () => {
    remove(sessionStorage, 'active:' + mode);
    step = 0;
    render(true);
  });
  updateCode();
  timer = window.setInterval(updateCode, 250);
}

function renderPassword() {
  const registering = isRegistration();
  setIntro(doctorRegistration ? 'اطلاعات پزشک و رمز عبور' : registering ? 'تعیین رمز عبور' : 'تعیین رمز عبور جدید',
    doctorRegistration ? 'برای این پیش‌نمایش، اطلاعات آزمایشی وارد کنید و برای حسابتان رمز عبور تعیین کنید.'
      : registering ? 'برای ورودهای بعدی، یک رمز عبور برای حسابتان تعیین کنید.' : 'از این پس با رمز جدید وارد حساب شوید.');
  mount((doctorRegistration ? doctorFields() : '') + passwordField('password', 'رمز عبور', 'new-password', true) +
    passwordField('confirmation', 'تکرار رمز عبور', 'new-password'),
    primary(doctorRegistration ? 'ساخت حساب پزشک' : registering ? 'ساخت حساب' : 'ذخیرهٔ رمز جدید') +
    doctorRegistrationLink(), async (fields) => {
    const password = fields.elements.password;
    const confirmation = fields.elements.confirmation;
    if (!(getCode()?.verifiedUntil > Date.now())) {
      remove(sessionStorage, codeKey(mode, phone));
      step = 0;
      render(true);
      return showError('مهلت تعیین رمز تمام شد. دوباره شماره موبایل را تأیید کنید.');
    }
    let doctor;
    if (doctorRegistration) {
      const { firstName, lastName, nationalId, medicalLicenseNumber } = fields.elements;
      const given = firstName.value.trim();
      const family = lastName.value.trim();
      const code = ascii(nationalId.value.trim());
      const license = ascii(medicalLicenseNumber.value.trim());
      if (!given) return showError('نام را وارد کنید.', firstName);
      if (!family) return showError('نام خانوادگی را وارد کنید.', lastName);
      if (!/^\d{10}$/.test(code)) return showError('کد ملی را به‌صورت ۱۰ رقمی وارد کنید.', nationalId);
      if (!license) return showError('شماره پروانه پزشکی را وارد کنید.', medicalLicenseNumber);
      doctor = { id: 'doctor-' + toHex(crypto.getRandomValues(new Uint8Array(16))), firstName: given,
        lastName: family, nationalId: code, medicalLicenseNumber: license };
    }
    if (password.value.trim().length < MIN_PASSWORD) return showError('رمز عبور باید حداقل ۸ نویسه باشد.', password);
    if (password.value !== confirmation.value) return showError('تکرار رمز عبور با رمز واردشده یکی نیست.', confirmation);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const result = await accountLock(phone, async () => {
      const entry = account(phone);
      if (registering && entry) return 'duplicate';
      if (!registering && !entry) return 'missing';
      const passwordDigest = await digest(password.value, salt);
      write(localStorage, 'account:' + phone, { ...entry, salt: toHex(salt), digest: passwordDigest,
        ...(doctor ? { role: 'doctor', doctor } : {}) });
      return 'saved';
    });
    remove(sessionStorage, codeKey(mode, phone));
    remove(sessionStorage, 'active:' + mode);
    if (result !== 'saved') {
      step = 0;
      render(true);
      return showError(result === 'duplicate' ? 'این شماره قبلاً ثبت‌نام شده است. وارد حساب شوید.'
        : 'با این شماره حسابی پیدا نشد. ابتدا ثبت‌نام کنید.');
    }
    if (registering) return finishSignIn(phone);
    if (session.current() === phone) session.signOut();
    mode = 'login';
    step = 0;
    history.replaceState(null, '', LOGIN);
    render(true, 'رمز عبور تغییر کرد. با رمز جدید وارد شوید.');
  });
}

function render(moveFocus = false, message) {
  window.clearInterval(timer);
  const multi = mode !== 'login';
  progress.hidden = !multi;
  progress.lastElementChild.lastElementChild.textContent = doctorRegistration ? 'اطلاعات و رمز' : 'رمز عبور';
  $('#login-tab').href = LOGIN;
  $('#register-tab').href = REGISTER;
  $('#auth-back').href = returnTo;
  if (returnTo !== session.safeReturn(null)) $('#auth-back span').textContent = 'بازگشت';
  for (const [id, selected] of [['#login-tab', mode === 'login'], ['#register-tab', mode === 'register']]) {
    if (selected) $(id).setAttribute('aria-current', 'page');
    else $(id).removeAttribute('aria-current');
  }
  [...progress.children].forEach((item, index) => {
    item.toggleAttribute('data-done', index < step);
    if (index === step) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
    const badge = item.firstElementChild;
    if (index < step) badge.innerHTML = icon('check') + '<span class="visually-hidden">انجام شد</span>';
    else badge.textContent = fa(index + 1);
  });
  if (!multi) {
    renderLogin(message);
    flow.insertAdjacentHTML('beforeend', note('حساب کاربری ندارید؟', REGISTER, 'ثبت‌نام کنید'));
  } else {
    if (step === 0) renderPhone();
    else if (step === 1) renderCode();
    else renderPassword();
    flow.insertAdjacentHTML('beforeend', note(isRegistration() ? 'قبلاً ثبت‌نام کرده‌اید؟' : 'رمزتان را به یاد آوردید؟',
      LOGIN, 'به صفحهٔ ورود بروید'));
  }
  if (moveFocus) title.focus();
}

try {
  if (mode !== 'login') {
    const active = read(sessionStorage, 'active:' + mode);
    if (typeof active === 'string' && validPhone(active)) {
      phone = active;
      const challenge = getCode();
      if (challenge?.verifiedUntil > Date.now()) step = 2;
      else if (challenge && !challenge.verifiedUntil) step = 1;
    }
  }
  if (!returnIfSignedIn()) render();
} catch {
  setIntro('دسترسی به پیش‌نمایش ممکن نیست', 'ذخیره‌سازی مرورگر را برای این سایت فعال کنید و صفحه را دوباره باز کنید.');
  flow.replaceChildren();
}
