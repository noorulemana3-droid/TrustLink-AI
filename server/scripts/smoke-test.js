const base = 'http://127.0.0.1:5000/api';

async function req(method, path, body, token) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${base}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `${res.status} ${path}`);
  return data;
}

const results = [];
async function test(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: String(detail) });
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
  }
}

(async () => {
  await test('health', async () => (await req('GET', '/health')).status);
  await test('openapi-docs', async () => {
    const spec = await req('GET', '/docs.json');
    if (!spec.openapi || !spec.paths?.['/api/auth/login']) throw new Error('invalid spec');
    return Object.keys(spec.paths).length;
  });
  await test('categories', async () => (await req('GET', '/categories')).categories.length);
  await test('providers', async () => (await req('GET', '/providers?limit=5')).providers.length);

  await test('ai-recommend', async () => {
    const r = await req('POST', '/ai/recommend', {
      query: 'I need an electrician for home wiring under PKR 5000 near Johar Town',
    });
    if (!r.providers?.length) throw new Error('no providers');
    if (!r.explanation) throw new Error('no explanation');
    return `${r.providers.length} matches | city=${r.filters.city} | #1=${r.providers[0].businessName}`;
  });

  await test('providers-partial-city', async () => {
    const r = await req('GET', '/providers?city=Johar&limit=5');
    if (!r.providers?.length) throw new Error('expected Johar/area matches');
    return r.providers.length;
  });

  await test('providers-widen', async () => {
    const r = await req('GET', '/providers?city=AtlantisCityXYZ&category=electrician&limit=5');
    // Should widen away from fake city rather than hard-empty when category exists
    if (!r.providers?.length && !r.widened) {
      throw new Error('expected widened results or empty with note');
    }
    return `count=${r.providers?.length || 0} widened=${Boolean(r.widened)}`;
  });

  await test('ai-parse', async () => {
    const r = await req('POST', '/ai/parse', { query: 'plumber in Gulberg under 3000' });
    return r.filters.category;
  });

  const customer = await req('POST', '/auth/login', {
    email: 'customer@trustlink.ai',
    password: 'Customer123!',
  });
  await test('login-customer', async () => (customer.token ? 'token-ok' : 'fail'));

  await test('favorites', async () => {
    const r = await req('GET', '/favorites', null, customer.token);
    return r.favorites?.length ?? 0;
  });

  await test('pay-request', async () => {
    const list = await req('GET', '/requests/mine', null, customer.token);
    const unpaid = (list.requests || []).find(
      (r) => r.status === 'pending' && (!r.paymentStatus || r.paymentStatus === 'unpaid')
    );
    if (!unpaid) return 'no-unpaid-skip';
    const paid = await req('POST', `/requests/${unpaid._id}/pay`, { method: 'jazzcash' }, customer.token);
    if (paid.request?.paymentStatus !== 'paid') throw new Error('not marked paid');
    return paid.request.paymentRef || 'paid';
  });

  const list = await req('GET', '/providers?limit=1');
  const providerId = list.providers[0]._id;

  await test('provider-detail', async () => {
    const r = await req('GET', `/providers/${providerId}`);
    return r.provider.businessName;
  });

  await test('review-summary', async () => {
    const r = await req('GET', `/ai/reviews/${providerId}/summary`);
    if (!r.summary) throw new Error('empty summary');
    return 'summary-ok';
  });

  const provider = await req('POST', '/auth/login', {
    email: 'electrician@trustlink.ai',
    password: 'Provider123!',
  });
  await test('login-provider', async () => (provider.token ? 'token-ok' : 'fail'));

  await test('provider-profile', async () => {
    const r = await req('GET', '/providers/me/profile', null, provider.token);
    return r.provider.businessName;
  });

  await test('provider-requests', async () => {
    const r = await req('GET', '/requests/provider', null, provider.token);
    return r.requests?.length ?? 0;
  });

  const admin = await req('POST', '/auth/login', {
    email: 'admin@trustlink.ai',
    password: 'Admin123!',
  });
  await test('login-admin', async () => (admin.token ? 'token-ok' : 'fail'));

  await test('forgot-password-unknown-no-leak', async () => {
    const res = await fetch(`${base}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody-not-registered@example.com' }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.resetUrl || data.resetPath || data.previewUrl) {
      throw new Error('must not leak reset url for unknown emails');
    }
    return `${res.status}`;
  });

  await test('forgot-password-demo-link', async () => {
    const res = await fetch(`${base}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@trustlink.ai' }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status >= 400) throw new Error(data.message || `http ${res.status}`);
    if (!data.resetUrl && !data.sent) {
      throw new Error('demo reset should return a page link or send email');
    }
    return data.resetUrl ? 'on-page' : 'emailed';
  });

  await test('admin-providers', async () => {
    const r = await req('GET', '/admin/providers', null, admin.token);
    return r.providers?.length ?? r.length ?? 'ok';
  });

  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
})();
