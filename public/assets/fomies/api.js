/* Same-origin application boundary. No mock login, provider secrets or stored identity. */
window.API = (() => {
  let csrf = null, testPreview = false;
  const changes = typeof BroadcastChannel === 'function' ? new BroadcastChannel('fomies-admin-session') : null;
  class APIError extends Error { constructor(code, status) { super(code); this.code = code; this.status = status; } }
  async function request(path, method = 'GET', data) {
    if(testPreview && method !== 'GET') throw new APIError('test_preview_read_only', 403);
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), path.includes('/engagement/refresh')?30000:path==='/api/admin/notice-assets'||path==='/api/tasks/check'||path.startsWith('/api/admin/tasks')?45000:12000);
    try {
      const response = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal,
        headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      if (!response.headers.get('Content-Type')?.includes('application/json')) throw new APIError('access_expired', response.status);
      const result = await response.json();
      if (!response.ok) { if (response.status === 401) csrf = null; throw new APIError(result.error || 'temporarily_unavailable', response.status); }
      if (path === '/api/session' || path === '/api/alias') {
        csrf = result.csrf || null;
        delete result.csrf; // Session protection stays inside this API boundary.
      }
      return result;
    } catch (error) { if (error instanceof APIError) throw error; throw new APIError('connection_unavailable', 0); }
    finally { clearTimeout(timeout); }
  }
  return Object.freeze({
    tasks: () => request('/api/tasks'),
    connectTelegram: () => request('/api/telegram/connect','POST',{}),
    confirmTelegram: () => request('/api/telegram/confirm','POST',{}),
    checkTask: data => request('/api/tasks/check','POST',data),
    telegramTestStatus: () => request('/api/admin/tasks/telegram-test'),
    testTelegram: type => request('/api/admin/tasks/telegram-test','POST',{type}),
    adminTasks: () => request('/api/admin/tasks'),
    editTask: data => request('/api/admin/tasks','POST',data),
    taskHistory: (id,kind='attempts',cursor=0) => request('/api/admin/tasks/'+encodeURIComponent(id)+'/history?kind='+encodeURIComponent(kind)+'&cursor='+encodeURIComponent(cursor)),
    caseTasks: (id,kind='attempts',cursor=0) => request('/api/admin/cases/'+encodeURIComponent(id)+'/tasks?kind='+encodeURIComponent(kind)+'&cursor='+encodeURIComponent(cursor)),
    session: () => request('/api/session'),
    referrals: () => request('/api/referrals'),
    application: () => request('/api/application'),
    saveAddresses: data => request('/api/application/addresses','POST',data),
    reviewApplication: () => request('/api/application/review'),
    submitApplication: data => request('/api/application/submit','POST',data),
    interview: () => request('/api/interview'),
    startInterview: () => request('/api/interview/start','POST',{}),
    restartInterview: data => request('/api/interview/restart','POST',data),
    advanceInterview: data => request('/api/interview/advance','POST',data),
    editWrittenInterview: data => request('/api/interview/edit-written','POST',data),
    saveInterview: data => request('/api/interview/answer','POST',data),
    editorCapabilities: () => request('/api/admin/capabilities'),
    adminAccess: () => request('/api/admin/access'),
    searchAdminAccounts: query => request('/api/admin/access/search?q='+encodeURIComponent(query)),
    saveAdminGrant: data => request('/api/admin/access/grants','POST',data),
    addNoticeAsset: data => request('/api/admin/notice-assets','POST',data),
    setNoticeMobile: (id,data) => request('/api/admin/notice-assets/'+encodeURIComponent(id)+'/mobile-update','POST',data),
    deleteNoticeAsset: (id,revision) => request('/api/admin/notice-assets/'+encodeURIComponent(id)+'/delete','POST',{revision}),
    notices: () => request('/api/public/notices'),
    adminNotices: (page=0) => request('/api/admin/notices?page='+page),
    editNotice: (id,action,data) => request('/api/admin/notices/'+encodeURIComponent(id)+'/'+encodeURIComponent(action),'POST',data),
    sceneContent: () => request('/api/public/scene-content'),
    sceneDraft: section => request('/api/admin/scene-content/'+encodeURIComponent(section)),
    editScene: (section,action,data) => request('/api/admin/scene-content/'+encodeURIComponent(section)+'/'+encodeURIComponent(action),'POST',data),
    officeContent: () => request('/api/admin/office-content'),
    validateOffice: bundle => request('/api/admin/office-content/validate','POST',{bundle}),
    saveOffice: (revision,bundle) => request('/api/admin/office-content/draft','POST',{revision,bundle}),
    publishOffice: revision => request('/api/admin/office-content/publish','POST',{revision}),
    content: () => request('/api/admin/content'),
    saveContent: data => request('/api/admin/content/draft','POST',data),
    validateContentSection: (section,items) => request('/api/admin/content/import','POST',{section,items}),
    validateContent: bundle => request('/api/admin/content/validate','POST',{bundle}),
    publishContent: data => request('/api/admin/content/publish','POST',data),
    setAvailability: data => request('/api/admin/availability','POST',data),
    testControls: () => request('/api/admin/test-controls'),
    resetCase: (id,data) => request('/api/admin/cases/'+encodeURIComponent(id)+'/reset','POST',data),
    exportCases: () => request('/api/admin/cases/export'),
    notifyReset: () => changes?.postMessage('changed'),
    setTestPreview: value => { testPreview = value === true; },
    confirmAlias: alias => request('/api/alias', 'POST', { alias }),
    fetchCase: () => request('/api/case'),
    adminCases: cursor => request('/api/admin/cases' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : '')),
    adminCase: id => request('/api/admin/cases/' + (/^D-[0-9a-f-]+$/.test(id)||/^\d{10}$/.test(id)?encodeURIComponent(id):'by-handle/'+encodeURIComponent(id.replace(/^@/,'')))),
    engagement: () => request('/api/engagement'),
    refreshEngagement: () => request('/api/engagement/refresh','POST',{}),
    adminEngagement: id => request('/api/admin/cases/'+encodeURIComponent(id)+'/engagement'),
    refreshAdminEngagement: id => request('/api/admin/cases/'+encodeURIComponent(id)+'/engagement/refresh','POST',{}),
    async connectX() {
      if(testPreview) throw new APIError('test_preview_read_only', 403);
      changes?.postMessage('changed');
      const codes = new URLSearchParams(location.search).getAll('ref');
      const referralCode = codes.length === 1 && /^[a-f0-9]{24}$/.test(codes[0]) ? codes[0] : null;
      const result = await request('/auth/x/start', 'POST', {referralCode});
      const url = new URL(result.authorizeUrl);
      if (url.origin !== 'https://x.com' || url.pathname !== '/i/oauth2/authorize') throw new APIError('login_unavailable', 503);
      csrf = null; location.assign(url.href);
    },
    async logout() {
      if(testPreview) throw new APIError('test_preview_read_only', 403);
      changes?.postMessage('changed');
      const result = await request('/auth/logout', 'POST', {}); csrf = null;
      changes?.postMessage('changed'); return result;
    },
  });
})();
