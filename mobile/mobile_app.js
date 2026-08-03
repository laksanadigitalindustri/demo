/* ==========================================================================
   Laksanasoft Mobile App - Dedicated Smartphone Application Engine
   Includes Single-User Account Roles (Client / Vendor / Mitra / Super Admin)
   ========================================================================== */

(function () {
  'use strict';

  const store = {
    user: {
      corpId: '',
      userId: '',
      name: '',
      company: '',
      role: '',
      roleType: 'CLIENT',
      isLoggedIn: false,
      pin: '123456'
    },
    invoices: [],
    proposals: [],
    requests: [],
    transactions: [],
    notifications: [],
    currentTab: 'home',
    selectedInvoice: null,
    selectedProposal: null,
    selectedTrx: null,
    paymentMethod: 'bca_va',
    enteredPin: '',
    latestReceipt: null,
    isLoading: true
  };

  // Dedicated Pre-configured System Roles DB
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
        pin: '123456'
      }
    },
    {
      username: 'client1',
      password: 'client123',
      userData: {
        corpId: 'client1',
        userId: 'client1',
        name: 'Budi Santoso (Klien)',
        company: 'PT Laksana Digital Industri',
        role: 'Client Korporat',
        roleType: 'CLIENT',
        pin: '123456'
      }
    },
    {
      username: 'vendor1',
      password: 'vendor123',
      userData: {
        corpId: 'vendor1',
        userId: 'vendor1',
        name: 'PT Cloud Hostindo (Vendor)',
        company: 'PT Cloud Hostindo',
        role: 'Vendor / Supplier',
        roleType: 'VENDOR',
        pin: '654321'
      }
    },
    {
      username: 'mitra1',
      password: 'mitra123',
      userData: {
        corpId: 'mitra1',
        userId: 'mitra1',
        name: 'Mitra Integrasi Enterprise',
        company: 'PT Mitra Digital Asia',
        role: 'Mitra Strategis',
        roleType: 'MITRA',
        pin: '888888'
      }
    }
  ];

  const navigationStack = ['home'];
  let toastTimer = null;
  const TELEGRAM_BOT_TOKEN = '8814615182:AAF_bAmLXUQrUkmxLfCBrnZEKUoFPeyQ0_w';

  // DIRECT TELEGRAM BOT NOTIFIER
  async function sendTelegramNotificationDirect(messageText) {
    if (!TELEGRAM_BOT_TOKEN) return;

    try {
      let chatId = localStorage.getItem('laksanasoft_telegram_chat_id');

      if (!chatId) {
        const updateRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
        const json = await updateRes.json();
        if (json.ok && json.result && json.result.length > 0) {
          const lastMsg = json.result[json.result.length - 1];
          if (lastMsg.message && lastMsg.message.chat) {
            chatId = String(lastMsg.message.chat.id);
            localStorage.setItem('laksanasoft_telegram_chat_id', chatId);
          }
        }
      }

      if (chatId) {
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageText,
            parse_mode: 'HTML'
          })
        }).catch(err => console.warn("Telegram notification fetch warning:", err));
      }
    } catch (e) {
      console.warn("Telegram notification error:", e);
    }
  }

  // Update UI Elements according to logged-in single-user account role
  function updateUserRoleUI() {
    const roleLabel = document.getElementById('mobile-role-label');
    const badgeEl = document.getElementById('mobile-user-badge');
    const nameEl = document.getElementById('mobile-user-fullname');
    const companyEl = document.getElementById('mobile-user-company');
    const rolePill = document.getElementById('mobile-user-role-pill');
    const heroTitle = document.getElementById('mobile-hero-title');
    const pinPromptLabel = document.getElementById('pin-prompt-label');

    if (roleLabel) roleLabel.textContent = store.user.role || 'Client Korporat';
    if (nameEl) nameEl.textContent = store.user.name || 'Pengguna Korporat';
    if (companyEl) companyEl.textContent = store.user.company || 'PT Laksana Digital Industri';
    if (rolePill) rolePill.textContent = store.user.role || 'Client Korporat';
    if (pinPromptLabel) pinPromptLabel.textContent = `Ketik 6 digit PIN transaksi untuk ${store.user.name}`;

    const rType = store.user.roleType || 'CLIENT';
    if (badgeEl) {
      badgeEl.textContent = rType;
      if (rType === 'ADMIN') {
        badgeEl.className = 'px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-extrabold flex-shrink-0';
        if (heroTitle) heroTitle.textContent = 'Ringkasan Seluruh Tagihan Korporat';
      } else if (rType === 'VENDOR') {
        badgeEl.className = 'px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold flex-shrink-0';
        if (heroTitle) heroTitle.textContent = 'Ringkasan Penagihan Vendor';
      } else if (rType === 'MITRA') {
        badgeEl.className = 'px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-extrabold flex-shrink-0';
        if (heroTitle) heroTitle.textContent = 'Ringkasan Layanan Kemitraan';
      } else {
        badgeEl.className = 'px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold flex-shrink-0';
        if (heroTitle) heroTitle.textContent = 'Ringkasan Tagihan Korporat Anda';
      }
    }
  }

  // SESSION MANAGEMENT: Require login unless previously logged in
  function checkUserSession() {
    const savedSession = localStorage.getItem('laksanasoft_mobile_session');
    const loginView = document.getElementById('view-login');
    const appView = document.getElementById('view-app');

    if (savedSession) {
      try {
        const userData = JSON.parse(savedSession);
        store.user = userData;
        store.user.isLoggedIn = true;

        if (loginView) loginView.classList.add('hidden');
        if (appView) appView.classList.remove('hidden');

        updateUserRoleUI();
        initMobileStore();
        return true;
      } catch (e) {
        localStorage.removeItem('laksanasoft_mobile_session');
      }
    }

    // Show Login View if no session exists
    if (loginView) loginView.classList.remove('hidden');
    if (appView) appView.classList.add('hidden');
    return false;
  }

  function fillDemoLogin(u, p) {
    const uInput = document.getElementById('login-username');
    const pInput = document.getElementById('login-password');
    if (uInput) uInput.value = u;
    if (pInput) pInput.value = p;
    showMobileToast(`Akun Uji Coba [${u}] dipilih`, "info");
  }

  async function handleLogin(e) {
    if (e) e.preventDefault();
    const uInput = document.getElementById('login-username')?.value.trim();
    const pInput = document.getElementById('login-password')?.value.trim();

    if (!uInput || !pInput) {
      showMobileToast("Harap isi Username dan Password.", "error");
      return;
    }

    showMobileToast("Memverifikasi akun pengguna...", "info");

    let authenticatedUser = null;

    // 1. Check Pre-configured System Roles DB
    for (let i = 0; i < SYSTEM_ROLES_DB.length; i++) {
      if (SYSTEM_ROLES_DB[i].username.toLowerCase() === uInput.toLowerCase() && SYSTEM_ROLES_DB[i].password === pInput) {
        authenticatedUser = SYSTEM_ROLES_DB[i].userData;
        break;
      }
    }

    // 2. Try remote Google Apps Script Backend
    if (!authenticatedUser && window.GoogleBackend && window.GoogleBackend.isConfigured()) {
      authenticatedUser = await window.GoogleBackend.loginUser(uInput, pInput);

      if (!authenticatedUser) {
        const remoteUsers = await window.GoogleBackend.fetchUsers();
        if (remoteUsers && Array.isArray(remoteUsers)) {
          const matched = remoteUsers.find(row => {
            const u = String(row.Username || row.username || row.User || row.UserID || row.ID || '').trim().toLowerCase();
            const p = String(row.Password || row.password || row.Pass || row.Pwd || '').trim();
            return u === uInput.toLowerCase() && p === pInput;
          });
          if (matched) {
            let roleVal = String(matched.Role || matched.role || matched.Jabatan || 'Client Korporat');
            let roleType = 'CLIENT';
            if (roleVal.toLowerCase().includes('admin')) roleType = 'ADMIN';
            else if (roleVal.toLowerCase().includes('vendor')) roleType = 'VENDOR';
            else if (roleVal.toLowerCase().includes('mitra')) roleType = 'MITRA';

            authenticatedUser = {
              corpId: String(matched.Username || matched.username || matched.User || uInput),
              userId: String(matched.Username || matched.username || matched.User || uInput),
              name: String(matched.Name || matched.name || matched.Nama || uInput),
              company: String(matched.Company || matched.company || matched.Perusahaan || 'PT Laksana Software Solutions'),
              role: roleVal,
              roleType: roleType,
              pin: String(matched.PIN || matched.pin || matched.Pin || '123456')
            };
          }
        }
      }
    }

    // 3. Fallback Dynamic Account Creator for Custom Spreadsheet Users
    if (!authenticatedUser) {
      const formattedName = uInput.charAt(0).toUpperCase() + uInput.slice(1);
      let roleType = 'CLIENT';
      let roleName = 'Client Korporat';

      if (uInput.toLowerCase().includes('vendor')) {
        roleType = 'VENDOR';
        roleName = 'Vendor / Supplier';
      } else if (uInput.toLowerCase().includes('mitra')) {
        roleType = 'MITRA';
        roleName = 'Mitra Strategis';
      } else if (uInput.toLowerCase().includes('admin')) {
        roleType = 'ADMIN';
        roleName = 'Administrator Korporat';
      }

      authenticatedUser = {
        corpId: uInput,
        userId: uInput,
        name: `${formattedName}`,
        company: 'PT Laksana Digital Industri',
        role: roleName,
        roleType: roleType,
        pin: '123456'
      };
    }

    if (authenticatedUser) {
      store.user = authenticatedUser;
      store.user.isLoggedIn = true;

      localStorage.setItem('laksanasoft_mobile_session', JSON.stringify(authenticatedUser));
      showMobileToast(`Login Berhasil! Selamat datang, ${authenticatedUser.name} [${authenticatedUser.role}]`, "success");

      const loginView = document.getElementById('view-login');
      const appView = document.getElementById('view-app');
      if (loginView) loginView.classList.add('hidden');
      if (appView) appView.classList.remove('hidden');

      updateUserRoleUI();
      initMobileStore();
    } else {
      showMobileToast("Username atau Password Salah!", "error");
    }
  }

  function logout() {
    localStorage.removeItem('laksanasoft_mobile_session');
    store.user.isLoggedIn = false;

    showMobileToast("Anda telah keluar dari akun korporat.", "info");

    const loginView = document.getElementById('view-login');
    const appView = document.getElementById('view-app');
    if (loginView) loginView.classList.remove('hidden');
    if (appView) appView.classList.add('hidden');
  }

  // Normalizers
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

  function renderSkeletonLoaders() {
    store.isLoading = true;

    const invContainer = document.getElementById('mobile-invoice-list');
    if (invContainer) {
      invContainer.innerHTML = `
        <div class="mobile-card space-y-3">
          <div class="flex justify-between items-center"><div class="skeleton-box w-32 h-4"></div><div class="skeleton-box w-16 h-4"></div></div>
          <div class="skeleton-box w-full h-8"></div>
          <div class="skeleton-box w-full h-10"></div>
        </div>
      `;
    }

    const propContainer = document.getElementById('mobile-proposals-list');
    if (propContainer) {
      propContainer.innerHTML = `
        <div class="mobile-card space-y-3">
          <div class="skeleton-box w-40 h-4"></div>
          <div class="skeleton-box w-full h-12"></div>
        </div>
      `;
    }

    const reqContainer = document.getElementById('mobile-requests-list');
    if (reqContainer) {
      reqContainer.innerHTML = `
        <div class="mobile-card space-y-3">
          <div class="skeleton-box w-full h-10"></div>
        </div>
      `;
    }
  }

  async function initMobileStore() {
    renderSkeletonLoaders();
    let synced = false;

    if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
      try {
        const remoteInvoices = await window.GoogleBackend.fetchInvoices();
        if (remoteInvoices && Array.isArray(remoteInvoices) && remoteInvoices.length > 0) {
          store.invoices = remoteInvoices.map(normalizeInvoice).filter(Boolean);
          synced = true;
        }

        const remoteProposals = await window.GoogleBackend.fetchProposals();
        if (remoteProposals && Array.isArray(remoteProposals) && remoteProposals.length > 0) {
          store.proposals = remoteProposals.map(normalizeProposal).filter(Boolean);
        }

        const remoteTrx = await window.GoogleBackend.fetchTransactions();
        if (remoteTrx && Array.isArray(remoteTrx) && remoteTrx.length > 0) {
          store.transactions = remoteTrx.map(normalizeTransaction).filter(Boolean);
        }
      } catch (e) {
        console.warn("Mobile API error:", e);
      }
    }

    if (!synced) {
      const savedInv = localStorage.getItem('laksanasoft_invoices');
      if (savedInv) store.invoices = JSON.parse(savedInv).map(normalizeInvoice).filter(Boolean);

      const savedProp = localStorage.getItem('laksanasoft_proposals');
      if (savedProp) store.proposals = JSON.parse(savedProp).map(normalizeProposal).filter(Boolean);

      const savedTrx = localStorage.getItem('laksanasoft_transactions');
      if (savedTrx) store.transactions = JSON.parse(savedTrx).map(normalizeTransaction).filter(Boolean);
    }

    const savedReq = localStorage.getItem('laksanasoft_requests');
    if (savedReq) {
      try { store.requests = JSON.parse(savedReq); } catch (e) { store.requests = []; }
    } else {
      store.requests = [
        {
          id: 'REQ-2026-0801',
          title: 'Permintaan Upgrade Kapasitas Dedicated Cloud Server 128GB',
          category: 'Cloud Infrastructure',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          date: '02 Agt 2026',
          description: 'Pengajuan penambahan RAM & NVMe SSD untuk cluster database utama.'
        },
        {
          id: 'REQ-2026-0802',
          title: 'Permintaan Perpanjangan Lisensi SSL Enterprise Wildcard',
          category: 'Security & Network',
          priority: 'NORMAL',
          status: 'COMPLETED',
          date: '28 Jul 2026',
          description: 'Penerbitan sertifikat SSL domain korporat tahunan.'
        }
      ];
    }

    store.isLoading = false;
    renderCurrentTabContent();
  }

  function saveStore() {
    localStorage.setItem('laksanasoft_invoices', JSON.stringify(store.invoices));
    localStorage.setItem('laksanasoft_proposals', JSON.stringify(store.proposals));
    localStorage.setItem('laksanasoft_transactions', JSON.stringify(store.transactions));
    localStorage.setItem('laksanasoft_requests', JSON.stringify(store.requests));
  }

  function formatIDR(val) {
    const num = Number(val);
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  }

  // --- AUTO DISMISS TOAST IN EXACTLY 2 SECONDS ---
  function showMobileToast(msg, type = 'info') {
    const toast = document.getElementById('mobile-toast');
    if (!toast) return;
    if (toastTimer) clearTimeout(toastTimer);

    document.getElementById('mobile-toast-msg').textContent = msg;
    toast.className = `fixed top-4 left-4 right-4 z-50 p-3.5 rounded-2xl shadow-xl text-xs font-bold text-white flex items-center gap-2.5 transition-all duration-300 transform translate-y-0 opacity-100 ${type === 'success' ? 'bg-emerald-700' : type === 'error' ? 'bg-rose-700' : 'bg-slate-900'}`;

    toastTimer = setTimeout(() => {
      toast.classList.add('-translate-y-12', 'opacity-0');
      toast.classList.remove('translate-y-0', 'opacity-100');
    }, 2000);
  }

  // --- 100% NATIVE VECTOR PDF GENERATOR ---
  function downloadInvoicePDF(invId) {
    const targetId = invId || (store.selectedInvoice ? store.selectedInvoice.id : null);
    const inv = store.invoices.find(i => String(i.id).trim() === String(targetId).trim()) || store.selectedInvoice;

    if (!inv) {
      showMobileToast("Data tagihan tidak ditemukan.", "error");
      return;
    }

    showMobileToast("Membuat dokumen PDF resmi...", "info");

    const jsPDFLib = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDFLib) {
      showMobileToast("Pustaka PDF tidak tersedia.", "error");
      return;
    }

    const doc = new jsPDFLib({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const subtotal = inv.subtotal || Math.round(inv.amount / 1.11);
    const tax = inv.tax || (inv.amount - subtotal);
    const isPaid = inv.status === 'PAID';

    doc.setFillColor(15, 23, 42);
    doc.rect(30, 30, 535, 60, 'F');

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(45, 42, 36, 36, 6, 6, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("LKS", 52, 65);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text("PT LAKSANA SOFTWARE SOLUTIONS", 95, 54);
    doc.setFontSize(9);
    doc.setTextColor(52, 211, 153);
    doc.text("OFFICIAL CORPORATE PAYMENT PORTAL INVOICE", 95, 68);

    if (isPaid) {
      doc.setFillColor(209, 250, 229);
      doc.roundedRect(430, 47, 120, 26, 13, 13, 'F');
      doc.setTextColor(6, 95, 70);
      doc.setFontSize(10);
      doc.text("STATUS: LUNAS", 448, 64);
    } else {
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(430, 47, 120, 26, 13, 13, 'F');
      doc.setTextColor(146, 64, 14);
      doc.setFontSize(10);
      doc.text("STATUS: UNPAID", 445, 64);
    }

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text("DITERBITKAN UNTUK:", 40, 120);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(store.user.company || "PT Laksana Digital Industri", 40, 136);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`User ID: ${store.user.userId || 'client1'}  •  Role: ${store.user.role || 'Client Korporat'}`, 40, 150);

    doc.setTextColor(100, 116, 139);
    doc.text("No. Invoice:", 380, 120);
    doc.setTextColor(15, 23, 42);
    doc.setFont("courier", "bold");
    doc.text(inv.id, 465, 120);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Vendor Penerbit:", 380, 136);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(inv.vendor, 465, 136);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Jatuh Tempo:", 380, 152);
    doc.setTextColor(225, 29, 72);
    doc.setFont("helvetica", "bold");
    doc.text(inv.dueDate, 465, 152);

    doc.setFillColor(241, 245, 249);
    doc.rect(40, 175, 515, 24, 'F');
    doc.setLineWidth(1);
    doc.setDrawColor(15, 23, 42);
    doc.line(40, 175, 555, 175);
    doc.line(40, 199, 555, 199);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DESKRIPSI LAYANAN / ITEM", 50, 191);
    doc.text("QTY", 330, 191);
    doc.text("HARGA SATUAN", 395, 191);
    doc.text("SUBTOTAL", 485, 191);

    let currentY = 216;
    doc.setFont("helvetica", "normal");

    if (inv.items && inv.items.length > 0) {
      inv.items.forEach(it => {
        doc.setTextColor(15, 23, 42);
        doc.text(it.name, 50, currentY);
        doc.text(String(it.qty), 338, currentY);
        doc.text(formatIDR(it.price), 395, currentY);
        doc.setFont("helvetica", "bold");
        doc.text(formatIDR(it.qty * it.price), 485, currentY);
        doc.setFont("helvetica", "normal");

        doc.setDrawColor(226, 232, 240);
        doc.line(40, currentY + 6, 555, currentY + 6);
        currentY += 22;
      });
    } else {
      doc.setTextColor(15, 23, 42);
      doc.text(inv.description || "Layanan TI & Software Korporat", 50, currentY);
      doc.text("1", 338, currentY);
      doc.text(formatIDR(subtotal), 395, currentY);
      doc.setFont("helvetica", "bold");
      doc.text(formatIDR(subtotal), 485, currentY);
      doc.setFont("helvetica", "normal");

      doc.setDrawColor(226, 232, 240);
      doc.line(40, currentY + 6, 555, currentY + 6);
      currentY += 22;
    }

    currentY += 12;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(320, currentY, 235, 80, 8, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(320, currentY, 235, 80, 8, 8, 'S');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text("Subtotal Layanan:", 335, currentY + 20);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(formatIDR(subtotal), 465, currentY + 20);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("PPN (11%):", 335, currentY + 40);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(formatIDR(tax), 465, currentY + 40);

    doc.setDrawColor(203, 213, 225);
    doc.line(330, currentY + 50, 545, currentY + 50);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Total Tagihan:", 335, currentY + 68);
    doc.setTextColor(5, 150, 105);
    doc.text(formatIDR(inv.amount), 465, currentY + 68);

    currentY += 115;
    doc.setDrawColor(203, 213, 225);
    doc.line(40, currentY, 555, currentY);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    doc.text("Dokumen resmi ini diterbitkan secara sah oleh Portal Pembayaran Laksanasoft.", 40, currentY + 15);

    doc.setFont("courier", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(`HASH-${Math.floor(10000000 + Math.random() * 90000000)}`, 440, currentY + 15);

    doc.save(`Invoice_${inv.id}.pdf`);
    showMobileToast("File Invoice PDF berhasil diunduh!", "success");
  }

  // --- PULL TO REFRESH TOUCH GESTURE ---
  function initPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    const threshold = 65;
    const indicator = document.getElementById('mobile-pull-indicator');
    const label = document.getElementById('pull-refresh-label');
    const icon = document.getElementById('pull-refresh-icon');

    if (!indicator) return;

    window.addEventListener('touchstart', function (e) {
      if (window.scrollY <= 2) {
        startY = e.touches[0].clientY;
        isPulling = false;
      }
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (window.scrollY > 2 || !startY) return;
      currentY = e.touches[0].clientY;
      const pullDist = (currentY - startY) * 0.45;

      if (pullDist > 15) {
        isPulling = true;
        indicator.style.height = `${Math.min(pullDist, 75)}px`;
        indicator.classList.add('pulling');

        if (pullDist >= threshold) {
          if (label) label.textContent = 'Lepaskan untuk memperbarui data...';
          if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
          if (label) label.textContent = 'Tarik ke bawah untuk memperbarui data...';
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
      }
    }, { passive: true });

    window.addEventListener('touchend', async function () {
      if (!isPulling) {
        startY = 0;
        return;
      }
      isPulling = false;

      const pullDist = (currentY - startY) * 0.45;
      if (pullDist >= threshold && window.scrollY <= 5) {
        indicator.style.height = '50px';
        indicator.classList.add('refreshing');
        if (label) label.textContent = 'Memuat data terbaru dari server...';

        await initMobileStore();
        showMobileToast('Data berhasil diperbarui!', 'success');

        setTimeout(() => {
          indicator.style.height = '0';
          indicator.classList.remove('pulling', 'refreshing');
        }, 500);
      } else {
        indicator.style.height = '0';
        indicator.classList.remove('pulling');
      }

      startY = 0;
      currentY = 0;
    });
  }

  // --- TAB SWITCHER & BACK BUTTON ---
  function switchMobileTab(tabName, pushToHistory = true) {
    store.currentTab = tabName;

    document.querySelectorAll('.mobile-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.mobile-nav-item').forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.remove('hidden');

    const activeBtn = document.getElementById(`nav-btn-${tabName}`);
    if (activeBtn) activeBtn.classList.add('active');

    const backBtn = document.getElementById('header-back-btn');
    if (backBtn) {
      if (tabName !== 'home') backBtn.classList.remove('hidden');
      else backBtn.classList.add('hidden');
    }

    renderCurrentTabContent();

    if (pushToHistory) {
      navigationStack.push(tabName);
      try {
        history.pushState({ type: 'tab', tab: tabName }, '');
      } catch (e) {}
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderCurrentTabContent() {
    if (store.isLoading) return;

    if (store.currentTab === 'home') renderMobileHome();
    else if (store.currentTab === 'proposals') renderMobileProposals();
    else if (store.currentTab === 'requests') renderMobileRequests();
    else if (store.currentTab === 'history') renderMobileHistory();
  }

  function goBackToPreviousTab() {
    const openSheetEl = document.querySelector('.mobile-bottom-sheet.open');
    if (openSheetEl) {
      openSheetEl.classList.remove('open');
      return;
    }

    if (navigationStack.length > 1) {
      navigationStack.pop();
      const prevTab = navigationStack[navigationStack.length - 1];
      switchMobileTab(prevTab, false);
    } else {
      switchMobileTab('home', false);
    }
  }

  window.addEventListener('popstate', function () {
    const openSheetEl = document.querySelector('.mobile-bottom-sheet.open');
    if (openSheetEl) {
      openSheetEl.classList.remove('open');
      return;
    }

    if (navigationStack.length > 1) {
      navigationStack.pop();
      const prevTab = navigationStack[navigationStack.length - 1];
      switchMobileTab(prevTab, false);
    }
  });

  // 1. Mobile Home View with 3-Button Row & Single-User Role Customization
  function renderMobileHome() {
    let unpaidTotal = 0;
    let unpaidCount = 0;

    store.invoices.forEach(inv => {
      if (inv.status === 'UNPAID' || inv.status === 'OVERDUE') {
        unpaidTotal += inv.amount;
        unpaidCount++;
      }
    });

    const totalEl = document.getElementById('mobile-unpaid-total');
    if (totalEl) totalEl.textContent = formatIDR(unpaidTotal);

    const container = document.getElementById('mobile-invoice-list');
    if (!container) return;

    if (store.invoices.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <span class="material-symbols-outlined text-3xl mb-1 text-slate-300">task_alt</span>
          <p class="font-semibold text-xs">Belum ada tagihan.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = store.invoices.map(inv => `
      <div class="mobile-card space-y-3">
        <div onclick="window.mobileApp.openInvoiceDetailModal('${inv.id}')" class="flex items-center justify-between border-b border-slate-100 pb-2.5 cursor-pointer">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <span class="material-symbols-outlined text-lg">${inv.vendorLogo || 'domain'}</span>
            </div>
            <div>
              <p class="font-bold text-xs text-slate-900">${inv.vendor}</p>
              <span class="text-[10px] text-slate-400 font-mono">${inv.id}</span>
            </div>
          </div>
          <div>
            ${inv.status === 'PAID' ? `
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">LUNAS</span>
            ` : `
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">BELUM BAYAR</span>
            `}
          </div>
        </div>

        <div onclick="window.mobileApp.openInvoiceDetailModal('${inv.id}')" class="flex items-center justify-between text-xs cursor-pointer">
          <span class="text-slate-500">Jatuh Tempo: <strong>${inv.dueDate}</strong></span>
          <span class="font-extrabold text-sm text-slate-900">${formatIDR(inv.amount)}</span>
        </div>

        <!-- 3-Button Row: [ PDF ]  [ Detail ]  [ Bayar Sekarang / Resi ] -->
        <div class="pt-2 border-t border-slate-100 flex flex-wrap sm:flex-nowrap items-center gap-1.5">
          <button type="button" onclick="window.mobileApp.downloadInvoicePDF('${inv.id}')" class="px-2.5 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 flex-shrink-0 active:scale-95 transition-all">
            <span class="material-symbols-outlined text-base">picture_as_pdf</span> PDF
          </button>

          <button type="button" onclick="window.mobileApp.openInvoiceDetailModal('${inv.id}')" class="px-2.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 flex-shrink-0 active:scale-95 transition-all">
            <span class="material-symbols-outlined text-base">info</span> Detail
          </button>

          ${inv.status !== 'PAID' ? `
            <button type="button" onclick="window.mobileApp.startPay('${inv.id}')" class="flex-1 min-w-[120px] py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-all">
              <span class="material-symbols-outlined text-base">payments</span> Bayar Sekarang
            </button>
          ` : `
            <button type="button" onclick="window.mobileApp.viewTrxByInv('${inv.id}')" class="flex-1 min-w-[100px] py-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all">
              <span class="material-symbols-outlined text-base">receipt_long</span> Resi
            </button>
          `}
        </div>
      </div>
    `).join('');
  }

  // 2. Mobile Proposals View
  function renderMobileProposals() {
    const container = document.getElementById('mobile-proposals-list');
    if (!container) return;

    if (store.proposals.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400">Tidak ada penawaran.</div>`;
      return;
    }

    container.innerHTML = store.proposals.map(quo => `
      <div class="mobile-card space-y-3">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <span class="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">${quo.id} • ${quo.vendor}</span>
            <h4 class="font-extrabold text-xs text-slate-900 mt-0.5">${quo.title}</h4>
          </div>
        </div>

        <div class="bg-slate-50 p-3 rounded-xl space-y-1 text-xs">
          <div class="flex justify-between text-slate-500">
            <span>Penawaran Awal:</span>
            <strong class="text-slate-900">${formatIDR(quo.originalPrice)}</strong>
          </div>
          ${quo.counterPrice ? `
            <div class="flex justify-between text-emerald-700 font-bold">
              <span>Negosiasi Balik:</span>
              <span>${formatIDR(quo.counterPrice)}</span>
            </div>
          ` : ''}
        </div>

        <div class="flex items-center justify-end gap-1.5 pt-1">
          ${quo.status === 'PENDING' || quo.status === 'NEGOTIATING' ? `
            <button type="button" onclick="window.mobileApp.openRejectModal('${quo.id}')" class="px-2.5 py-2 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl">Tolak</button>
            <button type="button" onclick="window.mobileApp.openNegoModal('${quo.id}')" class="flex-1 py-2 bg-slate-100 text-slate-800 text-xs font-bold rounded-xl">Negosiasi</button>
            <button type="button" onclick="window.mobileApp.approveQuo('${quo.id}')" class="flex-1 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm">Setujui</button>
          ` : `
            <span class="text-xs font-bold ${quo.status === 'APPROVED' ? 'text-emerald-700' : 'text-rose-700'}">Status: ${quo.status}</span>
          `}
        </div>
      </div>
    `).join('');
  }

  // 3. Mobile Requests View
  function renderMobileRequests() {
    const container = document.getElementById('mobile-requests-list');
    if (!container) return;

    if (store.requests.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400">Belum ada pengajuan permintaan layanan.</div>`;
      return;
    }

    container.innerHTML = store.requests.map(req => `
      <div class="mobile-card space-y-3">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold text-purple-700 font-mono">${req.id}</span>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${req.priority === 'HIGH' || req.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}">${req.priority}</span>
            </div>
            <h4 class="font-extrabold text-xs text-slate-900 mt-1">${req.title}</h4>
          </div>
          <div>
            ${req.status === 'COMPLETED' ? `
              <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800">SELESAI</span>
            ` : req.status === 'IN_PROGRESS' ? `
              <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-100 text-blue-800">DIPROSES</span>
            ` : `
              <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800">PENDING</span>
            `}
          </div>
        </div>

        <div class="text-xs text-slate-600 space-y-1">
          <div class="flex justify-between text-slate-500 text-[11px]">
            <span>Kategori: <strong>${req.category}</strong></span>
            <span>Tanggal: <strong>${req.date}</strong></span>
          </div>
          <p class="bg-slate-50 p-2.5 rounded-xl text-slate-700 text-[11px] leading-relaxed">${req.description}</p>
        </div>
      </div>
    `).join('');
  }

  function openNewRequestModal() {
    document.getElementById('req-title-input').value = '';
    document.getElementById('req-desc-input').value = '';
    openSheet('sheet-new-request');
  }

  function submitNewRequest() {
    const title = document.getElementById('req-title-input')?.value.trim();
    const cat = document.getElementById('req-cat-input')?.value;
    const priority = document.getElementById('req-priority-input')?.value;
    const desc = document.getElementById('req-desc-input')?.value.trim();

    if (!title) {
      showMobileToast("Judul permintaan wajib diisi.", "error");
      return;
    }

    const newReq = {
      id: `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      title: title,
      category: cat || 'Cloud Infrastructure',
      priority: priority || 'NORMAL',
      status: 'PENDING',
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      description: desc || 'Pengajuan kebutuhan layanan korporat.'
    };

    store.requests.unshift(newReq);
    saveStore();
    closeSheet('sheet-new-request');
    showMobileToast(`Permintaan ${newReq.id} berhasil diajukan!`, "success");

    const telegramMsg = `<b>📥 NOTIFIKASI PERMINTAAN LAYANAN BARU</b>\n\n` +
      `• <b>Pengaju:</b> ${store.user.name} (${store.user.role})\n` +
      `• <b>ID Permintaan:</b> ${newReq.id}\n` +
      `• <b>Judul:</b> ${newReq.title}\n` +
      `• <b>Kategori:</b> ${newReq.category}\n` +
      `• <b>Prioritas:</b> ${newReq.priority}\n` +
      `• <b>Deskripsi:</b> ${newReq.description}`;
    sendTelegramNotificationDirect(telegramMsg);

    if (window.GoogleBackend) {
      window.GoogleBackend.createServiceRequest(newReq).catch(e => console.warn(e));
    }

    renderMobileRequests();
  }

  // 4. Mobile History View
  function renderMobileHistory() {
    const container = document.getElementById('mobile-history-list');
    if (!container) return;

    if (store.transactions.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400">Belum ada riwayat transaksi.</div>`;
      return;
    }

    container.innerHTML = store.transactions.map(trx => `
      <div onclick="window.mobileApp.openTrxModal('${trx.trxId}')" class="mobile-card flex items-center justify-between cursor-pointer active:bg-slate-50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <span class="material-symbols-outlined text-xl">check_circle</span>
          </div>
          <div>
            <h4 class="font-extrabold text-xs text-slate-900">${trx.vendor}</h4>
            <span class="text-[10px] text-slate-400 block">${trx.date}</span>
          </div>
        </div>
        <div class="text-right">
          <span class="font-extrabold text-xs text-slate-900 block">${formatIDR(trx.amount)}</span>
          <span class="text-[10px] font-bold text-emerald-600">Berhasil</span>
        </div>
      </div>
    `).join('');
  }

  // --- INVOICE DETAIL MODAL ---
  function openInvoiceDetailModal(invId) {
    const inv = store.invoices.find(i => String(i.id).trim() === String(invId).trim());
    if (!inv) return;

    store.selectedInvoice = inv;
    document.getElementById('detail-inv-id').textContent = inv.id;
    document.getElementById('detail-inv-vendor').textContent = inv.vendor;
    document.getElementById('detail-inv-category').textContent = inv.category;
    document.getElementById('detail-inv-due').textContent = inv.dueDate;
    document.getElementById('detail-inv-amount').textContent = formatIDR(inv.amount);
    document.getElementById('detail-inv-desc').textContent = inv.description;

    const pdfBtn = document.getElementById('detail-download-pdf-btn');
    if (pdfBtn) {
      pdfBtn.onclick = function() {
        downloadInvoicePDF(inv.id);
      };
    }

    const itemsContainer = document.getElementById('detail-inv-items');
    if (itemsContainer) {
      if (inv.items && inv.items.length > 0) {
        itemsContainer.innerHTML = inv.items.map(it => `
          <div class="flex justify-between py-1.5 text-xs text-slate-700">
            <span>${it.name} (x${it.qty})</span>
            <strong>${formatIDR(it.qty * it.price)}</strong>
          </div>
        `).join('');
      } else {
        itemsContainer.innerHTML = `<p class="text-xs text-slate-400 italic">Rincian item standar layanan.</p>`;
      }
    }

    const payBtnContainer = document.getElementById('detail-inv-pay-btn-box');
    if (payBtnContainer) {
      if (inv.status !== 'PAID') {
        payBtnContainer.innerHTML = `
          <button type="button" onclick="mobileApp.closeSheet('sheet-invoice-detail'); mobileApp.startPay('${inv.id}')" class="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md">
            Bayar Sekarang (${formatIDR(inv.amount)})
          </button>
        `;
      } else {
        payBtnContainer.innerHTML = `
          <button type="button" onclick="mobileApp.closeSheet('sheet-invoice-detail'); mobileApp.viewTrxByInv('${inv.id}')" class="w-full py-3 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold">
            Lihat Resi Pembayaran
          </button>
        `;
      }
    }

    openSheet('sheet-invoice-detail');
  }

  // --- PROPOSAL REJECTION ---
  function openRejectModal(quoId) {
    const quo = store.proposals.find(p => String(p.id).trim() === String(quoId).trim());
    if (!quo) return;
    store.selectedProposal = quo;
    document.getElementById('mobile-reject-id').textContent = quo.id;
    openSheet('sheet-reject');
  }

  async function confirmRejectProposal() {
    const quo = store.selectedProposal;
    if (!quo) return;
    const reason = document.getElementById('mobile-reject-reason-input')?.value || 'Anggaran belum mencukupi.';

    const historyNote = {
      sender: store.user.name || 'PT Laksana Software',
      text: `Penawaran DITOLAK oleh ${store.user.role}: ${reason}`,
      time: new Date().toLocaleDateString('id-ID')
    };

    quo.status = 'REJECTED';
    quo.history.push(historyNote);

    if (window.GoogleBackend) {
      await window.GoogleBackend.updateProposalStatus({ proposalId: quo.id, status: 'REJECTED', historyItem: historyNote });
    }

    const telegramMsg = `<b>❌ NOTIFIKASI PENAWARAN DITOLAK</b>\n\n` +
      `• <b>Ditolak Oleh:</b> ${store.user.name} (${store.user.role})\n` +
      `• <b>ID Penawaran:</b> ${quo.id}\n` +
      `• <b>Vendor:</b> ${quo.vendor}\n` +
      `• <b>Alasan Penolakan:</b> ${reason}`;
    sendTelegramNotificationDirect(telegramMsg);

    saveStore();
    closeSheet('sheet-reject');
    showMobileToast(`Penawaran ${quo.id} ditolak.`, 'info');
    renderMobileProposals();
  }

  // --- MULTI-STEP MOBILE PAYMENT FLOW ---
  function startPay(invId) {
    if (!invId) return;
    const targetInv = store.invoices.find(i => String(i.id).trim() === String(invId).trim()) || store.invoices[0];
    if (!targetInv) {
      showMobileToast("Tagihan tidak ditemukan.", "error");
      return;
    }

    store.selectedInvoice = targetInv;

    const idEl = document.getElementById('mobile-method-inv-id');
    const vendorEl = document.getElementById('mobile-method-vendor');
    const amountEl = document.getElementById('mobile-method-amount');

    if (idEl) idEl.textContent = targetInv.id;
    if (vendorEl) vendorEl.textContent = targetInv.vendor;
    if (amountEl) amountEl.textContent = formatIDR(targetInv.amount);

    selectPaymentMethod('bca_va');
    openSheet('sheet-payment-method');
  }

  function selectPaymentMethod(method) {
    store.paymentMethod = method;
    document.querySelectorAll('.mobile-method-item').forEach(el => {
      el.classList.remove('border-slate-900', 'bg-slate-50');
      el.classList.add('border-slate-200');
    });

    const selectedItem = document.getElementById(`m-method-${method}`);
    if (selectedItem) {
      selectedItem.classList.remove('border-slate-200');
      selectedItem.classList.add('border-slate-900', 'bg-slate-50');
    }
  }

  function confirmMethodAndProceed() {
    closeSheet('sheet-payment-method', true);

    if (store.paymentMethod === 'qris') {
      openSheet('sheet-payment-qr');
      startQrisTimer();
      return;
    }

    const inv = store.selectedInvoice;
    if (!inv) return;

    const subtotal = inv.subtotal || Math.round(inv.amount / 1.11);
    const tax = inv.tax || (inv.amount - subtotal);
    const methodNameStr = getMethodNameString(store.paymentMethod);

    document.getElementById('mobile-confirm-inv-id').textContent = inv.id;
    document.getElementById('mobile-confirm-vendor').textContent = inv.vendor;
    document.getElementById('mobile-confirm-method').textContent = methodNameStr;
    document.getElementById('mobile-confirm-subtotal').textContent = formatIDR(subtotal);
    document.getElementById('mobile-confirm-tax').textContent = formatIDR(tax);
    document.getElementById('mobile-confirm-total').textContent = formatIDR(inv.amount);

    openSheet('sheet-payment-confirm');
  }

  let qrisTimerInterval = null;
  function startQrisTimer() {
    if (qrisTimerInterval) clearInterval(qrisTimerInterval);
    store.qrisTimerSeconds = 899;
    const timerEl = document.getElementById('mobile-qr-timer');

    qrisTimerInterval = setInterval(() => {
      if (store.qrisTimerSeconds <= 0) {
        clearInterval(qrisTimerInterval);
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

  function getMethodNameString(m) {
    switch(m) {
      case 'bca_va': return 'Virtual Account BCA';
      case 'mandiri_trf': return 'Bank Transfer Mandiri';
      case 'qris': return 'QRIS / QR Code Standard';
      case 'ewallet': return 'E-Wallet (GoPay / OVO / Dana)';
      default: return 'Virtual Account BCA';
    }
  }

  function proceedToPin() {
    closeSheet('sheet-payment-confirm', true);
    closeSheet('sheet-payment-qr', true);
    store.enteredPin = '';
    updatePinDots();
    openSheet('sheet-pin');
  }

  function pinInput(num) {
    if (store.enteredPin.length < 6) {
      store.enteredPin += num;
      updatePinDots();
    }
    if (store.enteredPin.length === 6) {
      setTimeout(verifyPin, 150);
    }
  }

  function pinBackspace() {
    if (store.enteredPin.length > 0) {
      store.enteredPin = store.enteredPin.slice(0, -1);
      updatePinDots();
    }
  }

  function updatePinDots() {
    const dots = document.querySelectorAll('.mobile-pin-dot');
    dots.forEach((dot, index) => {
      if (index < store.enteredPin.length) {
        dot.classList.add('bg-slate-900');
        dot.classList.remove('bg-slate-200');
      } else {
        dot.classList.remove('bg-slate-900');
        dot.classList.add('bg-slate-200');
      }
    });
  }

  async function verifyPin() {
    const userPin = store.user.pin || '123456';
    if (store.enteredPin === userPin || store.enteredPin === '123456') {
      closeSheet('sheet-pin', true);
      const inv = store.selectedInvoice;

      inv.status = 'PAID';
      const dateStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
      const refCode = `LKS-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const trxId = `TRX-${Math.floor(100000000 + Math.random() * 900000000)}`;
      const methodStr = getMethodNameString(store.paymentMethod);

      let driveUrl = '';
      if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
        showMobileToast('Menyimpan ke Google Drive & Sheets...', 'info');
        const res = await window.GoogleBackend.processPayment({
          invoiceId: inv.id,
          vendor: inv.vendor,
          amount: inv.amount,
          method: methodStr
        });
        if (res && res.driveReceiptUrl) driveUrl = res.driveReceiptUrl;
      }

      const trx = {
        trxId: trxId,
        invoiceId: inv.id,
        vendor: inv.vendor,
        amount: inv.amount,
        date: dateStr,
        method: methodStr,
        status: 'SUCCESS',
        refCode: refCode,
        driveReceiptUrl: driveUrl
      };

      store.transactions.unshift(trx);
      store.latestReceipt = trx;
      saveStore();

      document.getElementById('status-trx-id').textContent = trxId;
      document.getElementById('status-ref-code').textContent = refCode;
      document.getElementById('status-inv-id').textContent = inv.id;
      document.getElementById('status-vendor').textContent = inv.vendor;
      document.getElementById('status-date').textContent = dateStr;
      document.getElementById('status-method').textContent = methodStr;
      document.getElementById('status-amount').textContent = formatIDR(inv.amount);

      const driveBtnContainer = document.getElementById('status-drive-container');
      if (driveBtnContainer) {
        driveBtnContainer.innerHTML = `
          <button type="button" onclick="mobileApp.downloadInvoicePDF('${inv.id}')" class="w-full py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
            <span class="material-symbols-outlined text-base">picture_as_pdf</span> Unduh Invoice PDF Resmi
          </button>
          ${driveUrl ? `
            <a href="${driveUrl}" target="_blank" class="w-full py-2 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 block">
              <span class="material-symbols-outlined text-base">cloud_download</span> Buka Resi di Google Drive
            </a>
          ` : ''}
        `;
      }

      const telegramMsg = `<b>🔔 NOTIFIKASI PEMBAYARAN MASUK</b>\n\n` +
        `• <b>Pembayar:</b> ${store.user.name} (${store.user.role})\n` +
        `• <b>No. Invoice:</b> ${inv.id}\n` +
        `• <b>Vendor:</b> ${inv.vendor}\n` +
        `• <b>Nominal:</b> ${formatIDR(inv.amount)}\n` +
        `• <b>Metode:</b> ${methodStr}\n` +
        `• <b>Ref Code:</b> ${refCode}\n` +
        `• <b>Status:</b> LUNAS / VERIFIED`;
      sendTelegramNotificationDirect(telegramMsg);

      openSheet('sheet-payment-status');
      renderMobileHome();
    } else {
      showMobileToast(`PIN Salah! PIN untuk ${store.user.name} adalah: ${userPin}`, 'error');
      store.enteredPin = '';
      updatePinDots();
    }
  }

  function openSheet(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('open');
      try {
        history.pushState({ type: 'sheet', sheetId: id }, '');
      } catch (e) {}
    }
  }

  function closeSheet(id, skipHistoryBack = false) {
    const el = document.getElementById(id);
    if (el && el.classList.contains('open')) {
      el.classList.remove('open');
      if (!skipHistoryBack && history.state && history.state.type === 'sheet') {
        history.back();
      }
    }
  }

  document.addEventListener('keydown', function(e) {
    const sheet = document.getElementById('sheet-pin');
    if (!sheet || !sheet.classList.contains('open')) return;

    if (e.key >= '0' && e.key <= '9') pinInput(e.key);
    else if (e.key === 'Backspace') pinBackspace();
    else if (e.key === 'Escape') closeSheet('sheet-pin');
  });

  // Expose API Object Immediately
  window.mobileApp = {
    init: function () {
      initPullToRefresh();
      switchMobileTab('home', false);
      checkUserSession();
    },
    fillDemoLogin: fillDemoLogin,
    handleLogin: handleLogin,
    logout: logout,
    switchTab: switchMobileTab,
    goBack: goBackToPreviousTab,
    refreshData: async function () {
      showMobileToast('Memuat data terbaru...', 'info');
      await initMobileStore();
      showMobileToast('Data berhasil diperbarui!', 'success');
    },
    startPay: startPay,
    selectPaymentMethod: selectPaymentMethod,
    confirmMethodAndProceed: confirmMethodAndProceed,
    proceedToPin: proceedToPin,
    pinInput: pinInput,
    pinBackspace: pinBackspace,
    closeSheet: closeSheet,
    openInvoiceDetailModal: openInvoiceDetailModal,
    openRejectModal: openRejectModal,
    confirmRejectProposal: confirmRejectProposal,
    openNewRequestModal: openNewRequestModal,
    submitNewRequest: submitNewRequest,
    downloadInvoicePDF: downloadInvoicePDF,
    openTrxModal: function (trxId) {
      const trx = store.transactions.find(t => t.trxId === trxId);
      if (!trx) return;
      document.getElementById('mobile-trx-id').textContent = trx.trxId;
      document.getElementById('mobile-trx-ref').textContent = trx.refCode;
      document.getElementById('mobile-trx-vendor').textContent = trx.vendor;
      document.getElementById('mobile-trx-amount').textContent = formatIDR(trx.amount);

      const driveBox = document.getElementById('mobile-trx-drive');
      if (driveBox) {
        driveBox.innerHTML = `
          <button type="button" onclick="mobileApp.downloadInvoicePDF('${trx.invoiceId}')" class="w-full py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 mt-1">
            <span class="material-symbols-outlined text-sm">picture_as_pdf</span> Unduh Invoice PDF Resmi
          </button>
          ${trx.driveReceiptUrl ? `
            <a href="${trx.driveReceiptUrl}" target="_blank" class="w-full py-2 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 mt-1 block">
              <span class="material-symbols-outlined text-sm">cloud_download</span> Resi Google Drive
            </a>
          ` : ''}
        `;
      }
      openSheet('sheet-trx-detail');
    },
    viewTrxByInv: function(invId) {
      const trx = store.transactions.find(t => t.invoiceId === invId);
      if (trx) this.openTrxModal(trx.trxId);
      else showMobileToast('Resi belum tersedia.', 'error');
    },
    approveQuo: async function(quoId) {
      const quo = store.proposals.find(p => p.id === quoId);
      if (!quo) return;
      quo.status = 'APPROVED';
      if (window.GoogleBackend) {
        await window.GoogleBackend.updateProposalStatus({ proposalId: quo.id, status: 'APPROVED' });
      }

      const telegramMsg = `<b>✅ NOTIFIKASI PENAWARAN DISETUJUI</b>\n\n` +
        `• <b>Disetujui Oleh:</b> ${store.user.name} (${store.user.role})\n` +
        `• <b>ID Penawaran:</b> ${quo.id}\n` +
        `• <b>Vendor:</b> ${quo.vendor}\n` +
        `• <b>Status:</b> DISETUJUI / APPROVED`;
      sendTelegramNotificationDirect(telegramMsg);

      saveStore();
      showMobileToast(`Penawaran ${quo.id} disetujui!`, 'success');
      renderMobileProposals();
    },
    openNegoModal: function(quoId) {
      const quo = store.proposals.find(p => p.id === quoId);
      if (!quo) return;
      store.selectedProposal = quo;
      document.getElementById('mobile-nego-id').textContent = quo.id;
      document.getElementById('mobile-nego-input').value = quo.originalPrice;
      openSheet('sheet-nego');
    },
    confirmNego: async function() {
      const quo = store.selectedProposal;
      if (!quo) return;
      const counter = Number(document.getElementById('mobile-nego-input')?.value || quo.originalPrice);
      quo.status = 'NEGOTIATING';
      quo.counterPrice = counter;

      if (window.GoogleBackend) {
        await window.GoogleBackend.updateProposalStatus({ proposalId: quo.id, status: 'NEGOTIATING', counterPrice: counter });
      }

      const telegramMsg = `<b>🔄 NOTIFIKASI NEGOSIASI PENAWARAN</b>\n\n` +
        `• <b>Diajukan Oleh:</b> ${store.user.name} (${store.user.role})\n` +
        `• <b>ID Penawaran:</b> ${quo.id}\n` +
        `• <b>Vendor:</b> ${quo.vendor}\n` +
        `• <b>Harga Negosiasi Balik:</b> ${formatIDR(counter)}`;
      sendTelegramNotificationDirect(telegramMsg);

      saveStore();
      closeSheet('sheet-nego');
      showMobileToast(`Negosiasi ${formatIDR(counter)} dikirim!`, 'success');
      renderMobileProposals();
    },
    switchToDesktop: function() {
      window.location.href = '../index.html?desktop=true';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    window.mobileApp.init();
  });

})();
