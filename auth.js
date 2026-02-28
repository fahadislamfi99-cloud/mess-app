// ==========================================
// --- AUTHENTICATION LOGIC (SECURE JWT) ---
// ==========================================

// ব্রাউজারে টোকেন থাকলে ম্যানেজার হিসেবে ধরবে, না থাকলে সাধারণ ইউজার
let isManager = localStorage.getItem('managerToken') ? true : false;

// ম্যাজিক: পুরো অ্যাপের সব রিকোয়েস্টে নিজে থেকেই সিকিউরিটি টোকেন যুক্ত করে দেওয়ার জাদুকরী কোড!
const originalFetch = window.fetch;
window.fetch = async function (url, options) {
    if (options && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
        const token = localStorage.getItem('managerToken');
        if (token) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            };
        }
    }
    // ফিক্সড: .call(window) যুক্ত করা হয়েছে যাতে ব্রাউজার ব্লক না করে
    return originalFetch.call(window, url, options); 
};

// Logout Confirm
function toggleLogin() {
    if (isManager) {
        Swal.fire({
            title: 'Logout?',
            text: "Are you sure you want to Logout?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Logout'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('managerToken'); // সিকিউরিটি টোকেন মুছে ফেলা হলো
                isManager = false;
                applyAuthRules();
                Swal.fire({ title: 'Logged Out', icon: 'success', timer: 1500, showConfirmButton: false });
            }
        });
    } else {
        document.getElementById('manager-pin').value = '';
        new bootstrap.Modal(document.getElementById('loginModal')).show();
    }
}

// Login verification through Secure Server API
async function checkPIN() {
    const pin = document.getElementById('manager-pin').value;
    const btn = document.querySelector('button[onclick="checkPIN()"]');
    const originalText = btn.innerHTML;

    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Checking...';
    btn.disabled = true;

    try {
        // ফ্রন্টএন্ডে আর পিন নেই, সরাসরি সার্ভারে পাঠিয়ে চেক করা হচ্ছে
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            // সার্ভার থেকে পাওয়া আসল ডিজিটাল টোকেন সেভ করা
            localStorage.setItem('managerToken', data.token);
            isManager = true;
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
            applyAuthRules();

            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            Toast.fire({ icon: 'success', title: 'Login Successful!' });
        } else {
            Swal.fire({ title: 'Access Denied!', text: 'আপনার দেওয়া পিনটি ভুল।', icon: 'error' });
        }
    } catch (error) {
        console.error("Login Error:", error);
        Swal.fire({ title: 'Error!', text: 'সার্ভার বা ইন্টারনেট কানেকশনে সমস্যা!', icon: 'error' });
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// নিচের কোড থাকলে শুধু manager date edit করতে পারবে এবং অপশনগুলো হাইড হবে।
function applyAuthRules() {
    const authBtn = document.getElementById('btn-auth');

    let styleTag = document.getElementById('auth-styles');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'auth-styles';
        document.head.appendChild(styleTag);
    }

    if (isManager) {
        authBtn.innerHTML = '<i class="bi bi-box-arrow-right"></i> Logout';
        authBtn.classList.replace('btn-warning', 'btn-danger');

        // ম্যানেজার হলে সবকিছু দেখাবে
        styleTag.innerHTML = ``;
    } else {
        authBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Manager Login';
        authBtn.classList.replace('btn-danger', 'btn-warning');

        // ম্যানেজার না হলে CSS ম্যাজিকের মাধ্যমে ফর্ম, ডেট ফিল্টার এবং বাটন লুকানো হবে
        styleTag.innerHTML = `
            /* Date Filter Hide */
            div:has(> #global-start-date), 
            div:has(> #global-end-date), 
            button[onclick^="applyGlobalFilter"] { 
                display: none !important; 
            }

            /* 🔒 Manager Change Hide (শুধু অ্যাডমিন চেঞ্জ করতে পারবে) 🔒 */
            div:has(> #select-manager),
            button[onclick="saveManager()"] {
                display: none !important;
            }

            /* Add Forms Hide */
            .card:has(form), form { display: none !important; }
            
            /* Action column hide (Report, Balance এবং Alert টেবিলগুলোকে বাদে) */
            table:not(:has(#table-low-balance)):not(:has(#table-balance)):not(:has(#table-report)) th.text-end:last-child, 
            table:not(:has(#table-low-balance)):not(:has(#table-balance)):not(:has(#table-report)) td.text-end:last-child { 
                display: none !important; 
            }
            
            button[onclick^="delete"], button[onclick^="openEdit"], button[onclick^="editShopperForDate"] { display: none !important; }
        `;
    }
}