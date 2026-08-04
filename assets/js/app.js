/* ==========================================================================
   Laksanasoft Corporate Payment Portal - Core JavaScript Application
   NOTE: Hardcoded Frontend Dummy Data HAS BEEN REMOVED.
   All initial datasets reside strictly on the Google Sheets Backend!
   ========================================================================== */

(function () {
  'use strict';

  // INITIAL EMPTY FALLBACK DATASETS (NO HARDCODED FRONTEND DUMMY DATA)
  const INITIAL_INVOICES = [];
  const INITIAL_PROPOSALS = [];
  const INITIAL_TRANSACTIONS = [];
  const INITIAL_NOTIFICATIONS = [];

  // PRODUCTION: SYSTEM_ROLES_DB hanya untuk Super Admin.
  // Seluruh pengguna lainnya (client, vendor, mitra) harus dibuat oleh Admin
  // melalui panel Manajemen Pengguna di /admin/ dan disimpan di Google Sheets.
  const SYSTEM_ROLES_DB = [
    {
      username: 'admin',
      password: 'admin',
      userData: {
        corpId: 'admin',
        userId: 'admin',
        name: 'Super Administrator',
        company: 'PT Laksana Software Solutions',
        role: 'Super Admin Korporat',
        roleType: 'ADMIN',
        pin: ''
      }
    }
  ];

  // --- STATE MANAGEMENT STORE ---
  const store = {
    user: {
      corpId: '',
      userId: '',
      name: '',
      company: '',
      role: '',
      isLoggedIn: false,
      pin: ''
    },
    invoices: [],
    proposals: [],
    transactions: [],
    notifications: [],
    chatMessages: [],
    currentView: 'dashboard',
    selectedInvoice: null,
    selectedProposal: null,
    paymentMethod: 'bca_va',
    enteredPin: '',
    latestReceipt: null,
    qrisTimerSeconds: 899
  };

  // --- PROPERTY NORMALIZERS ---
  function normalizeInvoice(inv) {
    if (!inv) return null;
    let parsedItems = [];
    if (Array.isArray(inv.items)) {
      parsedItems = inv.items;
    } else if (typeof inv.ItemsJSON === 'string' && inv.ItemsJSON.trim() !== '') {
      try { parsedItems = JSON.parse(inv.ItemsJSON); } catch (e) { parsedItems = []; }
    }

    return {
      id: String(inv.id || inv.InvoiceID || inv.invoiceId || ''),
      vendor: String(inv.vendor || inv.Vendor || ''),
      vendorLogo: String(inv.vendorLogo || inv.VendorLogo || 'domain'),
      category: String(inv.category || inv.Category || ''),
      issueDate: String(inv.issueDate || inv.IssueDate || ''),
      dueDate: String(inv.dueDate || inv.DueDate || ''),
      amount: Number(inv.amount || inv.Amount || 0),
      tax: Number(inv.tax || inv.Tax || 0),
      subtotal: Number(inv.subtotal || inv.Subtotal || 0),
      status: String(inv.status || inv.Status || 'UNPAID').toUpperCase(),
      description: String(inv.description || inv.Description || ''),
      items: parsedItems
    };
  }

  function normalizeProposal(quo) {
    if (!quo) return null;
    let parsedItems = [];
    let parsedHistory = [];
    if (Array.isArray(quo.items)) {
      parsedItems = quo.items;
    } else if (typeof quo.ItemsJSON === 'string' && quo.ItemsJSON.trim() !== '') {
      try { parsedItems = JSON.parse(quo.ItemsJSON); } catch (e) { parsedItems = []; }
    }
    if (Array.isArray(quo.history)) {
      parsedHistory = quo.history;
    } else if (typeof quo.HistoryJSON === 'string' && quo.HistoryJSON.trim() !== '') {
      try { parsedHistory = JSON.parse(quo.HistoryJSON); } catch (e) { parsedHistory = []; }
    }

    return {
      id: String(quo.id || quo.ProposalID || quo.proposalId || ''),
      vendor: String(quo.vendor || quo.Vendor || ''),
      vendorLogo: String(quo.vendorLogo || quo.VendorLogo || 'request_quote'),
      title: String(quo.title || quo.Title || ''),
      issueDate: String(quo.issueDate || quo.IssueDate || ''),
      validUntil: String(quo.validUntil || quo.ValidUntil || ''),
      originalPrice: Number(quo.originalPrice || quo.OriginalPrice || 0),
      counterPrice: quo.counterPrice || quo.CounterPrice ? Number(quo.counterPrice || quo.CounterPrice) : null,
      status: String(quo.status || quo.Status || 'PENDING').toUpperCase(),
      notes: String(quo.notes || quo.Notes || ''),
      items: parsedItems,
      history: parsedHistory
    };
  }

  function normalizeTransaction(trx) {
    if (!trx) return null;
    return {
      trxId: String(trx.trxId || trx.TrxID || trx.trxID || ''),
      invoiceId: String(trx.invoiceId || trx.InvoiceID || ''),
      vendor: String(trx.vendor || trx.Vendor || ''),
      amount: Number(trx.amount || trx.Amount || 0),
      date: String(trx.date || trx.Date || ''),
      method: String(trx.method || trx.Method || ''),
      status: String(trx.status || trx.Status || 'SUCCESS').toUpperCase(),
      refCode: String(trx.refCode || trx.RefCode || ''),
      driveReceiptUrl: String(trx.driveReceiptUrl || trx.DriveReceiptUrl || '')
    };
  }

  // Load / Save Store with 100% Backend Google Sheets Integration
  async function initStore() {
    let syncedWithGoogle = false;

    if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
      try {
        const remoteInvoices = await window.GoogleBackend.fetchInvoices();
        if (remoteInvoices && Array.isArray(remoteInvoices) && remoteInvoices.length > 0) {
          store.invoices = remoteInvoices.map(normalizeInvoice).filter(Boolean);
          syncedWithGoogle = true;
        }

        const remoteProposals = await window.GoogleBackend.fetchProposals();
        if (remoteProposals && Array.isArray(remoteProposals) && remoteProposals.length > 0) {
          store.proposals = remoteProposals.map(normalizeProposal).filter(Boolean);
        }

        const remoteTrx = await window.GoogleBackend.fetchTransactions();
        if (remoteTrx && Array.isArray(remoteTrx) && remoteTrx.length > 0) {
          store.transactions = remoteTrx.map(normalizeTransaction).filter(Boolean);
        }
      } catch (err) {
        console.warn("Gagal terhubung ke Google Sheets API, menggunakan penyimpanan lokal:", err);
      }
    }

    if (!syncedWithGoogle) {
      const savedInvoices = localStorage.getItem('laksanasoft_invoices');
      const rawInvoices = savedInvoices ? JSON.parse(savedInvoices) : INITIAL_INVOICES;
      store.invoices = rawInvoices.map(normalizeInvoice).filter(Boolean);
    }

    if (!store.proposals || store.proposals.length === 0) {
      const savedProposals = localStorage.getItem('laksanasoft_proposals');
      const rawProposals = savedProposals ? JSON.parse(savedProposals) : INITIAL_PROPOSALS;
      store.proposals = rawProposals.map(normalizeProposal).filter(Boolean);
    }

    if (!store.transactions || store.transactions.length === 0) {
      const savedTrx = localStorage.getItem('laksanasoft_transactions');
      const rawTrx = savedTrx ? JSON.parse(savedTrx) : INITIAL_TRANSACTIONS;
      store.transactions = rawTrx.map(normalizeTransaction).filter(Boolean);
    }

    const savedNotifs = localStorage.getItem('laksanasoft_notifications');
    store.notifications = savedNotifs ? JSON.parse(savedNotifs) : INITIAL_NOTIFICATIONS;

    const savedUser = localStorage.getItem('laksanasoft_global_session') || localStorage.getItem('laksanasoft_user');
    if (savedUser) {
      try {
        const uData = JSON.parse(savedUser);
        if (uData.roleType === 'ADMIN' || (uData.userId && uData.userId.toLowerCase() === 'admin')) {
          localStorage.removeItem('laksanasoft_global_session');
          localStorage.removeItem('laksanasoft_user');
          store.user.isLoggedIn = false;
        } else {
          store.user = uData;
          store.user.isLoggedIn = true;
        }
      } catch (e) {
        store.user.isLoggedIn = false;
      }
    } else {
      store.user.isLoggedIn = false;
    }
  }

  function saveStore() {
    localStorage.setItem('laksanasoft_invoices', JSON.stringify(store.invoices));
    localStorage.setItem('laksanasoft_proposals', JSON.stringify(store.proposals));
    localStorage.setItem('laksanasoft_transactions', JSON.stringify(store.transactions));
    localStorage.setItem('laksanasoft_notifications', JSON.stringify(store.notifications));
    localStorage.setItem('laksanasoft_user', JSON.stringify(store.user));
    localStorage.setItem('laksanasoft_global_session', JSON.stringify(store.user));
  }

  // --- HELPERS ---
  function formatIDR(val) {
    const num = Number(val);
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  }

  function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    const msgEl = document.getElementById('toast-message');
    const iconEl = document.getElementById('toast-icon');

    msgEl.textContent = msg;
    if (type === 'success') {
      iconEl.textContent = 'check_circle';
      toast.className = 'fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-emerald-700 text-white px-5 py-3.5 rounded-xl shadow-xl transition-all duration-300 transform translate-y-0 opacity-100';
    } else if (type === 'error') {
      iconEl.textContent = 'error';
      toast.className = 'fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-rose-700 text-white px-5 py-3.5 rounded-xl shadow-xl transition-all duration-300 transform translate-y-0 opacity-100';
    } else {
      iconEl.textContent = 'info';
      toast.className = 'fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-xl transition-all duration-300 transform translate-y-0 opacity-100';
    }

    setTimeout(() => {
      toast.classList.add('translate-y-10', 'opacity-0');
    }, 4000);
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }

  // --- ROUTER / VIEW NAVIGATION ---
  function navigateTo(viewName, params = {}) {
    closeMobileSidebar();

    if (!store.user.isLoggedIn && viewName !== 'login') {
      viewName = 'login';
    }

    store.currentView = viewName;

    if (params.invoiceId) {
      store.selectedInvoice = store.invoices.find(inv => inv.id === params.invoiceId) || store.invoices[0];
    }
    if (params.proposalId) {
      store.selectedProposal = store.proposals.find(p => p.id === params.proposalId) || store.proposals[0];
    }

    const loginLayout = document.getElementById('view-login');
    const mainAppLayout = document.getElementById('main-app-layout');

    if (viewName === 'login') {
      if (loginLayout) loginLayout.classList.remove('hidden');
      if (mainAppLayout) mainAppLayout.classList.add('hidden');
      return;
    } else {
      if (loginLayout) loginLayout.classList.add('hidden');
      if (mainAppLayout) mainAppLayout.classList.remove('hidden');
    }

    const views = document.querySelectorAll('.app-view');
    views.forEach(v => v.classList.add('hidden'));

    const navItems = document.querySelectorAll('.nav-link');
    navItems.forEach(n => {
      n.classList.remove('bg-primary', 'text-white', 'dark:bg-primary-container');
      n.classList.add('text-on-surface-variant', 'hover:bg-surface-container');
      if (n.dataset.view === viewName) {
        n.classList.remove('text-on-surface-variant', 'hover:bg-surface-container');
        n.classList.add('bg-primary', 'text-white', 'dark:bg-primary-container');
      }
    });

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.classList.remove('hidden');
      targetView.classList.add('view-slide-in');
    }

    renderCurrentViewContent(viewName);
    updateNotificationBadges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderCurrentViewContent(viewName) {
    switch (viewName) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'proposals':
        renderProposalsPage();
        break;
      case 'invoice-detail':
        renderInvoiceDetail();
        break;
      case 'payment-confirm':
        renderPaymentConfirm();
        break;
      case 'payment-qr':
        renderPaymentQR();
        break;
      case 'payment-processing':
        renderProcessingState();
        break;
      case 'receipt':
        renderReceipt();
        break;
      case 'history':
        renderHistory();
        break;
      case 'notifications':
        renderNotificationsPage();
        break;
      case 'profile':
        renderProfile();
        break;
      case 'support':
        renderSupportChat();
        break;
    }
  }

  // --- 1. DASHBOARD VIEW ---
  function renderDashboard() {
    let unpaidTotal = 0;
    let unpaidCount = 0;
    let paidTotal = 0;
    let paidCount = 0;

    store.invoices.forEach(inv => {
      if (inv.status === 'UNPAID' || inv.status === 'OVERDUE') {
        unpaidTotal += (inv.amount || 0);
        unpaidCount++;
      } else if (inv.status === 'PAID') {
        paidTotal += (inv.amount || 0);
        paidCount++;
      }
    });

    const unpaidStatEl = document.getElementById('stat-unpaid-total');
    const unpaidCountEl = document.getElementById('stat-unpaid-count');
    const paidStatEl = document.getElementById('stat-paid-total');
    const paidCountEl = document.getElementById('stat-paid-count');

    if (unpaidStatEl) unpaidStatEl.textContent = formatIDR(unpaidTotal);
    if (unpaidCountEl) unpaidCountEl.textContent = `${unpaidCount} Tagihan Belum Dibayar`;
    if (paidStatEl) paidStatEl.textContent = formatIDR(paidTotal);
    if (paidCountEl) paidCountEl.textContent = `${paidCount} Tagihan Terbayar (Bulan Ini)`;

    renderInvoiceTable();
  }

  function renderInvoiceTable(filterStatus = 'ALL', searchQuery = '') {
    const tableBody = document.getElementById('dashboard-invoice-table-body');
    if (!tableBody) return;

    let filtered = store.invoices;

    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(i => i.status === filterStatus);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => i.id.toLowerCase().includes(q) || i.vendor.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-12 text-center text-on-surface-variant">
            <span class="material-symbols-outlined text-4xl mb-2 text-outline">search_off</span>
            <p class="font-medium">Tidak ada tagihan yang sesuai dengan kriteria pencarian.</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map(inv => {
      let statusBadge = '';
      if (inv.status === 'UNPAID') {
        statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Belum Bayar</span>`;
      } else if (inv.status === 'OVERDUE') {
        statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300"><span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Jatuh Tempo</span>`;
      } else {
        statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> LUNAS</span>`;
      }

      return `
        <tr class="border-b border-surface-container-high hover:bg-surface-container-low transition-colors duration-150 group">
          <td class="px-6 py-4 font-semibold text-primary dark:text-on-primary-container cursor-pointer" onclick="app.viewInvoice('${inv.id}')">
            ${inv.id}
          </td>
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary dark:text-secondary">
                <span class="material-symbols-outlined">${inv.vendorLogo || 'domain'}</span>
              </div>
              <div>
                <p class="font-semibold text-on-surface text-sm">${inv.vendor}</p>
                <p class="text-xs text-on-surface-variant">${inv.category}</p>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 text-xs text-on-surface-variant">
            <div>Jatuh Tempo: <span class="font-medium text-on-surface">${inv.dueDate}</span></div>
            <div class="text-[11px]">Diterbitkan: ${inv.issueDate}</div>
          </td>
          <td class="px-6 py-4 text-right font-bold text-on-surface">
            ${formatIDR(inv.amount)}
          </td>
          <td class="px-6 py-4 text-center">
            ${statusBadge}
          </td>
          <td class="px-6 py-4 text-right">
            <div class="flex items-center justify-end gap-2">
              <button onclick="app.viewInvoice('${inv.id}')" class="px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-container rounded-lg transition-colors">
                Detail
              </button>
              ${inv.status !== 'PAID' ? `
                <button onclick="app.startPayment('${inv.id}')" class="px-3.5 py-1.5 text-xs font-semibold bg-primary text-white hover:bg-primary-container rounded-lg transition-colors shadow-sm flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">payments</span> Bayar
                </button>
              ` : `
                <button onclick="app.viewReceiptByInv('${inv.id}')" class="px-3.5 py-1.5 text-xs font-semibold bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg transition-colors flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">receipt_long</span> Resi
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- 2. PROPOSALS & NEGOTIATION VIEW ---
  function renderProposalsPage(filterStatus = 'ALL') {
    const container = document.getElementById('proposals-list-container');
    if (!container) return;

    let filtered = store.proposals;
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="p-12 text-center text-on-surface-variant bg-surface-container-lowest dark:bg-surface-container-low rounded-2xl border border-surface-container-high">
          <span class="material-symbols-outlined text-4xl mb-2 text-outline">assignment_late</span>
          <p class="font-bold">Tidak ada penawaran quotation pada kategori ini.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(quo => {
      let statusBadge = '';
      if (quo.status === 'PENDING') {
        statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span> Menunggu Persetujuan</span>`;
      } else if (quo.status === 'NEGOTIATING') {
        statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span> Dalam Negosiasi</span>`;
      } else if (quo.status === 'APPROVED') {
        statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1"><span class="material-symbols-outlined text-sm">check_circle</span> Disetujui</span>`;
      } else if (quo.status === 'REJECTED') {
        statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1"><span class="material-symbols-outlined text-sm">cancel</span> Ditolak</span>`;
      }

      return `
        <div class="bg-surface-container-lowest dark:bg-surface-container-low rounded-2xl border border-surface-container-high p-6 card-shadow space-y-5">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-surface-container pb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-surface-container text-primary flex items-center justify-center font-bold">
                <span class="material-symbols-outlined">${quo.vendorLogo || 'request_quote'}</span>
              </div>
              <div>
                <span class="text-[11px] font-bold text-secondary uppercase tracking-wider">${quo.id} • ${quo.vendor}</span>
                <h3 class="text-base font-extrabold text-on-surface mt-0.5">${quo.title}</h3>
              </div>
            </div>
            <div>${statusBadge}</div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-surface-container-low dark:bg-surface-container text-xs">
            <div>
              <span class="text-on-surface-variant block">Harga Penawaran Awal:</span>
              <span class="font-extrabold text-sm text-primary dark:text-on-primary-container">${formatIDR(quo.originalPrice)}</span>
            </div>
            <div>
              <span class="text-on-surface-variant block">Harga Negosiasi / Balik:</span>
              <span class="font-extrabold text-sm ${quo.counterPrice ? 'text-secondary' : 'text-outline'}">
                ${quo.counterPrice ? formatIDR(quo.counterPrice) : 'Belum Ada'}
              </span>
            </div>
            <div>
              <span class="text-on-surface-variant block">Berlaku Hingga:</span>
              <span class="font-bold text-on-surface">${quo.validUntil}</span>
            </div>
          </div>

          <div class="space-y-2 text-xs">
            <p class="font-bold text-on-surface-variant uppercase text-[10px]">Rincian Item Penawaran:</p>
            <ul class="divide-y divide-surface-container">
              ${quo.items.map(it => `
                <li class="py-2 flex justify-between">
                  <span class="text-on-surface font-medium">${it.name} (x${it.qty})</span>
                  <span class="font-bold text-on-surface">${formatIDR(it.qty * it.price)}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          ${quo.notes ? `<p class="text-xs text-on-surface-variant bg-surface p-3 rounded-lg border border-surface-container italic">"${quo.notes}"</p>` : ''}

          ${quo.history && quo.history.length > 0 ? `
            <div class="text-[11px] space-y-1.5 pt-2 border-t border-surface-container">
              <span class="font-bold text-on-surface-variant">Catatan Riwayat Negosiasi:</span>
              ${quo.history.map(h => `<div class="text-on-surface"><strong class="text-secondary">${h.sender}:</strong> ${h.text} <span class="text-outline">(${h.time})</span></div>`).join('')}
            </div>
          ` : ''}

          <div class="pt-4 border-t border-surface-container flex flex-wrap items-center justify-end gap-3">
            ${quo.status === 'PENDING' || quo.status === 'NEGOTIATING' ? `
              <button onclick="app.openRejectModal('${quo.id}')" class="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                Tolak Penawaran
              </button>
              <button onclick="app.openNegotiateModal('${quo.id}')" class="px-4 py-2 text-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl transition-colors flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">forum</span> Ajukan Negosiasi
              </button>
              <button onclick="app.approveProposal('${quo.id}')" class="px-5 py-2 text-xs font-bold bg-primary text-white hover:bg-primary-container rounded-xl shadow-md transition-all flex items-center gap-1.5">
                <span class="material-symbols-outlined text-sm">check_circle</span> Setujui & Buat Tagihan
              </button>
            ` : quo.status === 'APPROVED' ? `
              <span class="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">verified</span> Penawaran Disetujui & Tagihan Diterbitkan
              </span>
            ` : `
              <span class="text-xs font-semibold text-rose-600 flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">cancel</span> Penawaran Ditolak
              </span>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  async function approveProposal(quoId) {
    const quo = store.proposals.find(p => p.id === quoId);
    if (!quo) return;

    const historyNote = {
      sender: 'PT Laksana Software',
      text: 'Penawaran resmi disetujui. Tagihan otomatis diterbitkan ke dasbor.',
      time: new Date().toLocaleDateString('id-ID')
    };

    quo.status = 'APPROVED';
    quo.history.push(historyNote);

    // Sync with Google Sheets backend if configured
    if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
      await window.GoogleBackend.updateProposalStatus({
        proposalId: quo.id,
        status: 'APPROVED',
        historyItem: historyNote
      });
    }

    const newInvId = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const subtotal = quo.counterPrice || quo.originalPrice;
    const tax = Math.round(subtotal * 0.11);
    const totalAmount = subtotal + tax;

    const newInv = {
      id: newInvId,
      vendor: quo.vendor,
      vendorLogo: quo.vendorLogo || 'domain',
      category: 'Software & Hardware Services',
      issueDate: new Date().toLocaleDateString('id-ID'),
      dueDate: quo.validUntil,
      amount: totalAmount,
      tax: tax,
      subtotal: subtotal,
      status: 'UNPAID',
      description: `Re: Penawaran ${quo.id} - ${quo.title}`,
      items: quo.items
    };

    store.invoices.unshift(newInv);

    store.notifications.unshift({
      id: 'notif-' + Date.now(),
      title: 'Penawaran Disetujui',
      message: `Penawaran ${quo.id} dari ${quo.vendor} disetujui. Tagihan ${newInvId} dibuat otomatis.`,
      time: 'Baru saja',
      type: 'SUCCESS',
      read: false
    });

    saveStore();
    showToast(`Penawaran ${quo.id} disetujui! Tagihan ${newInvId} diterbitkan di Dasbor.`, 'success');
    renderProposalsPage();
  }

  function openRejectModal(quoId) {
    store.selectedProposal = store.proposals.find(p => p.id === quoId);
    const modal = document.getElementById('modal-reject-proposal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  async function confirmRejectProposal() {
    const quo = store.selectedProposal;
    if (!quo) return;

    const reasonInput = document.getElementById('reject-reason-input')?.value || 'Anggaran tidak mencukupi.';
    const historyNote = {
      sender: 'PT Laksana Software',
      text: `Penawaran DITOLAK: ${reasonInput}`,
      time: new Date().toLocaleDateString('id-ID')
    };

    quo.status = 'REJECTED';
    quo.history.push(historyNote);

    if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
      await window.GoogleBackend.updateProposalStatus({
        proposalId: quo.id,
        status: 'REJECTED',
        historyItem: historyNote
      });
    }

    saveStore();
    showToast(`Penawaran ${quo.id} ditolak.`, 'info');
    document.getElementById('modal-reject-proposal')?.classList.add('hidden');
    renderProposalsPage();
  }

  function openNegotiateModal(quoId) {
    store.selectedProposal = store.proposals.find(p => p.id === quoId);
    const quo = store.selectedProposal;
    if (!quo) return;

    document.getElementById('nego-quo-id').textContent = quo.id;
    document.getElementById('nego-quo-title').textContent = quo.title;
    document.getElementById('nego-price-input').value = quo.counterPrice || quo.originalPrice;

    const modal = document.getElementById('modal-negotiate-proposal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  async function confirmNegotiateProposal() {
    const quo = store.selectedProposal;
    if (!quo) return;

    const counterPrice = Number(document.getElementById('nego-price-input')?.value || quo.originalPrice);
    const negoNote = document.getElementById('nego-note-input')?.value || 'Pengajuan penyesuaian harga anggaran.';

    const historyNote = {
      sender: 'PT Laksana Software',
      text: `Mengajukan harga balik ${formatIDR(counterPrice)}. Catatan: "${negoNote}"`,
      time: new Date().toLocaleDateString('id-ID')
    };

    quo.status = 'NEGOTIATING';
    quo.counterPrice = counterPrice;
    quo.history.push(historyNote);

    if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
      await window.GoogleBackend.updateProposalStatus({
        proposalId: quo.id,
        status: 'NEGOTIATING',
        counterPrice: counterPrice,
        historyItem: historyNote
      });
    }

    saveStore();
    showToast(`Pengajuan negosiasi ${quo.id} sebesar ${formatIDR(counterPrice)} terkirim ke vendor!`, 'success');
    document.getElementById('modal-negotiate-proposal')?.classList.add('hidden');
    renderProposalsPage();
  }

  // --- 3. INVOICE DETAIL VIEW ---
  function renderInvoiceDetail() {
    const inv = store.selectedInvoice;
    if (!inv) return;

    document.getElementById('inv-detail-id').textContent = inv.id;
    document.getElementById('inv-detail-vendor').textContent = inv.vendor;
    document.getElementById('inv-detail-category').textContent = inv.category;
    document.getElementById('inv-detail-issue').textContent = inv.issueDate;
    document.getElementById('inv-detail-due').textContent = inv.dueDate;
    document.getElementById('inv-detail-subtotal').textContent = formatIDR(inv.subtotal);
    document.getElementById('inv-detail-tax').textContent = formatIDR(inv.tax);
    document.getElementById('inv-detail-amount').textContent = formatIDR(inv.amount);
    document.getElementById('inv-detail-desc').textContent = inv.description;

    const badgeContainer = document.getElementById('inv-detail-status-badge');
    const payBtn = document.getElementById('inv-detail-pay-btn');

    if (inv.status === 'PAID') {
      badgeContainer.innerHTML = `<span class="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1.5"><span class="material-symbols-outlined text-sm">check_circle</span> LUNAS</span>`;
      if (payBtn) payBtn.classList.add('hidden');
    } else {
      badgeContainer.innerHTML = `<span class="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1.5"><span class="material-symbols-outlined text-sm">pending</span> MENUNGGU PEMBAYARAN</span>`;
      if (payBtn) payBtn.classList.remove('hidden');
    }

    const itemsTable = document.getElementById('inv-detail-items-table');
    if (itemsTable) {
      itemsTable.innerHTML = inv.items.map(item => `
        <tr class="border-b border-surface-container">
          <td class="py-3 px-4 text-sm text-on-surface font-medium">${item.name}</td>
          <td class="py-3 px-4 text-sm text-center text-on-surface-variant">${item.qty}</td>
          <td class="py-3 px-4 text-sm text-right text-on-surface-variant">${formatIDR(item.price)}</td>
          <td class="py-3 px-4 text-sm text-right text-on-surface font-semibold">${formatIDR(item.qty * item.price)}</td>
        </tr>
      `).join('');
    }
  }

  // --- 4. PAYMENT CONFIRMATION VIEW ---
  function renderPaymentConfirm() {
    const inv = store.selectedInvoice;
    if (!inv) return;

    document.getElementById('pay-confirm-inv-id').textContent = inv.id;
    document.getElementById('pay-confirm-vendor').textContent = inv.vendor;
    document.getElementById('pay-confirm-amount').textContent = formatIDR(inv.amount);
    document.getElementById('pay-confirm-subtotal').textContent = formatIDR(inv.subtotal);
    document.getElementById('pay-confirm-tax').textContent = formatIDR(inv.tax);
  }

  // --- 5. QRIS PAYMENT VIEW ---
  function renderPaymentQR() {
    const inv = store.selectedInvoice;
    if (!inv) return;

    document.getElementById('qr-pay-amount').textContent = formatIDR(inv.amount);
    document.getElementById('qr-pay-inv-id').textContent = inv.id;
    document.getElementById('qr-pay-vendor').textContent = inv.vendor;

    startQrisCountdown();
  }

  let qrisInterval = null;
  function startQrisCountdown() {
    if (qrisInterval) clearInterval(qrisInterval);
    store.qrisTimerSeconds = 899;
    const timerEl = document.getElementById('qr-timer');

    qrisInterval = setInterval(() => {
      if (store.qrisTimerSeconds <= 0) {
        clearInterval(qrisInterval);
        if (timerEl) timerEl.textContent = '00:00 (Kadaluarsa)';
        return;
      }
      store.qrisTimerSeconds--;
      const mins = Math.floor(store.qrisTimerSeconds / 60);
      const secs = store.qrisTimerSeconds % 60;
      if (timerEl) {
        timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
    }, 1000);
  }

  // --- 6. PIN VERIFICATION MODAL ---
  function openPinModal() {
    store.enteredPin = '';
    updatePinDots();
    const modal = document.getElementById('modal-pin');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  function closePinModal() {
    const modal = document.getElementById('modal-pin');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function handlePinInput(num) {
    if (store.enteredPin.length < 6) {
      store.enteredPin += num;
      updatePinDots();
      highlightPhysicalKeypress(num);
    }
    if (store.enteredPin.length === 6) {
      setTimeout(verifyPinAndProcess, 200);
    }
  }

  function handlePinBackspace() {
    if (store.enteredPin.length > 0) {
      store.enteredPin = store.enteredPin.slice(0, -1);
      updatePinDots();
      highlightPhysicalKeypress('backspace');
    }
  }

  function highlightPhysicalKeypress(key) {
    const buttons = document.querySelectorAll('#modal-pin .pin-btn');
    buttons.forEach(btn => {
      if (btn.textContent.trim() === String(key)) {
        btn.classList.add('bg-primary', 'text-white');
        setTimeout(() => btn.classList.remove('bg-primary', 'text-white'), 150);
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    const pinModal = document.getElementById('modal-pin');
    if (!pinModal || pinModal.classList.contains('hidden')) return;

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      handlePinInput(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      handlePinBackspace();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePinModal();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (store.enteredPin.length === 6) {
        verifyPinAndProcess();
      }
    }
  });

  function updatePinDots() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, index) => {
      if (index < store.enteredPin.length) {
        dot.classList.add('bg-primary', 'dark:bg-secondary');
        dot.classList.remove('bg-surface-container-high');
      } else {
        dot.classList.remove('bg-primary', 'dark:bg-secondary');
        dot.classList.add('bg-surface-container-high');
      }
    });
  }

  function verifyPinAndProcess() {
    const userPin = store.user.pin || '';
    if (!userPin) {
      // PIN belum diatur untuk akun ini — proses pembayaran langsung
      closePinModal();
      navigateTo('payment-processing');
      return;
    }
    if (store.enteredPin === userPin) {
      closePinModal();
      navigateTo('payment-processing');
    } else {
      showToast('PIN Keamanan salah. Silakan coba lagi.', 'error');
      store.enteredPin = '';
      updatePinDots();
    }
  }

  // --- 7. PROCESSING STATE ---
  function renderProcessingState() {
    const inv = store.selectedInvoice;
    document.getElementById('processing-inv-id').textContent = inv ? inv.id : '';

    setTimeout(() => {
      completePaymentProcess();
    }, 2800);
  }

  async function completePaymentProcess() {
    const inv = store.selectedInvoice;
    if (!inv) return;

    inv.status = 'PAID';

    const refCode = `LKS-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const dateStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
    const methodStr = store.paymentMethod.toUpperCase().replace('_', ' ');

    let driveReceiptUrl = '';

    if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
      showToast('Menyimpan transaksi ke Google Sheets & Google Drive...', 'info');
      const backendRes = await window.GoogleBackend.processPayment({
        invoiceId: inv.id,
        vendor: inv.vendor,
        amount: inv.amount,
        method: methodStr
      });
      if (backendRes && backendRes.driveReceiptUrl) {
        driveReceiptUrl = backendRes.driveReceiptUrl;
      }
    }

    const trxObj = {
      trxId: `TRX-${Math.floor(100000000 + Math.random() * 900000000)}`,
      invoiceId: inv.id,
      vendor: inv.vendor,
      amount: inv.amount,
      date: dateStr,
      method: methodStr,
      status: 'SUCCESS',
      refCode: refCode,
      driveReceiptUrl: driveReceiptUrl
    };

    store.transactions.unshift(trxObj);
    store.latestReceipt = trxObj;

    store.notifications.unshift({
      id: 'notif-' + Date.now(),
      title: 'Pembayaran Berhasil',
      message: `Pembayaran ${formatIDR(inv.amount)} untuk ${inv.id} (${inv.vendor}) tersimpan di database Google.`,
      time: 'Baru saja',
      type: 'SUCCESS',
      read: false
    });

    saveStore();
    showToast(`Pembayaran tagihan ${inv.id} sukses! ${driveReceiptUrl ? '(Tersimpan di Google Drive)' : ''}`, 'success');
    navigateTo('receipt');
  }

  // --- 8. RECEIPT VIEW ---
  function renderReceipt() {
    const trx = store.latestReceipt || store.transactions[0];

    if (!trx) return;

    document.getElementById('receipt-ref-code').textContent = trx.refCode;
    document.getElementById('receipt-trx-id').textContent = trx.trxId;
    document.getElementById('receipt-date').textContent = trx.date;
    document.getElementById('receipt-amount').textContent = formatIDR(trx.amount);
    document.getElementById('receipt-method').textContent = trx.method;
    document.getElementById('receipt-vendor').textContent = trx.vendor;
    document.getElementById('receipt-invoice-id').textContent = trx.invoiceId;

    const driveContainer = document.getElementById('receipt-drive-link-container');
    if (driveContainer) {
      if (trx.driveReceiptUrl) {
        driveContainer.innerHTML = `
          <a href="${trx.driveReceiptUrl}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-800 transition-colors mt-2">
            <span class="material-symbols-outlined text-sm">cloud_download</span> Buka Resi di Google Drive
          </a>
        `;
      } else {
        driveContainer.innerHTML = '';
      }
    }
  }

  function openTrxDetailModal(trxId) {
    const trx = store.transactions.find(t => t.trxId === trxId);
    if (!trx) return;

    store.selectedTrx = trx;
    document.getElementById('trx-modal-id').textContent = trx.trxId;
    document.getElementById('trx-modal-ref').textContent = trx.refCode || '-';
    document.getElementById('trx-modal-vendor').textContent = trx.vendor;
    document.getElementById('trx-modal-inv').textContent = trx.invoiceId;
    document.getElementById('trx-modal-date').textContent = trx.date;
    document.getElementById('trx-modal-method').textContent = trx.method;
    document.getElementById('trx-modal-amount').textContent = formatIDR(trx.amount);

    const driveContainer = document.getElementById('trx-modal-drive-link');
    if (driveContainer) {
      if (trx.driveReceiptUrl) {
        driveContainer.innerHTML = `
          <a href="${trx.driveReceiptUrl}" target="_blank" class="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors">
            <span class="material-symbols-outlined text-base">cloud_download</span> Buka Resi Resmi di Google Drive
          </a>
        `;
      } else {
        driveContainer.innerHTML = '';
      }
    }

    const modal = document.getElementById('modal-trx-detail');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  // --- 9. PAYMENT HISTORY VIEW ---
  function renderHistory() {
    const tableBody = document.getElementById('history-table-body');
    if (!tableBody) return;

    if (store.transactions.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-8 text-center text-on-surface-variant">Belum ada riwayat transaksi.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = store.transactions.map(trx => `
      <tr onclick="app.openTrxDetailModal('${trx.trxId}')" class="border-b border-surface-container hover:bg-surface-container-low transition-colors cursor-pointer group">
        <td class="px-6 py-4 font-semibold text-primary dark:text-on-primary-container flex items-center gap-2">
          <span class="material-symbols-outlined text-sm text-outline group-hover:text-primary">receipt_long</span>
          ${trx.trxId}
        </td>
        <td class="px-6 py-4 text-sm text-on-surface">${trx.date}</td>
        <td class="px-6 py-4">
          <div class="font-bold text-on-surface text-sm">${trx.vendor}</div>
          <div class="text-xs text-on-surface-variant">Re: ${trx.invoiceId}</div>
        </td>
        <td class="px-6 py-4 text-sm text-on-surface-variant">${trx.method}</td>
        <td class="px-6 py-4 font-extrabold text-on-surface">${formatIDR(trx.amount)}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <span class="material-symbols-outlined text-xs">check</span> Berhasil
            </span>
            <button onclick="event.stopPropagation(); app.openTrxDetailModal('${trx.trxId}')" class="px-3 py-1 text-xs font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg transition-colors">
              Detail
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // --- 10. NOTIFICATIONS VIEW & TRAY ---
  function updateNotificationBadges() {
    const unreadCount = store.notifications.filter(n => !n.read).length;
    const badgeEl = document.getElementById('nav-notif-badge');
    const headerBadgeEl = document.getElementById('header-notif-badge');

    if (badgeEl) {
      badgeEl.textContent = unreadCount;
      badgeEl.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    }
    if (headerBadgeEl) {
      headerBadgeEl.textContent = unreadCount;
      headerBadgeEl.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    }
  }

  function renderNotificationsPage() {
    const container = document.getElementById('notif-list-container');
    if (!container) return;

    if (store.notifications.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-on-surface-variant">Tidak ada notifikasi saat ini.</div>`;
      return;
    }

    container.innerHTML = store.notifications.map(n => `
      <div class="p-4 rounded-xl border ${n.read ? 'bg-surface border-surface-container' : 'bg-surface-container-lowest border-primary/20 shadow-sm'} flex items-start justify-between gap-4 transition-all">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.type === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : n.type === 'SECURITY' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'}">
            <span class="material-symbols-outlined text-xl">${n.type === 'SUCCESS' ? 'check_circle' : n.type === 'SECURITY' ? 'security' : 'notifications'}</span>
          </div>
          <div>
            <h4 class="font-bold text-sm text-on-surface">${n.title}</h4>
            <p class="text-xs text-on-surface-variant mt-1 leading-relaxed">${n.message}</p>
            <span class="text-[11px] text-outline mt-2 block">${n.time}</span>
          </div>
        </div>
        ${!n.read ? `<button onclick="app.markNotifRead('${n.id}')" class="text-xs font-semibold text-secondary hover:underline shrink-0">Tandai Dibaca</button>` : ''}
      </div>
    `).join('');
  }

  // --- 11. PROFILE & SETTINGS ---
  function renderProfile() {
    document.getElementById('prof-user-name').textContent = store.user.name;
    document.getElementById('prof-user-corp').textContent = store.user.company;
    document.getElementById('prof-corp-id').value = store.user.corpId;
    document.getElementById('prof-user-email').value = store.user.userId;
    document.getElementById('prof-user-role').value = store.user.role;
  }

  // --- 12. LIVE SUPPORT CHAT VIEW ---
  function renderSupportChat() {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    container.innerHTML = store.chatMessages.map(msg => `
      <div class="flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4">
        <div class="max-w-[80%] ${msg.sender === 'user' ? 'bg-primary text-white rounded-2xl rounded-tr-none' : 'bg-surface-container-high text-on-surface rounded-2xl rounded-tl-none'} p-4 shadow-sm">
          <p class="text-sm leading-relaxed">${msg.text}</p>
          <span class="text-[10px] opacity-75 mt-1 block text-right">${msg.time}</span>
        </div>
      </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
  }

  function sendChatMessage(userText) {
    if (!userText || !userText.trim()) return;

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    store.chatMessages.push({ sender: 'user', text: userText, time: timeStr });
    renderSupportChat();

    const inputEl = document.getElementById('chat-input-field');
    if (inputEl) inputEl.value = '';

    setTimeout(() => {
      let replyText = 'Terima kasih telah menghubungi dukungan Laksanasoft. Petugas kami sedang meninjau pertanyaan Anda.';
      const lower = userText.toLowerCase();

      if (lower.includes('penawaran') || lower.includes('negosiasi') || lower.includes('quotation')) {
        replyText = 'Anda dapat melihat, menyetujui, menolak, atau mengajukan negosiasi harga balik untuk semua penawaran vendor melalui menu "Penawaran & Quotation" di sidebar.';
      } else if (lower.includes('qris')) {
        replyText = 'Untuk pembayaran QRIS, pilih metode "QRIS / QR Code" saat mengonfirmasi pembayaran tagihan. Pindai kode QRIS menggunakan aplikasi M-Banking atau E-Wallet Anda.';
      } else if (lower.includes('resi') || lower.includes('bukti')) {
        replyText = 'Anda dapat mengunduh bukti pembayaran (resi resmi) kapan saja melalui menu Riwayat Pembayaran atau tombol Resi pada daftar tagihan lunas.';
      } else if (lower.includes('pin')) {
        replyText = 'Anda dapat mengelola dan mereset PIN Keamanan pada menu Profil & Pengaturan.';
      }

      store.chatMessages.push({ sender: 'bot', text: replyText, time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' });
      renderSupportChat();
    }, 1000);
  }

  // --- PUBLIC API INITIALIZER ---
  window.app = {
    init: async function () {
      await initStore();

      const isDark = localStorage.getItem('laksanasoft_theme') === 'dark';
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      if (store.user && store.user.isLoggedIn && store.user.userId && store.user.userId.toLowerCase() !== 'admin') {
        navigateTo('dashboard');
      } else {
        navigateTo('login');
      }

      const searchInput = document.getElementById('dashboard-search-input');
      const statusFilter = document.getElementById('dashboard-status-filter');

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          renderInvoiceTable(statusFilter ? statusFilter.value : 'ALL', e.target.value);
        });
      }
      if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
          renderInvoiceTable(e.target.value, searchInput ? searchInput.value : '');
        });
      }
    },

    navigate: navigateTo,

    login: async function (e) {
      if (e) e.preventDefault();

      const userInput = document.getElementById('login-user-id')?.value.trim();
      const passInput = document.getElementById('login-password')?.value.trim();

      if (!userInput || !passInput) {
        showToast('Harap masukkan User ID dan Kata Sandi.', 'error');
        return;
      }

      const cleanU = userInput.toLowerCase();
      const cleanP = passInput;

      if (cleanU === 'admin') {
        showToast('Akses Super Admin telah dipindahkan ke Portal Khusus Admin di /admin/index.html', 'info');
        setTimeout(() => {
          window.location.href = './admin/index.html';
        }, 1500);
        return;
      }

      showToast("Memverifikasi akun pengguna...", "info");
      let authenticatedUser = null;

      // 1. Instant check against Pre-configured System Roles DB (STRICT match)
      for (let i = 0; i < SYSTEM_ROLES_DB.length; i++) {
        const sysU = SYSTEM_ROLES_DB[i].username.toLowerCase();
        const sysP = SYSTEM_ROLES_DB[i].password;
        if (sysU === cleanU && sysP === cleanP) {
          authenticatedUser = JSON.parse(JSON.stringify(SYSTEM_ROLES_DB[i].userData));
          break;
        }
      }

      // 2. Check users created by Admin in localStorage (laksanasoft_users_db)
      if (!authenticatedUser) {
        try {
          const localUsers = JSON.parse(localStorage.getItem('laksanasoft_users_db') || '[]');
          // BUG-003 FIX: Hanya cocokkan password yang sebenarnya — tidak ada fallback '123456'
          const matchedLocal = localUsers.find(u => u.username.toLowerCase() === cleanU && u.password === cleanP);
          if (matchedLocal) {
            authenticatedUser = matchedLocal.userData;
          }
        } catch (err) {}
      }

      // 3. Check remote Google Apps Script Backend with 2-second timeout
      if (!authenticatedUser && window.GoogleBackend && window.GoogleBackend.isConfigured()) {
        try {
          const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 2000));
          const remoteAuthPromise = window.GoogleBackend.loginUser(userInput, passInput);
          authenticatedUser = await Promise.race([remoteAuthPromise, timeoutPromise]);
        } catch (err) {}
      }

      if (authenticatedUser) {
        store.user = authenticatedUser;
        store.user.isLoggedIn = true;
        // BUG-009 FIX: saveStore() dihapus sebelum initStore() — cukup simpan session key langsung
        try {
          localStorage.setItem('laksanasoft_global_session', JSON.stringify(authenticatedUser));
          localStorage.setItem('laksanasoft_user', JSON.stringify(authenticatedUser));
        } catch (e) {}
        await initStore();
        showToast(`Login Berhasil! Selamat datang, ${store.user.name}.`, 'success');
        navigateTo('dashboard');
      } else {
        showToast('Akun tidak terdaftar atau kata sandi salah! Silakan hubungi Super Admin.', 'error');
      }
    },

    logout: function () {
      // BUG-004 FIX: Hapus semua key session — jangan saveStore() karena itu menulis ulang session
      localStorage.removeItem('laksanasoft_global_session');
      localStorage.removeItem('laksanasoft_user');
      localStorage.removeItem('laksanasoft_mobile_session');
      store.user = { corpId: '', userId: '', name: '', company: '', role: '', roleType: 'CLIENT', isLoggedIn: false, pin: '' };
      showToast('Anda telah keluar dari sistem.', 'info');
      navigateTo('login');
    },

    toggleTheme: function () {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('laksanasoft_theme', isDark ? 'dark' : 'light');
      showToast(`Mode ${isDark ? 'Gelap' : 'Terang'} diaktifkan.`, 'info');
    },

    viewInvoice: function (invId) {
      navigateTo('invoice-detail', { invoiceId: invId });
    },

    startPayment: function (invId) {
      store.selectedInvoice = store.invoices.find(i => i.id === invId) || store.selectedInvoice;
      navigateTo('payment-confirm');
    },

    selectPaymentMethod: function (method) {
      store.paymentMethod = method;
      document.querySelectorAll('.pay-method-card').forEach(card => {
        card.classList.remove('border-primary', 'bg-primary/5', 'dark:border-secondary');
        card.classList.add('border-surface-container-high');
      });
      const selectedEl = document.getElementById(`method-${method}`);
      if (selectedEl) {
        selectedEl.classList.remove('border-surface-container-high');
        selectedEl.classList.add('border-primary', 'bg-primary/5', 'dark:border-secondary');
      }
    },

    proceedToPinOrQR: function () {
      if (store.paymentMethod === 'qris') {
        navigateTo('payment-qr');
      } else {
        openPinModal();
      }
    },

    openPinModal: openPinModal,
    closePinModal: closePinModal,
    pinInput: handlePinInput,
    pinBackspace: handlePinBackspace,

    filterProposals: function (status) {
      document.querySelectorAll('.quo-filter-btn').forEach(btn => {
        btn.classList.remove('bg-primary', 'text-white');
        btn.classList.add('bg-surface-container', 'text-on-surface');
      });
      const activeBtn = document.getElementById(`quo-btn-${status}`);
      if (activeBtn) {
        activeBtn.classList.remove('bg-surface-container', 'text-on-surface');
        activeBtn.classList.add('bg-primary', 'text-white');
      }
      renderProposalsPage(status);
    },

    approveProposal: approveProposal,
    openRejectModal: openRejectModal,
    confirmRejectProposal: confirmRejectProposal,
    openNegotiateModal: openNegotiateModal,
    confirmNegotiateProposal: confirmNegotiateProposal,

    openTrxDetailModal: openTrxDetailModal,
    viewReceiptByInv: function (invId) {
      const trx = store.transactions.find(t => t.invoiceId === invId);
      if (trx) {
        store.latestReceipt = trx;
        navigateTo('receipt');
      } else {
        showToast('Resi pembayaran tidak ditemukan.', 'error');
      }
    },

    printDocument: function () {
      window.print();
    },

    downloadReceiptPDF: function () {
      showToast('Mengunduh dokumen PDF resmi...', 'success');
      setTimeout(() => {
        window.print();
      }, 500);
    },

    shareDocument: function () {
      const modal = document.getElementById('modal-share');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    },

    closeShareModal: function () {
      const modal = document.getElementById('modal-share');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    },

    copyShareLink: function () {
      navigator.clipboard.writeText(window.location.href);
      showToast('Tautan dokumen berhasil disalin ke clipboard!', 'success');
      this.closeShareModal();
    },

    markNotifRead: function (id) {
      const n = store.notifications.find(item => item.id === id);
      if (n) n.read = true;
      saveStore();
      updateNotificationBadges();
      renderNotificationsPage();
    },

    clearAllNotifs: function () {
      store.notifications = [];
      saveStore();
      updateNotificationBadges();
      renderNotificationsPage();
      showToast('Semua notifikasi dibersihkan.', 'info');
    },

    sendChat: function () {
      const inputEl = document.getElementById('chat-input-field');
      if (inputEl) sendChatMessage(inputEl.value);
    },

    sendPresetChat: function (msg) {
      sendChatMessage(msg);
    },

    toggleMobileMenu: function () {
      const sidebar = document.getElementById('app-sidebar');
      const backdrop = document.getElementById('sidebar-backdrop');
      if (sidebar) {
        const isHidden = sidebar.classList.contains('-translate-x-full');
        if (isHidden) {
          sidebar.classList.remove('-translate-x-full');
          if (backdrop) backdrop.classList.remove('hidden');
        } else {
          sidebar.classList.add('-translate-x-full');
          if (backdrop) backdrop.classList.add('hidden');
        }
      }
    },

    closeMobileMenu: function () {
      closeMobileSidebar();
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    window.app.init();
  });

})();
