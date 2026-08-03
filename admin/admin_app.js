/* ==========================================================================
   Laksanasoft Corporate Payment Portal - Standalone Super Admin Suite Engine
   Directory: admin/admin_app.js
   Full Monitoring, User Management, Invoice/Proposal Generator & Real-time Chat
   ========================================================================== */

(function () {
  'use strict';

  // SYSTEM ROLES & DEFAULT ACCOUNTS
  const DEFAULT_USERS = [
    { userId: 'admin', name: 'Super Administrator', role: 'Super Admin Korporat', company: 'PT Laksana Software Solutions', pin: '123456', status: 'ACTIVE' },
    { userId: 'client1', name: 'Budi Santoso (Klien)', role: 'Client Korporat', company: 'PT Laksana Digital Industri', pin: '123456', status: 'ACTIVE' },
    { userId: 'vendor1', name: 'PT Cloud Hostindo (Vendor)', role: 'Vendor / Supplier', company: 'PT Cloud Hostindo', pin: '654321', status: 'ACTIVE' },
    { userId: 'mitra1', name: 'Mitra Integrasi Enterprise', role: 'Mitra Strategis', company: 'PT Mitra Digital Asia', pin: '888888', status: 'ACTIVE' }
  ];

  const adminStore = {
    user: {
      userId: 'admin',
      name: 'Super Administrator',
      role: 'Super Admin Korporat',
      roleType: 'ADMIN',
      company: 'PT Laksana Software Solutions',
      isLoggedIn: true
    },
    invoices: [],
    proposals: [],
    transactions: [],
    requests: [],
    chats: [],
    registeredUsers: [],
    activeChatRecipient: 'ALL',
    currentTab: 'overview'
  };

  let chatSyncInterval = null;

  // --- INITIALIZATION ---
  async function initAdminApp() {
    loadLocalStore();
    setupEventListeners();
    await fetchAllSystemData();
    renderCurrentTab();
    startRealtimeChatSync();
  }

  function loadLocalStore() {
    try {
      const savedUsers = localStorage.getItem('laksanasoft_users_db');
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        adminStore.registeredUsers = parsed.map(p => p.userData || p);
      } else {
        adminStore.registeredUsers = DEFAULT_USERS;
      }
    } catch (e) {
      adminStore.registeredUsers = DEFAULT_USERS;
    }
  }

  async function fetchAllSystemData() {
    showToast("Mengambil data seluruh sistem...", "info");

    // Aggregate from Local Storage first
    aggregateLocalStorageData();

    // Fetch from Google Backend API if available
    if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
      try {
        const remoteInvoices = await window.GoogleBackend.fetchInvoices('', 'ADMIN');
        if (remoteInvoices && Array.isArray(remoteInvoices)) {
          adminStore.invoices = mergeById(adminStore.invoices, remoteInvoices);
        }

        const remoteProposals = await window.GoogleBackend.fetchProposals('', 'ADMIN');
        if (remoteProposals && Array.isArray(remoteProposals)) {
          adminStore.proposals = mergeById(adminStore.proposals, remoteProposals);
        }

        const remoteUsers = await window.GoogleBackend.fetchUsers();
        if (remoteUsers && Array.isArray(remoteUsers)) {
          remoteUsers.forEach(ru => {
            const uId = String(ru.userId || ru.Username || ru.username || ru.User || '').trim();
            if (uId && !adminStore.registeredUsers.some(x => x.userId.toLowerCase() === uId.toLowerCase())) {
              adminStore.registeredUsers.push({
                userId: uId,
                name: String(ru.name || ru.Name || uId),
                role: String(ru.role || ru.Role || 'Client Korporat'),
                company: String(ru.company || ru.Company || 'PT Laksana Digital Industri'),
                pin: String(ru.pin || ru.PIN || '123456'),
                status: String(ru.status || ru.Status || 'ACTIVE').toUpperCase()
              });
            }
          });
        }

        const remoteChats = await window.GoogleBackend.fetchChats();
        if (remoteChats && Array.isArray(remoteChats)) {
          adminStore.chats = remoteChats;
        }
      } catch (err) {
        console.warn("Gagal terhubung ke Google Backend API:", err);
      }
    }

    updateOverviewMetrics();
  }

  function aggregateLocalStorageData() {
    let allInvoices = [];
    let allProposals = [];
    let allRequests = [];

    // Scan all keys in localStorage for user-isolated records
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('laksanasoft_user_inv_')) {
        try {
          const invs = JSON.parse(localStorage.getItem(key) || '[]');
          allInvoices = allInvoices.concat(invs);
        } catch (e) {}
      } else if (key.startsWith('laksanasoft_user_prop_')) {
        try {
          const props = JSON.parse(localStorage.getItem(key) || '[]');
          allProposals = allProposals.concat(props);
        } catch (e) {}
      }
    }

    adminStore.invoices = mergeById(adminStore.invoices, allInvoices);
    adminStore.proposals = mergeById(adminStore.proposals, allProposals);

    // Shared chats
    try {
      const shared = JSON.parse(localStorage.getItem('laksanasoft_shared_chats_db') || '[]');
      if (shared.length > 0) adminStore.chats = shared;
    } catch (e) {}
  }

  function mergeById(targetArray, sourceArray) {
    const map = new Map();
    targetArray.forEach(item => map.set(String(item.id).trim(), item));
    sourceArray.forEach(item => map.set(String(item.id).trim(), item));
    return Array.from(map.values());
  }

  // --- RENDER ENGINE ---
  function renderCurrentTab() {
    const tabs = ['overview', 'users', 'invoices', 'proposals', 'requests', 'chats'];
    tabs.forEach(t => {
      const viewEl = document.getElementById(`admin-tab-${t}`);
      const btnEl = document.getElementById(`nav-btn-${t}`);
      if (viewEl) viewEl.classList.add('hidden');
      if (btnEl) btnEl.classList.remove('active');
    });

    const activeView = document.getElementById(`admin-tab-${adminStore.currentTab}`);
    const activeBtn = document.getElementById(`nav-btn-${adminStore.currentTab}`);
    if (activeView) activeView.classList.remove('hidden');
    if (activeBtn) activeBtn.classList.add('active');

    switch (adminStore.currentTab) {
      case 'overview':
        renderOverviewTab();
        break;
      case 'users':
        renderUsersTab();
        break;
      case 'invoices':
        renderInvoicesTab();
        break;
      case 'proposals':
        renderProposalsTab();
        break;
      case 'requests':
        renderRequestsTab();
        break;
      case 'chats':
        renderChatsTab();
        break;
    }
  }

  function updateOverviewMetrics() {
    const totalRev = adminStore.invoices.filter(i => i.status === 'PAID').reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
    const unpaidCount = adminStore.invoices.filter(i => i.status !== 'PAID').length;
    const pendingQuo = adminStore.proposals.filter(p => p.status === 'PENDING' || p.status === 'NEGOTIATING').length;
    const usersCount = adminStore.registeredUsers.length;

    const revEl = document.getElementById('metric-total-rev');
    const unpaidEl = document.getElementById('metric-unpaid-count');
    const quoEl = document.getElementById('metric-pending-quo');
    const usersEl = document.getElementById('metric-total-users');

    if (revEl) revEl.textContent = formatIDR(totalRev);
    if (unpaidEl) unpaidEl.textContent = `${unpaidCount} Tagihan`;
    if (quoEl) quoEl.textContent = `${pendingQuo} Penawaran`;
    if (usersEl) usersEl.textContent = `${usersCount} Pengguna`;
  }

  function renderOverviewTab() {
    updateOverviewMetrics();
    const unpaidList = document.getElementById('overview-unpaid-list');
    if (!unpaidList) return;

    const unpaid = adminStore.invoices.filter(i => i.status !== 'PAID');
    if (unpaid.length === 0) {
      unpaidList.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs italic">Semua tagihan sistem telah LUNAS terverifikasi.</div>`;
      return;
    }

    unpaidList.innerHTML = unpaid.map(inv => `
      <div class="flex items-center justify-between p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
        <div>
          <span class="font-mono font-bold text-blue-400 text-xs">${inv.id}</span>
          <h4 class="font-bold text-white text-xs mt-0.5">${inv.vendor} • <span class="text-emerald-400">${formatIDR(inv.amount)}</span></h4>
          <span class="text-[10px] text-slate-400 block">Klien: <strong>${inv.userId || 'client1'}</strong> • Jatuh Tempo: ${inv.dueDate}</span>
        </div>
        <button type="button" onclick="window.AdminAppSuite.accPayment('${inv.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg active:scale-95 transition-transform flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">check_circle</span> ACC & Verifikasi
        </button>
      </div>
    `).join('');
  }

  // --- USERS MANAGEMENT MODULE (USER CRUD) ---
  function renderUsersTab() {
    const listEl = document.getElementById('admin-users-table-body');
    if (!listEl) return;

    listEl.innerHTML = adminStore.registeredUsers.map(u => {
      const isSuperAdmin = u.userId.toLowerCase() === 'admin';
      const isSuspended = u.status === 'SUSPENDED';

      return `
        <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors">
          <td class="px-4 py-3 font-mono font-bold text-xs text-blue-400">${u.userId}</td>
          <td class="px-4 py-3 font-bold text-xs text-white">${u.name}</td>
          <td class="px-4 py-3 text-xs text-slate-300">${u.company || '-'}</td>
          <td class="px-4 py-3">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">${u.role}</span>
          </td>
          <td class="px-4 py-3 font-mono text-xs text-amber-400">${u.pin || '123456'}</td>
          <td class="px-4 py-3">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isSuspended ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}">
              ${u.status || 'ACTIVE'}
            </span>
          </td>
          <td class="px-4 py-3 text-right">
            ${!isSuperAdmin ? `
              <div class="flex items-center justify-end gap-1.5">
                <button type="button" onclick="window.AdminAppSuite.resetPin('${u.userId}')" class="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold">
                  Reset PIN
                </button>
                <button type="button" onclick="window.AdminAppSuite.toggleStatus('${u.userId}', '${u.status}')" class="px-2.5 py-1 ${isSuspended ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'} rounded-lg text-[10px] font-bold">
                  ${isSuspended ? 'Aktifkan' : 'Suspend'}
                </button>
                <button type="button" onclick="window.AdminAppSuite.deleteUser('${u.userId}')" class="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold">
                  Hapus
                </button>
              </div>
            ` : `<span class="text-[10px] text-slate-500 italic">Protected</span>`}
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderInvoicesTab() {
    const container = document.getElementById('admin-invoices-list');
    if (!container) return;

    if (adminStore.invoices.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs italic">Belum ada invoice di sistem.</div>`;
      return;
    }

    container.innerHTML = adminStore.invoices.map(inv => `
      <div class="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-xs text-blue-400">${inv.id}</span>
            <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold ${inv.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}">${inv.status}</span>
          </div>
          <span class="text-xs font-mono font-bold text-slate-400">Target: ${inv.userId || 'client1'}</span>
        </div>
        <div class="flex justify-between items-end border-t border-slate-700/40 pt-2">
          <div>
            <h4 class="font-extrabold text-sm text-white">${inv.vendor}</h4>
            <p class="text-xs text-slate-400">${inv.description}</p>
          </div>
          <div class="text-right">
            <div class="text-xs font-extrabold text-emerald-400">${formatIDR(inv.amount)}</div>
            <div class="flex items-center gap-1 mt-1 justify-end">
              ${inv.status !== 'PAID' ? `
                <button type="button" onclick="window.AdminAppSuite.accPayment('${inv.id}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg">ACC Lunas</button>
              ` : ''}
              <button type="button" onclick="window.AdminAppSuite.deleteInvoice('${inv.id}')" class="px-2.5 py-1 bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 font-bold text-[10px] rounded-lg">Hapus</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderProposalsTab() {
    const container = document.getElementById('admin-proposals-list');
    if (!container) return;

    if (adminStore.proposals.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs italic">Belum ada penawaran di sistem.</div>`;
      return;
    }

    container.innerHTML = adminStore.proposals.map(quo => `
      <div class="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60 space-y-2">
        <div class="flex justify-between items-center">
          <span class="font-mono font-bold text-xs text-purple-400">${quo.id}</span>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40">${quo.status}</span>
        </div>
        <h4 class="font-extrabold text-sm text-white">${quo.title}</h4>
        <p class="text-xs text-slate-400">Vendor: ${quo.vendor} • Target: ${quo.userId || 'client1'}</p>
        <div class="flex justify-between items-center border-t border-slate-700/40 pt-2 text-xs">
          <span class="font-bold text-slate-300">Harga: ${formatIDR(quo.originalPrice)}</span>
          <div class="flex items-center gap-1">
            <button type="button" onclick="window.AdminAppSuite.updateProposalStatus('${quo.id}', 'APPROVED')" class="px-2 py-1 bg-emerald-600 text-white font-bold text-[10px] rounded-lg">ACC</button>
            <button type="button" onclick="window.AdminAppSuite.updateProposalStatus('${quo.id}', 'REJECTED')" class="px-2 py-1 bg-rose-600 text-white font-bold text-[10px] rounded-lg">Tolak</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderRequestsTab() {
    const container = document.getElementById('admin-requests-list');
    if (!container) return;

    if (adminStore.requests.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs italic">Belum ada pengajuan permintaan layanan.</div>`;
      return;
    }

    container.innerHTML = adminStore.requests.map(req => `
      <div class="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60 space-y-2">
        <div class="flex justify-between items-center">
          <span class="font-mono font-bold text-xs text-purple-400">${req.id}</span>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${req.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">${req.status}</span>
        </div>
        <h4 class="font-extrabold text-sm text-white">${req.title}</h4>
        <p class="text-xs text-slate-400">${req.description}</p>
        <div class="flex items-center justify-end gap-1.5 border-t border-slate-700/40 pt-2">
          <button type="button" onclick="window.AdminAppSuite.updateRequestStatus('${req.id}', 'IN_PROGRESS')" class="px-2.5 py-1 bg-blue-600 text-white font-bold text-[10px] rounded-lg">Proses</button>
          <button type="button" onclick="window.AdminAppSuite.updateRequestStatus('${req.id}', 'COMPLETED')" class="px-2.5 py-1 bg-emerald-600 text-white font-bold text-[10px] rounded-lg">ACC & Selesai</button>
        </div>
      </div>
    `).join('');
  }

  function renderChatsTab() {
    renderChatUserBar();
    renderChatThread();
  }

  function renderChatUserBar() {
    const container = document.getElementById('admin-chat-user-bar');
    if (!container) return;

    let html = `
      <button type="button" onclick="window.AdminAppSuite.selectChatUser('ALL', 'Semua Pengguna')" class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${adminStore.activeChatRecipient === 'ALL' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
        👥 Semua Chat
      </button>
    `;

    adminStore.registeredUsers.forEach(u => {
      const isSelected = adminStore.activeChatRecipient.toLowerCase() === u.userId.toLowerCase();
      html += `
        <button type="button" onclick="window.AdminAppSuite.selectChatUser('${u.userId}', '${u.name}')" class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
          👤 ${u.name}
        </button>
      `;
    });

    container.innerHTML = html;
  }

  function renderChatThread() {
    const container = document.getElementById('admin-chat-thread-container');
    if (!container) return;

    let filtered = [];
    if (adminStore.activeChatRecipient === 'ALL') {
      filtered = adminStore.chats;
    } else {
      const target = adminStore.activeChatRecipient.toLowerCase();
      filtered = adminStore.chats.filter(m => {
        const s = String(m.senderId || '').toLowerCase();
        const r = String(m.recipientId || '').toLowerCase();
        return s === target || r === target;
      });
    }

    if (filtered.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs italic">Belum ada percakapan dengan pengguna ini.</div>`;
      return;
    }

    container.innerHTML = filtered.map(m => {
      const isMine = String(m.senderId || '').toLowerCase() === 'admin';
      return `
        <div class="p-3 rounded-2xl ${isMine ? 'bg-blue-600/30 border border-blue-500/40 text-right ml-8' : 'bg-slate-800 border border-slate-700 text-left mr-8'} space-y-1">
          <div class="flex justify-between items-center text-[10px] font-bold text-slate-400">
            <span>${m.senderName || 'Pengguna'} (${m.senderRole || 'Client'})</span>
            <span>${m.timestamp || ''}</span>
          </div>
          <p class="text-xs text-white leading-relaxed">${m.text}</p>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  // --- ACTIONS ---
  async function sendAdminChatMessage() {
    const inputEl = document.getElementById('admin-chat-input');
    const txt = inputEl?.value.trim();
    if (!txt) return;

    const recipient = adminStore.activeChatRecipient || 'ALL';
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const newMsg = {
      senderId: 'admin',
      senderName: adminStore.user.name,
      senderRole: adminStore.user.role,
      recipientId: recipient,
      text: txt,
      timestamp: timeStr
    };

    adminStore.chats.push(newMsg);
    if (inputEl) inputEl.value = '';

    try {
      let shared = JSON.parse(localStorage.getItem('laksanasoft_shared_chats_db') || '[]');
      shared.push(newMsg);
      localStorage.setItem('laksanasoft_shared_chats_db', JSON.stringify(shared));
    } catch (e) {}

    renderChatThread();
    showToast("Pesan terkirim ke " + recipient, "success");

    if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
      window.GoogleBackend.sendChatMessage(newMsg).catch(err => console.warn(err));
    }

    const telegramMsg = `<b>💬 BALASAN CHAT SUPER ADMIN</b>\n\n` +
      `• <b>Petugas Admin:</b> ${adminStore.user.name}\n` +
      `• <b>Ditujukan Kepada:</b> ${recipient}\n` +
      `• <b>Pesan:</b> ${txt}\n` +
      `• <b>Waktu:</b> ${timeStr}`;
    sendTelegramNotificationDirect(telegramMsg);
  }

  function startRealtimeChatSync() {
    if (chatSyncInterval) clearInterval(chatSyncInterval);
    chatSyncInterval = setInterval(async () => {
      try {
        const shared = JSON.parse(localStorage.getItem('laksanasoft_shared_chats_db') || '[]');
        if (shared.length > adminStore.chats.length) {
          adminStore.chats = shared;
          if (adminStore.currentTab === 'chats') renderChatThread();
        }
      } catch (e) {}
    }, 3000);
  }

  // --- ADMIN ACTIONS (CRUD, ACC, MODALS) ---
  window.AdminAppSuite = {
    switchTab: function (tabName) {
      adminStore.currentTab = tabName;
      renderCurrentTab();
    },

    selectChatUser: function (userId, name) {
      adminStore.activeChatRecipient = userId;
      renderChatsTab();
      showToast(`Thread percakapan beralih ke [${name}]`, "info");
    },

    sendChat: function () {
      sendAdminChatMessage();
    },

    openNewUserModal: function () {
      document.getElementById('modal-new-user')?.classList.remove('hidden');
    },

    closeNewUserModal: function () {
      document.getElementById('modal-new-user')?.classList.add('hidden');
    },

    submitNewUser: async function (e) {
      if (e) e.preventDefault();
      const username = document.getElementById('nu-username')?.value.trim();
      const password = document.getElementById('nu-password')?.value.trim();
      const name = document.getElementById('nu-name')?.value.trim();
      const role = document.getElementById('nu-role')?.value;
      const company = document.getElementById('nu-company')?.value.trim();
      const pin = document.getElementById('nu-pin')?.value.trim() || '123456';

      if (!username || !password || !name) {
        showToast("Harap isi Username, Password, dan Nama Pengguna.", "error");
        return;
      }

      let roleType = 'CLIENT';
      if (role.toLowerCase().includes('admin')) roleType = 'ADMIN';
      else if (role.toLowerCase().includes('vendor')) roleType = 'VENDOR';
      else if (role.toLowerCase().includes('mitra')) roleType = 'MITRA';

      const newUser = {
        userId: username,
        name: name,
        company: company || 'PT Laksana Digital Industri',
        role: role,
        roleType: roleType,
        pin: pin,
        status: 'ACTIVE'
      };

      adminStore.registeredUsers.push(newUser);

      try {
        let localUsers = JSON.parse(localStorage.getItem('laksanasoft_users_db') || '[]');
        localUsers.push({ username: username, password: password, userData: newUser });
        localStorage.setItem('laksanasoft_users_db', JSON.stringify(localUsers));
      } catch (err) {}

      if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
        window.GoogleBackend.createUser({ username, password, name, role, company, pin }).catch(err => console.warn(err));
      }

      this.closeNewUserModal();
      showToast(`Pengguna baru [${name}] berhasil didaftarkan!`, "success");
      renderUsersTab();
    },

    resetPin: async function (username) {
      const u = adminStore.registeredUsers.find(x => x.userId.toLowerCase() === username.toLowerCase());
      if (u) u.pin = '123456';
      if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
        await window.GoogleBackend.updateUser({ username, pin: '123456' });
      }
      showToast(`PIN pengguna [${username}] di-reset ke 123456!`, "success");
      renderUsersTab();
    },

    toggleStatus: async function (username, currentStatus) {
      const u = adminStore.registeredUsers.find(x => x.userId.toLowerCase() === username.toLowerCase());
      const nextStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      if (u) u.status = nextStatus;

      if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
        await window.GoogleBackend.updateUser({ username, status: nextStatus });
      }

      showToast(`Status pengguna [${username}] diubah ke ${nextStatus}`, "success");
      renderUsersTab();
    },

    deleteUser: async function (username) {
      if (!confirm(`Apakah Anda yakin ingin menghapus pengguna [${username}]?`)) return;
      adminStore.registeredUsers = adminStore.registeredUsers.filter(x => x.userId.toLowerCase() !== username.toLowerCase());

      if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
        await window.GoogleBackend.deleteUser(username);
      }

      showToast(`Pengguna [${username}] telah dihapus dari sistem.`, "info");
      renderUsersTab();
    },

    openNewInvoiceModal: function () {
      const sel = document.getElementById('ni-target-user');
      if (sel) {
        sel.innerHTML = adminStore.registeredUsers.map(u => `<option value="${u.userId}">${u.name} [${u.role}]</option>`).join('');
      }
      document.getElementById('modal-new-invoice')?.classList.remove('hidden');
    },

    closeNewInvoiceModal: function () {
      document.getElementById('modal-new-invoice')?.classList.add('hidden');
    },

    submitNewInvoice: async function (e) {
      if (e) e.preventDefault();
      const targetUserId = document.getElementById('ni-target-user')?.value;
      const vendor = document.getElementById('ni-vendor')?.value.trim();
      const rawAmount = document.getElementById('ni-amount')?.value;
      const amount = Number(String(rawAmount || '0').replace(/[^0-9]/g, '')) || 0;
      const dueDate = document.getElementById('ni-due')?.value.trim();
      const desc = document.getElementById('ni-desc')?.value.trim();

      if (!targetUserId || !vendor || !amount || !dueDate) {
        showToast("Harap lengkapi semua bidang invoice.", "error");
        return;
      }

      const subtotal = Math.round(amount / 1.11);
      const tax = amount - subtotal;
      const invId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newInv = {
        id: invId,
        vendor: vendor,
        vendorLogo: 'domain',
        category: 'Cloud Infrastructure',
        issueDate: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        dueDate: dueDate,
        amount: amount,
        tax: tax,
        subtotal: subtotal,
        status: 'UNPAID',
        description: desc || 'Layanan TI Korporat',
        userId: targetUserId
      };

      adminStore.invoices.unshift(newInv);
      try {
        let userInvs = JSON.parse(localStorage.getItem(`laksanasoft_user_inv_${targetUserId}`) || '[]');
        userInvs.unshift(newInv);
        localStorage.setItem(`laksanasoft_user_inv_${targetUserId}`, JSON.stringify(userInvs));
      } catch (err) {}

      if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
        window.GoogleBackend.createInvoice(newInv).catch(err => console.warn(err));
      }

      this.closeNewInvoiceModal();
      showToast(`Invoice ${invId} diterbitkan untuk [${targetUserId}]!`, "success");
      renderInvoicesTab();
      updateOverviewMetrics();
    },

    accPayment: async function (invId) {
      const inv = adminStore.invoices.find(i => String(i.id).trim() === String(invId).trim());
      if (!inv) return;

      inv.status = 'PAID';
      const refCode = `LKS-ADMIN-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const trxId = `TRX-ADMIN-${Math.floor(100000000 + Math.random() * 900000000)}`;
      const methodStr = 'Manual Verifikasi Super Admin';

      if (inv.userId) {
        try {
          let targetInvoices = JSON.parse(localStorage.getItem(`laksanasoft_user_inv_${inv.userId}`) || '[]');
          const matched = targetInvoices.find(x => String(x.id).trim() === String(inv.id).trim());
          if (matched) matched.status = 'PAID';
          localStorage.setItem(`laksanasoft_user_inv_${inv.userId}`, JSON.stringify(targetInvoices));
        } catch (e) {}
      }

      if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
        window.GoogleBackend.processPayment({ invoiceId: inv.id, vendor: inv.vendor, amount: inv.amount, method: methodStr }).catch(err => console.warn(err));
      }

      showToast(`Pembayaran Invoice ${inv.id} LUNAS di-ACC Super Admin!`, "success");
      renderCurrentTab();
    },

    deleteInvoice: async function (invId) {
      if (!confirm(`Hapus Invoice ${invId}?`)) return;
      adminStore.invoices = adminStore.invoices.filter(i => String(i.id).trim() !== String(invId).trim());

      if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
        await window.GoogleBackend.deleteInvoice(invId);
      }

      showToast(`Invoice ${invId} berhasil dihapus.`, "info");
      renderInvoicesTab();
    },

    updateProposalStatus: async function (propId, status) {
      const quo = adminStore.proposals.find(p => String(p.id).trim() === String(propId).trim());
      if (quo) quo.status = status;

      if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
        await window.GoogleBackend.updateProposalStatus({ proposalId: propId, status: status });
      }

      showToast(`Status Penawaran ${propId} diubah ke ${status}`, "success");
      renderProposalsTab();
    },

    updateRequestStatus: async function (reqId, status) {
      const req = adminStore.requests.find(r => String(r.id).trim() === String(reqId).trim());
      if (req) req.status = status;

      if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
        await window.GoogleBackend.updateRequestStatus(reqId, status);
      }

      showToast(`Status Permintaan ${reqId} diubah ke ${status}`, "success");
      renderRequestsTab();
    }
  };

  // --- HELPERS ---
  function formatIDR(val) {
    const num = Number(val);
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  }

  function showToast(msg, type = 'info') {
    const toast = document.getElementById('admin-toast');
    const msgEl = document.getElementById('admin-toast-msg');
    if (!toast || !msgEl) return;

    msgEl.textContent = msg;
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl text-xs font-bold text-white flex items-center gap-2 transition-all duration-300 ${type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-blue-600'}`;
    toast.classList.remove('opacity-0', 'pointer-events-none', '-translate-y-12');

    setTimeout(() => {
      toast.classList.add('opacity-0', 'pointer-events-none', '-translate-y-12');
    }, 3500);
  }

  function sendTelegramNotificationDirect(msg) {
    if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
      window.GoogleBackend.sendChatMessage({ senderId: 'admin', senderName: 'Super Admin', senderRole: 'Super Admin', recipientId: 'BOT', text: msg });
    }
  }

  function setupEventListeners() {
    document.getElementById('form-new-user')?.addEventListener('submit', function (e) {
      window.AdminAppSuite.submitNewUser(e);
    });
    document.getElementById('form-new-invoice')?.addEventListener('submit', function (e) {
      window.AdminAppSuite.submitNewInvoice(e);
    });
  }

  document.addEventListener('DOMContentLoaded', initAdminApp);

})();
