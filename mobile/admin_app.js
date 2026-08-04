/* ==========================================================================
   Laksanasoft Corporate Payment Portal - Dedicated Super Admin Module Engine
   File: mobile/admin_app.js (Dedicated Super Admin Code - Same Directory)
   Includes Full Admin Control: User CRUD, Invoice/Proposal Suite & ACC Engine
   ========================================================================== */

(function () {
  'use strict';

  window.SuperAdminEngine = {
    // 1. Update Super Admin Header Counters & Banner
    updateCounters: function (invoices, proposals) {
      const unpaidCount = (invoices || []).filter(i => i.status !== 'PAID').length;
      const pendingQuoCount = (proposals || []).filter(p => p.status === 'PENDING' || p.status === 'NEGOTIATING').length;

      const payCountEl = document.getElementById('admin-pending-pay-count');
      const quoCountEl = document.getElementById('admin-pending-quo-count');
      if (payCountEl) payCountEl.textContent = `${unpaidCount} Tagihan`;
      if (quoCountEl) quoCountEl.textContent = `${pendingQuoCount} Vendor`;
    },

    // 2. Render Super Admin Dedicated User Chat Selector Bar
    renderChatUserSelector: function (activeRecipient, registeredUsers, onSelectCallback) {
      const container = document.getElementById('admin-user-chat-buttons');
      if (!container) return;

      let buttonsHTML = `
        <button type="button" onclick="window.SuperAdminEngine.selectChatUser('ALL', 'Semua Pengguna')" class="px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap border transition-all ${activeRecipient === 'ALL' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-700 border-slate-200'}">
          👥 Semua Chat
        </button>
      `;

      registeredUsers.forEach(u => {
        const isSelected = activeRecipient.toLowerCase() === u.userId.toLowerCase();
        buttonsHTML += `
          <button type="button" onclick="window.SuperAdminEngine.selectChatUser('${u.userId}', '${u.name}')" class="px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap border transition-all ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200'}">
            👤 ${u.name}
          </button>
        `;
      });

      container.innerHTML = buttonsHTML;
    },

    selectChatUser: function (targetUserId, targetUserName) {
      if (window.mobileApp && typeof window.mobileApp.selectAdminChatUser === 'function') {
        window.mobileApp.selectAdminChatUser(targetUserId, targetUserName);
      }
    },

    // 3. Render Super Admin Master Control Lists (Payment ACC & Request ACC)
    renderControlLists: function (invoices, requests, formatIDR) {
      const payListEl = document.getElementById('admin-acc-payment-list');
      const reqListEl = document.getElementById('admin-acc-requests-list');

      if (payListEl) {
        const unpaidInvoices = (invoices || []).filter(i => i.status !== 'PAID');
        if (unpaidInvoices.length === 0) {
          payListEl.innerHTML = `<p class="text-[11px] text-slate-400 italic">Semua tagihan telah LUNAS / terverifikasi.</p>`;
        } else {
          payListEl.innerHTML = unpaidInvoices.map(inv => `
            <div class="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
              <div>
                <span class="font-mono font-bold text-slate-900 text-[11px]">${inv.id}</span>
                <p class="text-[10px] text-slate-500">${inv.vendor} • <strong>${formatIDR(inv.amount)}</strong> ${inv.userId ? `(${inv.userId})` : ''}</p>
              </div>
              <button type="button" onclick="window.SuperAdminEngine.accPayment('${inv.id}')" class="px-2.5 py-1 bg-emerald-600 text-white font-extrabold text-[10px] rounded-lg shadow-sm active:scale-95 transition-transform">
                ACC & Verifikasi LUNAS
              </button>
            </div>
          `).join('');
        }
      }

      if (reqListEl) {
        if (!requests || requests.length === 0) {
          reqListEl.innerHTML = `<p class="text-[11px] text-slate-400 italic">Belum ada pengajuan permintaan.</p>`;
        } else {
          reqListEl.innerHTML = requests.map(req => `
            <div class="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
              <div class="flex justify-between items-center">
                <span class="font-mono font-bold text-purple-700 text-[11px]">${req.id}</span>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${req.status}</span>
              </div>
              <p class="font-bold text-[11px] text-slate-900 truncate">${req.title}</p>
              <div class="flex items-center gap-1.5 pt-1">
                <button type="button" onclick="window.SuperAdminEngine.accRequest('${req.id}', 'IN_PROGRESS')" class="px-2 py-1 bg-blue-50 text-blue-700 font-bold text-[9px] rounded-lg">Proses</button>
                <button type="button" onclick="window.SuperAdminEngine.accRequest('${req.id}', 'COMPLETED')" class="px-2 py-1 bg-emerald-50 text-emerald-700 font-bold text-[9px] rounded-lg">ACC & Selesai</button>
              </div>
            </div>
          `).join('');
        }
      }
    },

    accPayment: function (invId) {
      if (window.mobileApp && typeof window.mobileApp.adminAccPayment === 'function') {
        window.mobileApp.adminAccPayment(invId);
      }
    },

    accRequest: function (reqId, newStatus) {
      if (window.mobileApp && typeof window.mobileApp.adminAccRequest === 'function') {
        window.mobileApp.adminAccRequest(reqId, newStatus);
      }
    },

    // 4. Render Registered Users List with Full Control (Reset PIN, Suspend, Delete)
    renderRegisteredUsersList: async function (registeredUsers) {
      const container = document.getElementById('admin-registered-users-list');
      if (!container) return;

      let users = [...registeredUsers];

      if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
        try {
          const remoteUsers = await window.GoogleBackend.fetchUsers();
          if (remoteUsers && Array.isArray(remoteUsers) && remoteUsers.length > 0) {
            remoteUsers.forEach(ru => {
              const uId = String(ru.userId || ru.Username || ru.username || ru.User || '').trim();
              if (uId && !users.some(x => x.userId.toLowerCase() === uId.toLowerCase())) {
                users.push({
                  userId: uId,
                  name: String(ru.name || ru.Name || uId),
                  role: String(ru.role || ru.Role || 'Client Korporat'),
                  company: String(ru.company || ru.Company || 'PT Laksana Digital Industri'),
                  status: String(ru.status || ru.Status || 'ACTIVE').toUpperCase()
                });
              }
            });
          }
        } catch (e) {}
      }

      if (users.length === 0) {
        container.innerHTML = `<p class="text-[11px] text-slate-400 italic">Belum ada pengguna terdaftar.</p>`;
        return;
      }

      container.innerHTML = users.map(u => {
        const isSuperAdmin = u.userId.toLowerCase() === 'admin';
        const status = u.status || 'ACTIVE';
        const isSuspended = status === 'SUSPENDED';

        return `
          <div class="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-extrabold text-slate-900 text-xs">${u.name}</span>
                <span class="text-[10px] text-slate-400 font-mono block">ID: ${u.userId} • Role: ${u.role}</span>
              </div>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold ${isSuspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">
                ${status}
              </span>
            </div>

            ${!isSuperAdmin ? `
              <div class="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                <button type="button" onclick="window.SuperAdminEngine.resetUserPin('${u.userId}')" class="px-2 py-1 bg-amber-50 text-amber-800 font-bold text-[9px] rounded-lg">
                  Reset PIN
                </button>
                <button type="button" onclick="window.SuperAdminEngine.toggleUserStatus('${u.userId}', '${status}')" class="px-2 py-1 ${isSuspended ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'} font-bold text-[9px] rounded-lg">
                  ${isSuspended ? 'Aktifkan Kembali' : 'Tangguhkan (Suspend)'}
                </button>
                <button type="button" onclick="window.SuperAdminEngine.deleteUser('${u.userId}')" class="px-2 py-1 bg-rose-50 text-rose-700 font-bold text-[9px] rounded-lg">
                  Hapus Akun
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    },

    resetUserPin: function (username) {
      if (window.mobileApp && typeof window.mobileApp.adminResetUserPin === 'function') {
        window.mobileApp.adminResetUserPin(username);
      }
    },

    toggleUserStatus: function (username, currentStatus) {
      if (window.mobileApp && typeof window.mobileApp.adminToggleUserStatus === 'function') {
        window.mobileApp.adminToggleUserStatus(username, currentStatus);
      }
    },

    deleteUser: function (username) {
      if (window.mobileApp && typeof window.mobileApp.adminDeleteUser === 'function') {
        window.mobileApp.adminDeleteUser(username);
      }
    },

    deleteInvoice: function (invId) {
      if (window.mobileApp && typeof window.mobileApp.adminDeleteInvoice === 'function') {
        window.mobileApp.adminDeleteInvoice(invId);
      }
    }
  };

})();
