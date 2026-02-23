// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch(err => console.log('Service Worker Error: ', err));
    });
}

// --- LIVE API CONFIGURATION ---
const API_BASE_URL = 'https://mess-backend-pg3z.onrender.com/api'; // আপনার Render URL

const state = {
    members: [],
    bazar: [],
    meals: [], 
    deposits: [], // এই লাইনটি মিসিং ছিল
    report: { totalExpense: 0, totalMeals: 0, mealRate: 0, members: [] }
};

let activeEditBtn = null; // কোন পেন আইকনে ক্লিক হয়েছে তা মনে রাখার জন্য

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth() + 1;
const todayString = today.toISOString().split('T')[0];
// --- গ্লোবাল ডেট রেঞ্জ ভ্যারিয়েবল (নতুন) ---
let globalStartDate = '';
let globalEndDate = '';

// --- AUTHENTICATION LOGIC ---
const SECRET_PIN = "2026"; // আপনি চাইলে এটি পরিবর্তন করে আপনার মতো পিন দিতে পারেন
let isManager = localStorage.getItem('isManager') === 'true';

function toggleLogin() {
    if (isManager) {
        // লগআউট করা
        if(confirm("Are you sure you want to Logout?")) {
            localStorage.setItem('isManager', 'false');
            isManager = false;
            applyAuthRules();
        }
    } else {
        // লগিন মোডাল ওপেন করা
        document.getElementById('manager-pin').value = '';
        new bootstrap.Modal(document.getElementById('loginModal')).show();
    }
}

function checkPIN() {
    const pin = document.getElementById('manager-pin').value;
    if (pin === SECRET_PIN) {
        // পিন সঠিক হলে
        localStorage.setItem('isManager', 'true');
        isManager = true;
        bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
        applyAuthRules();
        
        // লগিন সাকসেসফুল হওয়ার পর সুন্দর একটি টোস্ট (Toast) অ্যানিমেশন
        const Toast = Swal.mixin({ 
            toast: true, 
            position: 'top-end', 
            showConfirmButton: false, 
            timer: 2000 
        });
        Toast.fire({ icon: 'success', title: 'Login Successful!' });
        
    } else {
        // পিন ভুল হলে প্রফেশনাল এরর পপআপ
        Swal.fire({
            title: 'Access Denied!',
            text: 'আপনার দেওয়া পিনটি ভুল। দয়া করে আবার চেষ্টা করুন।',
            icon: 'error',
            confirmButtonColor: '#d33',
            confirmButtonText: 'Try Again'
        });
    }
}

// নিচের কোড থাকলে সবাই date edit করতে পারবে।

// function applyAuthRules() {
//     const authBtn = document.getElementById('btn-auth');
    
//     let styleTag = document.getElementById('auth-styles');
//     if (!styleTag) {
//         styleTag = document.createElement('style');
//         styleTag.id = 'auth-styles';
//         document.head.appendChild(styleTag);
//     }

//     if (isManager) {
//         authBtn.innerHTML = '<i class="bi bi-box-arrow-right"></i> Logout';
//         authBtn.classList.replace('btn-warning', 'btn-danger');
//         // ম্যানেজার হলে সবকিছু দেখাবে
//         styleTag.innerHTML = ``; 
//     } else {
//         authBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Manager Login';
//         authBtn.classList.replace('btn-danger', 'btn-warning');
        
//         // ম্যানেজার না হলে Action বাটন লুকাবে, কিন্তু Balance টেবিলগুলোকে বাদ দিয়ে
//         styleTag.innerHTML = `
//             /* Add Forms Hide */
//             .card:has(form), form { display: none !important; }
            
//             /* Action column hide (Report, Balance এবং Alert টেবিলগুলোকে বাদে) */
//             table:not(:has(#table-low-balance)):not(:has(#table-balance)):not(:has(#table-report)) th.text-end:last-child, 
//             table:not(:has(#table-low-balance)):not(:has(#table-balance)):not(:has(#table-report)) td.text-end:last-child { 
//                 display: none !important; 
//             }
            
//             button[onclick^="delete"], button[onclick^="openEdit"] { display: none !important; }
//         `;
//     }
// }

// নিচের কোড থাকলে শুধু manager date edit করতে পারবে।
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
            /* Date Filter Hide (এটাই সেই ম্যাজিক যা বুটস্ট্র্যাপকে ওভাররাইড করবে) */
            div:has(> #global-start-date), 
            div:has(> #global-end-date), 
            button[onclick="applyGlobalFilter()"] { 
                display: none !important; 
            }

            /* Add Forms Hide */
            .card:has(form), form { display: none !important; }
            
            /* Action column hide (Report, Balance এবং Alert টেবিলগুলোকে বাদে) */
            table:not(:has(#table-low-balance)):not(:has(#table-balance)):not(:has(#table-report)) th.text-end:last-child, 
            table:not(:has(#table-low-balance)):not(:has(#table-balance)):not(:has(#table-report)) td.text-end:last-child { 
                display: none !important; 
            }
            
            button[onclick^="delete"], button[onclick^="openEdit"] { display: none !important; }
        `;
    }
}
   

// পেজ লোড হওয়ার সময় চেক করবে লগিন করা আছে কিনা
document.addEventListener('DOMContentLoaded', () => {
    applyAuthRules();
});

document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setDefaultDates();
    initGlobalDates(); // নতুন যোগ করা হলো
    loadAllData();
});


// গ্লোবাল ডেট ইনিশিয়ালাইজ করার ফাংশন
function initGlobalDates() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const offset = now.getTimezoneOffset() * 60000;
    globalStartDate = new Date(firstDay.getTime() - offset).toISOString().split('T')[0];
    globalEndDate = new Date(lastDay.getTime() - offset).toISOString().split('T')[0];

    const startInput = document.getElementById('global-start-date');
    const endInput = document.getElementById('global-end-date');
    
    if (startInput) startInput.value = globalStartDate;
    if (endInput) endInput.value = globalEndDate;

    updateDateRangeDisplay(); // UI আপডেট করবে
}

// ফিল্টার অ্যাপ্লাই করার ফাংশন
function applyGlobalFilter() {
    globalStartDate = document.getElementById('global-start-date').value;
    globalEndDate = document.getElementById('global-end-date').value;
    
    if (!globalStartDate || !globalEndDate) {
        alert("দয়া করে From এবং To তারিখ ঠিকমতো সিলেক্ট করুন।");
        return;
    }
    
    updateDateRangeDisplay(); // UI আপডেট করবে
    loadAllData(); // ডেটা রিলোড করবে
}

// UI তে সুন্দর করে তারিখ দেখানোর ফাংশন (নতুন)
function updateDateRangeDisplay() {
    const displaySpan = document.getElementById('display-date-range');
    if (displaySpan && globalStartDate && globalEndDate) {
        const startObj = new Date(globalStartDate);
        const endObj = new Date(globalEndDate);
        
        // তারিখগুলোকে "Feb 01" এবং "Feb 28, 2026" ফরম্যাটে সাজানো
        const startStr = startObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        const endStr = endObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        
        displaySpan.innerText = `(${startStr} - ${endStr})`;
    }
}


function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn.getAttribute('data-target');
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('d-none'));
            document.getElementById(target).classList.remove('d-none');
            const navbarCollapse = document.getElementById('navbarNav');
            if (navbarCollapse.classList.contains('show')) new bootstrap.Collapse(navbarCollapse).hide();
        });
    });
}

// function setDefaultDates() {
//     document.getElementById('meal-date').value = todayString;
//     document.querySelector('#form-add-bazar input[type="date"]').value = todayString;
// }

function setDefaultDates() {
    // বাংলাদেশ সময় অনুযায়ী আজকের একদম সঠিক তারিখ (Local Timezone) বের করা
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - offset).toISOString().split('T')[0];

    const mealDateInput = document.getElementById('meal-date');
    const bazarDateInput = document.querySelector('#form-add-bazar input[type="date"]');
    
    if (mealDateInput) mealDateInput.value = localDate;
    if (bazarDateInput) bazarDateInput.value = localDate;
}



// --- DATA FETCHING ---
// async function loadAllData() {
//     try {
//         await Promise.all([ fetchMembers(), fetchBazar(), fetchMeals(), fetchReport() ]);
//         renderAll();
//     } catch (error) { console.error("Error loading data:", error); }
// }

// --- DATA FETCHING (GET) ---
async function loadAllData() {
    // Promise.allSettled ব্যবহার করলে একটি ফেইল করলেও বাকিগুলো লোড হবে
    const results = await Promise.allSettled([
        fetchMembers(),
        fetchBazar(),
        fetchMeals(),
        fetchDeposits(),
        fetchReport()
    ]);
    
    // কনসোলে এরর চেক করার জন্য
    results.forEach(res => {
        if(res.status === 'rejected') console.error("API Fetch Error:", res.reason);
    });

    renderAll();
    applyAuthRules();
}

async function fetchMembers() {
    const res = await fetch(`${API_BASE_URL}/members`);
    const json = await res.json();
    if (json.success) {
        // Room Number অনুযায়ী ছোট থেকে বড় (Ascending) সাজানো হচ্ছে
        state.members = json.data.sort((a, b) => 
            a.room.localeCompare(b.room, undefined, { numeric: true })
        );
    }
}

async function fetchBazar() {
    // গ্লোবাল ডেট ব্যবহার করা হচ্ছে
    const res = await fetch(`${API_BASE_URL}/bazar?startDate=${globalStartDate}&endDate=${globalEndDate}`);
    const json = await res.json();
    if (json.success) state.bazar = json.data;
}

async function fetchMeals() {
    // গ্লোবাল ডেট ব্যবহার করা হচ্ছে
    const res = await fetch(`${API_BASE_URL}/meals?startDate=${globalStartDate}&endDate=${globalEndDate}`);
    const json = await res.json();
    if (json.success) state.meals = json.data;
}

async function fetchDeposits() {
    // গ্লোবাল ডেট ব্যবহার করা হচ্ছে
    const res = await fetch(`${API_BASE_URL}/deposits?startDate=${globalStartDate}&endDate=${globalEndDate}`);
    const json = await res.json();
    if (json.success) state.deposits = json.data;
}

// ফ্রন্টএন্ডের আপডেট করা fetchReport ফাংশন
async function fetchReport() {
    if (!globalStartDate || !globalEndDate) return;

    try {
        const res = await fetch(`${API_BASE_URL}/report?startDate=${globalStartDate}&endDate=${globalEndDate}`);
        const json = await res.json();
        
        if (json.success) {
            json.data.members.sort((a, b) => 
                String(a.room).localeCompare(String(b.room), undefined, { numeric: true })
            );
            state.report = json.data;
            if (typeof renderReportTable === 'function') {
                renderReportTable();
            }
        }
    } catch (error) {
        console.error("Error fetching report:", error);
    }
}

// --- RENDERING ---
function renderAll() {
    renderDashboard(); renderMembersTable(); renderMealChecklist(); renderMealTables(); 
    renderBazarTable(); renderDeposits(); renderDepositSelect(); renderReportTable(); 
    renderManagerSelection(); renderBalanceTable(); renderLowBalanceAlert();
}

function renderDashboard() {
    const activeMembers = state.members.filter(m => m.isActive).length;
    const totalExpense = state.report.totalExpense || 0;
    
    document.getElementById('stat-members').innerText = activeMembers;
    document.getElementById('stat-meals').innerText = state.report.totalMeals || 0;
    document.getElementById('stat-expense').innerText = totalExpense;
    document.getElementById('stat-rate').innerText = (state.report.mealRate || 0).toFixed(2);

    // ১. মোট জমা হিসাব করা
    const totalDeposited = state.deposits.reduce((sum, d) => sum + d.amount, 0);
    document.getElementById('stat-deposit').innerText = totalDeposited;

    // ২. ম্যানেজারের কাছে থাকা ব্যালেন্স হিসাব করা
    const cashInHand = totalDeposited - totalExpense;
    const cashEl = document.getElementById('stat-cash');
    const cashTitle = document.getElementById('title-cash');
    const cashTextContainer = document.getElementById('text-cash');
    const cashCard = document.getElementById('card-cash');

    // যদি ব্যালেন্স মাইনাস হয় (ম্যানেজার নিজের পকেট থেকে খরচ করেছেন)
    if (cashInHand < 0) {
        cashEl.innerText = Math.abs(cashInHand); // মাইনাস চিহ্ন না দেখিয়ে পজিটিভ দেখাবে
        cashTitle.innerText = "Manager's Due (ম্যানেজার পাবে)";
        cashTitle.className = "text-danger mb-1 fw-bold";
        cashTextContainer.className = "mb-0 text-danger";
        cashCard.classList.replace('border-dark', 'border-danger');
        cashCard.classList.replace('border-success', 'border-danger');
    } 
    // যদি ব্যালেন্স প্লাস হয় (ম্যানেজারের হাতে টাকা আছে)
    else {
        cashEl.innerText = cashInHand;
        cashTitle.innerText = "Cash in Hand (ক্যাশ আছে)";
        cashTitle.className = "text-success mb-1 fw-bold";
        cashTextContainer.className = "mb-0 text-success";
        cashCard.classList.replace('border-dark', 'border-success');
        cashCard.classList.replace('border-danger', 'border-success');
    }
}

// মেম্বার লিস্ট রেন্ডার ও Edit বাটন যোগ করা
function renderMembersTable() {
    const tbody = document.getElementById('table-members');
    tbody.innerHTML = '';
    state.members.forEach(member => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div class="fw-bold">${member.name}</div></td>
            <td>${member.room}</td>
            <td><span class="badge ${member.isActive ? 'bg-success' : 'bg-secondary'}">${member.isActive ? 'Active' : 'Inactive'}</span></td>
            <td class="text-end">
                <button onclick="openEditMemberModal(this, '${member._id}', '${member.name}', '${member.room}')" class="btn btn-sm btn-outline-primary me-1"><i class="bi bi-pencil"></i></button>
                <button onclick="deleteMember('${member._id}')" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderDeposits() {
    const tbody = document.getElementById('table-deposits') || document.getElementById('table-deposit');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (state.deposits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No deposits found for this month.</td></tr>`;
        return;
    }

    // ১. ডেপোজিটগুলোকে মেম্বার অনুযায়ী গ্রুপ (Group) করা
    const groupedDeposits = {};
    state.deposits.forEach(entry => {
        const memberId = entry.member._id || entry.member;
        if (!groupedDeposits[memberId]) {
            groupedDeposits[memberId] = [];
        }
        groupedDeposits[memberId].push(entry);
    });

    // ২. রুম নাম্বার অনুযায়ী লিস্টটিকে সাজানো (Sorting)
    const sortedMemberIds = Object.keys(groupedDeposits).sort((idA, idB) => {
        const memberA = state.members.find(m => m._id === idA);
        const memberB = state.members.find(m => m._id === idB);
        const roomA = memberA ? String(memberA.room) : '';
        const roomB = memberB ? String(memberB.room) : '';
        return roomA.localeCompare(roomB, undefined, { numeric: true });
    });

    // ৩. সাজানো সিরিয়াল অনুযায়ী টেবিলে রেন্ডার করা
    sortedMemberIds.forEach(memberId => {
        const items = groupedDeposits[memberId];
        
        const memberObj = state.members.find(m => m._id === memberId);
        const memberName = memberObj ? memberObj.name : 'Unknown Member';
        const roomNum = memberObj ? memberObj.room : 'N/A';
        
        const memberTotal = items.reduce((sum, current) => sum + current.amount, 0);

        // মেম্বারের জন্য একটি হাইলাইটেড সারি (Header Row)
        tbody.innerHTML += `
            <tr class="table-light border-bottom border-success">
                <td colspan="2" class="fw-bold text-success">
                    <i class="bi bi-person-check me-2"></i>${memberName} <span class="text-secondary small ms-1">(Room: ${roomNum})</span>
                </td>
                <td class="text-end fw-bold text-dark">Total: ৳${memberTotal}</td>
                <td></td>
            </tr>
        `;

        // --- ম্যাজিক আপডেট: একদম লেটেস্ট এন্ট্রি সবার উপরে রাখার লজিক ---
        const sortedItems = items.sort((a, b) => {
            const dateDiff = new Date(b.date) - new Date(a.date);
            if (dateDiff !== 0) return dateDiff; // যদি তারিখ আলাদা হয়, তবে তারিখ অনুযায়ী সাজাবে
            
            // যদি তারিখ একই হয়, তবে ডাটাবেসে সেভ হওয়া লেটেস্ট আইডি (Time) অনুযায়ী সাজাবে
            return String(b._id).localeCompare(String(a._id));
        });
        
        sortedItems.forEach(entry => {
            const dateObj = new Date(entry.date);
            const niceDate = dateObj.toLocaleDateString('en-GB'); 
            const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'short' });

            const isRefund = entry.amount < 0; 
            const typeText = isRefund ? '<span class="text-danger fw-bold"><i class="bi bi-arrow-return-left me-1"></i> Refund</span>' : 'Cash In';
            const amountColor = isRefund ? 'text-danger' : 'text-success';

            tbody.innerHTML += `
                <tr>
                    <td class="text-muted small ps-4">↳ ${niceDate} <span class="text-secondary" style="font-size: 0.75rem;">(${dayName})</span></td>
                    <td class="text-muted small">${typeText}</td>
                    <td class="text-end fw-bold ${amountColor}">৳${entry.amount}</td>
                    <td class="text-end">
                        <button onclick="deleteDeposit('${entry._id}')" class="btn btn-sm btn-outline-danger" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    });
}

function renderMealChecklist() {
    const container = document.getElementById('meal-member-list');
    if (!container) return;
    container.innerHTML = '';
    
    const activeMembers = state.members.filter(m => m.isActive);
    if(activeMembers.length === 0) {
        container.innerHTML = `<p class="text-muted mb-0">No active members found.</p>`;
        return;
    }

    // --- নতুন: Select All অপশন তৈরি করা ---
    const selectAllDiv = document.createElement('div');
    selectAllDiv.className = 'form-check mb-3 border-bottom pb-2';
    selectAllDiv.innerHTML = `
        <input class="form-check-input border-primary" type="checkbox" id="meal-select-all">
        <label class="form-check-label w-100 cursor-pointer fw-bold text-primary" for="meal-select-all">
            Select All Members
        </label>
    `;
    container.appendChild(selectAllDiv);

    // --- সাধারণ মেম্বারদের লিস্ট তৈরি করা ---
    activeMembers.forEach(member => {
        const div = document.createElement('div');
        div.className = 'form-check mb-2';
        div.innerHTML = `
            <input class="form-check-input meal-checkbox" type="checkbox" value="${member._id}" id="meal-mem-${member._id}">
            <label class="form-check-label w-100 cursor-pointer" for="meal-mem-${member._id}">
                ${member.name} <span class="text-muted small">(${member.room})</span>
            </label>
        `;
        container.appendChild(div);
    });

    const checkboxes = document.querySelectorAll('.meal-checkbox');
    const selectAllCheckbox = document.getElementById('meal-select-all');

    // কাউন্ট আপডেট করার ফাংশন
    const updateCount = () => {
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        document.getElementById('meal-count-preview').innerText = checkedCount;
        
        // যদি সবাই সিলেক্টেড থাকে, তবে Select All বক্সে অটোমেটিক টিক পড়বে
        if(checkedCount === checkboxes.length && checkboxes.length > 0) {
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.checked = false;
        }
    };

    // --- নতুন: Select All বাটনে ক্লিক করার লজিক ---
    selectAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        checkboxes.forEach(cb => {
            cb.checked = isChecked;
        });
        updateCount(); // কাউন্ট আপডেট হবে
    });

    // প্রতিটি মেম্বারের চেকবক্সে ক্লিক করলে কাউন্ট আপডেট হবে
    checkboxes.forEach(cb => cb.addEventListener('change', updateCount));
    
    updateCount(); // শুরুতে কাউন্ট ০ দেখানোর জন্য
}

function renderMealTables() {
    const todayContainer = document.getElementById('today-meals-container');
    const dashboardTodayContainer = document.getElementById('dashboard-today-meals-container');
    const historyBody = document.getElementById('table-meal-history');
    
    if(todayContainer) todayContainer.innerHTML = '';
    if(dashboardTodayContainer) dashboardTodayContainer.innerHTML = '';
    if(historyBody) historyBody.innerHTML = '';

    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(now.getTime() - offset)).toISOString().split('T')[0];

    const todaysMeals = state.meals.filter(meal => meal.date.startsWith(localISOTime));
    const previousMeals = state.meals; 

    // ==========================================
    // ৩. Today's Meals টেবিল (অপরিবর্তিত)
    // ==========================================
    const groupedTodaysMeals = {};
    todaysMeals.forEach(meal => {
        if (!groupedTodaysMeals[meal.mealType]) {
            groupedTodaysMeals[meal.mealType] = { type: meal.mealType, memberIds: [] };
        }
        const ids = meal.members.map(m => m._id || m);
        groupedTodaysMeals[meal.mealType].memberIds.push(...ids);
    });

    const mealOrder = ["Sehri", "Breakfast", "Lunch", "Iftar", "Dinner"];
    const sortedMealTypes = Object.keys(groupedTodaysMeals).sort((a, b) => {
        let indexA = mealOrder.indexOf(a);
        let indexB = mealOrder.indexOf(b);
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
    });

    let todayTableHTML = ''; 

    if (todaysMeals.length === 0) {
        todayTableHTML = `<p class="text-center text-muted mb-0">আজকের জন্য এখনও কোনো মিল এন্ট্রি করা হয়নি।</p>`;
    } else {
        const membersWithActiveMeals = state.members
            .filter(m => m.isActive)
            .filter(member => {
                return todaysMeals.some(meal => 
                    meal.members.some(m => (m._id || m) === member._id)
                );
            })
            .sort((a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true }));

        todayTableHTML = `
            <div class="table-responsive">
                <table class="table table-bordered align-middle text-center bg-white mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>ক্র.নং</th>
                            <th class="text-start">নাম</th>
                            <th>রুম</th>
        `;

        sortedMealTypes.forEach(type => {
            todayTableHTML += `<th class="text-primary text-uppercase">${type}</th>`;
        });

        todayTableHTML += `</tr></thead><tbody>`;

        membersWithActiveMeals.forEach((member, index) => {
            todayTableHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td class="text-start fw-bold">${member.name}</td>
                    <td class="text-muted">${member.room}</td>
            `;

            sortedMealTypes.forEach(type => {
                const mealCount = groupedTodaysMeals[type].memberIds.filter(id => id === member._id).length;
                
                if (mealCount > 0) {
                    const checkMarks = '✅'.repeat(mealCount);
                    todayTableHTML += `<td><span class="text-success" style="font-size: 1.2rem; letter-spacing: 2px;">${checkMarks}</span></td>`;
                } else {
                    todayTableHTML += `<td><span class="text-danger" style="font-size: 1.2rem;">❌</span></td>`;
                }
            });

            todayTableHTML += `</tr>`;
        });

        todayTableHTML += `</tbody></table></div>`;
        
        if (todayContainer) {
            todayTableHTML += `<p class="text-muted small mt-2 text-end">* মিল এডিট বা ডিলিট করতে নিচে Meal History সেকশন ব্যবহার করুন।</p>`;
        }
    }

    if (todayContainer) todayContainer.innerHTML = todayTableHTML;
    if (dashboardTodayContainer) dashboardTodayContainer.innerHTML = todayTableHTML;

    // ==========================================
    // ৪. Previous Meals (History) রেন্ডার করা
    // ==========================================
    if (!historyBody) return;

    if (previousMeals.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">এই মাসে কোনো আগের মিল খুঁজে পাওয়া যায়নি।</td></tr>`;
    } else {
        const groupedPreviousMeals = {};
        previousMeals.forEach(meal => {
            const dateStr = meal.date.split('T')[0];
            if (!groupedPreviousMeals[dateStr]) {
                groupedPreviousMeals[dateStr] = [];
            }
            groupedPreviousMeals[dateStr].push(meal);
        });

        const sortedDates = Object.keys(groupedPreviousMeals).sort((a, b) => new Date(b) - new Date(a));

        sortedDates.forEach(dateStr => {
            const dateObj = new Date(dateStr);
            const niceDate = dateObj.toLocaleDateString('en-GB');
            const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'short' });
            
            const mealsOnDate = groupedPreviousMeals[dateStr];
            const dayTotalMeals = mealsOnDate.reduce((sum, currentMeal) => sum + currentMeal.totalMeals, 0);

            const dailyBazars = state.bazar.filter(b => b.date.startsWith(dateStr));
            const dailyExpense = dailyBazars.reduce((sum, b) => sum + b.amount, 0);
            const dailyRate = dayTotalMeals > 0 ? (dailyExpense / dayTotalMeals) : 0;

            mealsOnDate.sort((a, b) => {
                let indexA = mealOrder.indexOf(a.mealType);
                let indexB = mealOrder.indexOf(b.mealType);
                if (indexA === -1) indexA = 999;
                if (indexB === -1) indexB = 999;
                return indexA - indexB;
            });

            // তারিখের হেডার (মোবাইল ও ডেস্কটপ উভয়ের জন্য রেস্পন্সিভ)
            historyBody.innerHTML += `
                <tr class="table-light border-bottom border-secondary">
                    <td colspan="5" class="pb-2 pt-3 px-3">
                        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
                            <div class="fw-bold text-dark mb-2 mb-md-0">
                                <i class="bi bi-calendar-event text-primary me-2"></i>${niceDate} <span class="text-muted small">(${dayName})</span>
                                <span class="badge bg-warning bg-opacity-25 text-dark ms-2 border border-warning">Daily Rate: ৳${dailyRate.toFixed(2)}</span>
                            </div>
                            <div class="fw-bold text-primary">Total Meals: ${dayTotalMeals}</div>
                        </div>
                    </td>
                </tr>
            `;

            mealsOnDate.forEach(meal => {
                const memberNames = meal.members.map(m => {
                    const found = state.members.find(sm => sm._id === (m._id || m));
                    return found ? `${found.name} (${found.room})` : 'Unknown';
                }).join(', ');

                historyBody.innerHTML += `
                    <tr class="d-none d-md-table-row">
                        <td class="text-muted small ps-4 border-0">↳</td>
                        <td class="text-secondary fw-bold border-0">${meal.mealType}</td>
                        <td class="small text-muted border-0" style="max-width: 300px;">${memberNames}</td>
                        <td class="border-0"><span class="badge bg-secondary">${meal.totalMeals}</span></td>
                        <td class="text-end border-0" style="min-width: 90px;">
                            <button onclick="openEditMealModal(this, '${meal._id}')" class="btn btn-sm btn-outline-primary me-1" title="Edit Meal">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button onclick="deleteMeal('${meal._id}')" class="btn btn-sm btn-outline-danger" title="Delete Meal">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                    
                    <tr class="d-md-none border-bottom">
                        <td colspan="5" class="border-0 p-3 bg-white">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="text-primary fw-bold fs-6">${meal.mealType}</span>
                                <span class="badge bg-secondary rounded-pill">Total: ${meal.totalMeals}</span>
                            </div>
                            <div class="small text-muted mb-3 lh-base" style="word-break: break-word;">
                                <span class="fw-bold text-dark me-1">Members:</span>${memberNames}
                            </div>
                            <div class="text-end">
                                <button onclick="openEditMealModal(this, '${meal._id}')" class="btn btn-sm btn-outline-primary me-2 px-3">
                                    <i class="bi bi-pencil"></i> Edit
                                </button>
                                <button onclick="deleteMeal('${meal._id}')" class="btn btn-sm btn-outline-danger px-3">
                                    <i class="bi bi-trash"></i> Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        });
    }
}

function renderBazarTable() {
    const tbody = document.getElementById('table-bazar');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (state.bazar.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No bazar entries found for this month.</td></tr>`;
        return;
    }

    // ১. বাজারগুলোকে তারিখ অনুযায়ী গ্রুপ (Group) করা
    const groupedBazar = {};
    state.bazar.forEach(entry => {
        const dateStr = new Date(entry.date).toISOString().split('T')[0];
        if (!groupedBazar[dateStr]) {
            groupedBazar[dateStr] = [];
        }
        groupedBazar[dateStr].push(entry);
    });

    // ২. তারিখগুলোকে নতুন থেকে পুরনো (Descending) সিরিয়ালে সাজানো
    const sortedDates = Object.keys(groupedBazar).sort((a, b) => new Date(b) - new Date(a));

    // ৩. টেবিলে রেন্ডার করা
    sortedDates.forEach(date => {
        const items = groupedBazar[date];
        
        // --- নতুন: তারিখ এবং বারের নাম বের করা ---
        const dateObj = new Date(date);
        const niceDate = dateObj.toLocaleDateString('en-GB'); 
        const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'long' }); // বারের নাম (যেমন: Saturday)
        
        // ওই দিনের মোট খরচ
        const dailyTotal = items.reduce((sum, current) => sum + current.amount, 0);

        // তারিখ এবং বারের নাম একসাথে দেখানো
        tbody.innerHTML += `
            <tr class="table-light border-bottom border-primary">
                <td colspan="3" class="fw-bold text-primary">
                    <i class="bi bi-calendar-check me-2"></i>${niceDate} <span class="text-secondary small ms-1">(${dayName})</span>
                </td>
                <td class="text-end fw-bold text-dark">Daily Total: ৳${dailyTotal}</td>
                <td></td>
            </tr>
        `;

        // ওই তারিখের নিচে সব বাজারের আইটেমগুলো দেখানো
        items.forEach(entry => {
            const rawDate = new Date(entry.date).toISOString().split('T')[0];
            const safeItem = entry.item ? entry.item.replace(/'/g, "\\'") : '';
            const safeNote = entry.note ? entry.note.replace(/'/g, "\\'") : '';

            tbody.innerHTML += `
                <tr>
                    <td class="text-muted small ps-4">↳</td>
                    <td class="fw-bold">${entry.item}</td>
                    <td class="text-muted small">${entry.note || ''}</td>
                    <td class="text-end fw-bold text-danger">৳${entry.amount}</td>
                    <td class="text-end">
                        <button onclick="openEditBazarModal(this, '${entry._id}', '${rawDate}', '${safeItem}', ${entry.amount}, '${safeNote}')" class="btn btn-sm btn-outline-primary me-1" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button onclick="deleteBazar('${entry._id}')" class="btn btn-sm btn-outline-danger" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    });
}

// নতুন renderManagerSelection ফাংশন:
function renderManagerSelection() {
    const select = document.getElementById('select-manager');
    if (!select) return;
    
    select.innerHTML = '<option value="">Choose Member...</option>';
    state.members.filter(m => m.isActive).forEach(m => {
        // যদি এই মাসের রিপোর্টে অলরেডি ম্যানেজার থাকে, তাহলে তাকে সিলেক্টেড দেখাবে
        const isSelected = state.report.managerId === m._id ? 'selected' : '';
        select.innerHTML += `<option value="${m._id}" ${isSelected}>${m.name} (${m.room})</option>`;
    });

    const managerNameEl = document.getElementById('current-manager-name');
    if(state.report.managerId) {
        const managerObj = state.members.find(m => m._id === state.report.managerId);
        // "is getting free meals." লেখাটি এখান থেকে মুছে দেওয়া হয়েছে
        managerNameEl.innerHTML = `Currently: <strong class="text-success">${managerObj ? managerObj.name : 'Unknown'}</strong>`;
    } else {
        managerNameEl.innerHTML = "No manager assigned. Everyone is paying.";
    }
}

function renderDepositSelect() {
    const selectElement = document.getElementById('deposit-member'); // আপনার HTML এর ID যদি ভিন্ন হয়, তবে এখানে বসাবেন
    if (!selectElement) return;

    // শুরুতে একটি ডিফল্ট অপশন বসানো
    selectElement.innerHTML = '<option value="" disabled selected>Choose Member...</option>';

    // ১. শুধু অ্যাক্টিভ মেম্বারদের ফিল্টার করা
    // ২. তাদের রুম নাম্বার অনুযায়ী ছোট থেকে বড় সিরিয়ালে সাজানো (Sort)
    const sortedMembers = state.members
        .filter(m => m.isActive)
        .sort((a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true }));

    // ৩. সাজানো লিস্টটি ড্রপডাউনে যুক্ত করা
    sortedMembers.forEach(m => {
        selectElement.innerHTML += `<option value="${m._id}">${m.name} (Room: ${m.room})</option>`;
    });
}

// আপডেটেড saveManager ফাংশন
async function saveManager() {
    try {
        const memberId = document.getElementById('select-manager').value;
        if (!memberId) {
            return alert('Please select a member to set as manager.');
        }

        // ব্যবহারকারীকে বোঝানোর জন্য বাটনে Loading দেখানো
        const btn = document.querySelector('button[onclick="saveManager()"]');
        const originalText = btn.innerText;
        btn.innerText = "Saving...";
        btn.disabled = true;

        const res = await fetch(`${API_BASE_URL}/manager`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member: memberId, year: currentYear, month: currentMonth })
        });

        const json = await res.json();

        // বাটনের অবস্থা আগের মতো করা
        btn.innerText = originalText;
        btn.disabled = false;

        if (res.ok && json.success) {
            await loadAllData();
            alert('Manager successfully updated for this month!');
        } else {
            // যদি ব্যাকএন্ড থেকে কোনো এরর আসে
            alert('Failed to set manager: ' + (json.message || 'API Error!'));
            console.error("Manager API Error Response:", json);
        }
    } catch (error) {
        // যদি কোডে বা ইন্টারনেটে কোনো সমস্যা হয়
        console.error("Manager Setup Error:", error);
        alert("Something went wrong! Check the browser console (F12).");
    }
}

// Report টেবিল আপডেট করা (যাতে ব্যালেন্স দেখায়)
function renderReportTable() {
    document.getElementById('report-expense').innerText = state.report.totalExpense;
    document.getElementById('report-meals').innerText = state.report.totalMeals;
    document.getElementById('report-rate').innerText = state.report.mealRate.toFixed(2);
    
    const tbody = document.getElementById('table-report');
    tbody.innerHTML = '';
    state.report.members.forEach(member => {
        // ব্যালেন্স যদি মাইনাস হয় (বাকি থাকে) তাহলে লাল, আর প্লাস হলে (অ্যাডভান্স) সবুজ
        const balanceColor = member.balance < 0 ? 'text-danger' : 'text-success';
        const balanceText = member.balance < 0 ? `Due: ৳${Math.abs(member.balance).toFixed(2)}` : `Adv: ৳${member.balance.toFixed(2)}`;
        
        // ম্যানেজার চেক
        const managerBadge = member.isManager ? '<span class="badge bg-warning text-dark ms-1">Manager</span>' : '';
        const payableText = member.isManager ? '<span class="text-success small fw-bold">Free (Manager)</span>' : `৳${member.payableAmount.toFixed(2)}`;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="fw-bold">${member.name} ${managerBadge}</div>
                <small class="text-muted">Room: ${member.room}</small>
            </td>
            <td class="text-center"><span class="badge bg-primary rounded-pill">${member.totalMeals}</span></td>
            <td class="text-end text-muted">${payableText}</td>
            <td class="text-end fw-bold text-success">৳${member.depositedAmount.toFixed(2)}</td>
            <td class="text-end fw-bold ${balanceColor}">${balanceText}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- SUBMIT ACTIONS (POST/PUT/DELETE) ---

// 1. Edit Member Modal
function openEditMemberModal(btn, id, name, room) {
    activeEditBtn = btn; // ম্যাজিক: ক্লিক করা বাটনটি সেভ করে রাখলাম
    document.getElementById('edit-member-id').value = id;
    document.getElementById('edit-member-name').value = name;
    document.getElementById('edit-member-room').value = room;
    new bootstrap.Modal(document.getElementById('editMemberModal')).show();
}

// Edit Member

document.getElementById('form-edit-member').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-member-id').value;
    const name = document.getElementById('edit-member-name').value;
    const room = document.getElementById('edit-member-room').value;

    // ১. সাথে সাথে বক্সটি বন্ধ করে দেওয়া
    bootstrap.Modal.getInstance(document.getElementById('editMemberModal')).hide();

    // ২. ব্যাকগ্রাউন্ডের পেন আইকনে স্পিনার ঘুরানো
    if (activeEditBtn) {
        activeEditBtn.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span>';
        activeEditBtn.disabled = true;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/members/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, room })
        });
        
        if (res.ok) {
            await loadAllData(); // ডেটা রিলোড হলে টেবিল নতুন করে তৈরি হবে এবং স্পিনার নিজে থেকেই গায়েব হয়ে যাবে
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Member Updated!' });
        } else {
            Swal.fire('Error!', 'আপডেট করতে সমস্যা হয়েছে।', 'error');
            if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
        }
    } catch (error) {
        Swal.fire('Error!', 'নেটওয়ার্ক সমস্যা!', 'error');
        if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
    }
});




document.getElementById('form-add-meal').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('meal-date').value;
    const mealType = e.target.querySelector('select').value;
    const members = Array.from(document.querySelectorAll('.meal-checkbox:checked')).map(cb => cb.value);

    // মেম্বার সিলেক্ট না করলে প্রফেশনাল ওয়ার্নিং
    if (members.length === 0) {
        Swal.fire('Oops!', 'আপনাকে অন্তত একজন মেম্বার সিলেক্ট করতে হবে।', 'warning');
        return;
    }

    // বাটন সিলেক্ট করা এবং লোডিং অ্যানিমেশন দেওয়া
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Saving...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/meals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, mealType, members })
        });
        
        if (res.ok) { 
            e.target.reset(); 
            setDefaultDates(); 
            await loadAllData(); 
            // এখান থেকে বিরক্তিকর alert('Meal entry saved!'); লাইনটি সরিয়ে দেওয়া হয়েছে
            
            // ছোট্ট একটি নোটিফিকেশন (Toast) দেখাতে চাইলে নিচের লাইনটি রাখতে পারেন, নাহলে কেটে দিতে পারেন। 
            // এটি স্ক্রিনের কোণায় আসবে, ইউজারকে ডিস্টার্ব করবে না।
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Meal Saved!' });
        } else {
            Swal.fire('Error!', 'মিল সেভ করতে সমস্যা হয়েছে।', 'error');
        }
    } catch (error) {
        console.error("Error saving meal:", error);
        Swal.fire('Error!', 'ইন্টারনেট কানেকশন বা সার্ভারে সমস্যা আছে!', 'error');
    } finally {
        // ডেটা সেভ হওয়ার পর বাটন আবার আগের অবস্থায় ফিরিয়ে আনা
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});


// ==========================================
// --- ADD MEMBER & ADD BAZAR (WITH ANIMATION) ---
// ==========================================

// Add Member
document.getElementById('form-add-member').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // বাটন সিলেক্ট করা এবং লোডিং অ্যানিমেশন দেওয়া
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Saving...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: e.target[0].value, room: e.target[1].value })
        });
        
        if (res.ok) { 
            e.target.reset(); 
            await loadAllData(); 
            
            // সাকসেস টোস্ট অ্যানিমেশন (কোনো পপআপ ছাড়া)
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Member Added!' });
        } else {
            Swal.fire('Error!', 'মেম্বার অ্যাড করতে সমস্যা হয়েছে।', 'error');
        }
    } catch (error) {
        console.error("Error adding member:", error);
        Swal.fire('Error!', 'ইন্টারনেট কানেকশন বা সার্ভারে সমস্যা আছে!', 'error');
    } finally {
        // কাজ শেষ হলে বাটন আগের অবস্থায় ফিরিয়ে আনা
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});

// Add Bazar
// ==========================================
// --- ADD BAZAR (Without Note & With Animation) ---
// ==========================================
document.getElementById('form-add-bazar').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // ম্যাজিক ফিক্স: Note ছাড়াই শুধু Date, Item এবং Amount নেওয়া হচ্ছে
    const dateVal = e.target.querySelector('input[type="date"]').value;
    const itemVal = document.getElementById('bazar-item-name').value; // Tom Select এর ID
    const amountVal = Number(e.target.querySelector('input[type="number"]').value);

    // বাটন সিলেক্ট করা এবং লোডিং অ্যানিমেশন দেওয়া
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Saving...';
    submitBtn.disabled = true;

    try {
        // note ছাড়াই ডেটা ডাটাবেসে পাঠানো হচ্ছে
        const res = await fetch(`${API_BASE_URL}/bazar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: dateVal, item: itemVal, amount: amountVal }) 
        });
        
        if (res.ok) { 
            e.target.reset(); 
            
            // Tom Select এর বক্সটি আগের অবস্থায় (ফাঁকা) ফিরিয়ে আনার ম্যাজিক
            const tomSelectEl = document.getElementById('bazar-item-name');
            if(tomSelectEl && tomSelectEl.tomselect) {
                tomSelectEl.tomselect.clear();
            }

            setDefaultDates(); 
            await loadAllData(); 
            
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Bazar Saved!' });
        } else {
            Swal.fire('Error!', 'বাজার সেভ করতে সমস্যা হয়েছে।', 'error');
        }
    } catch (error) {
        console.error("Error saving bazar:", error);
        Swal.fire('Error!', 'ইন্টারনেট কানেকশন বা সার্ভারে সমস্যা আছে!', 'error');
    } finally {
        // কাজ শেষ হলে বাটন আগের অবস্থায় ফিরিয়ে আনা
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});

// Add Deposit Submit
document.getElementById('form-add-deposit').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('deposit-date').value;
    const member = document.getElementById('deposit-member').value;
    const amount = Number(document.getElementById('deposit-amount').value);

    // সাবমিট বাটনটি সিলেক্ট করা এবং আগের লেখা সেভ করে রাখা
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    // বাটনে লোডিং স্পিনার দেখানো এবং বাটন ডিজেবল করা (যাতে ডাবল ক্লিক না হয়)
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Saving...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/deposits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, member, amount })
        });
        
        if (res.ok) { 
            e.target.reset(); 
            setDefaultDates(); 
            await loadAllData(); 
            // এখান থেকে alert('Deposit saved!'); লাইনটি সরিয়ে দেওয়া হয়েছে
        } else {
            alert('❌ ডেপোজিট সেভ করতে সমস্যা হয়েছে!');
        }
    } catch (error) {
        console.error("Error saving deposit:", error);
        alert('ইন্টারনেট কানেকশন বা সার্ভারে সমস্যা আছে!');
    } finally {
        // ডেটা সেভ হওয়ার পর বাটন আবার আগের অবস্থায় ফিরিয়ে আনা
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});



// --- BAZAR EDIT & DELETE LOGIC ---

// 2. Edit Bazar Modal
function openEditBazarModal(btn, id, date, item, amount, note) {
    activeEditBtn = btn; // ম্যাজিক: ক্লিক করা বাটনটি সেভ করে রাখলাম
    document.getElementById('edit-bazar-id').value = id;
    document.getElementById('edit-bazar-date').value = date;
    document.getElementById('edit-bazar-item').value = item;
    document.getElementById('edit-bazar-amount').value = amount;
    document.getElementById('edit-bazar-note').value = (note !== 'undefined' && note !== 'null') ? note : '';
    new bootstrap.Modal(document.getElementById('editBazarModal')).show();
}

// Edit Bazar

const formEditBazar = document.getElementById('form-edit-bazar');
if (formEditBazar) {
    formEditBazar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-bazar-id').value;
        const date = document.getElementById('edit-bazar-date').value;
        const item = document.getElementById('edit-bazar-item').value;
        const amount = Number(document.getElementById('edit-bazar-amount').value);
        const note = document.getElementById('edit-bazar-note').value;

        // ১. সাথে সাথে বক্সটি বন্ধ করে দেওয়া
        bootstrap.Modal.getInstance(document.getElementById('editBazarModal')).hide();

        // ২. ব্যাকগ্রাউন্ডের পেন আইকনে স্পিনার ঘুরানো
        if (activeEditBtn) {
            activeEditBtn.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span>';
            activeEditBtn.disabled = true;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/bazar/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, item, amount, note })
            });
            
            if (res.ok) {
                await loadAllData(); 
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                Toast.fire({ icon: 'success', title: 'Bazar Updated!' });
            } else {
                Swal.fire('Error!', 'Failed to update.', 'error');
                if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
            }
        } catch (error) {
            Swal.fire('Error!', 'Network issue!', 'error');
            if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
        }
    });
}

// --- PDF DOWNLOAD LOGIC ---
function downloadReportPDF() {
    // এটি ব্রাউজারের নিজস্ব এবং পাওয়ারফুল প্রিন্ট/পিডিএফ ইঞ্জিন চালু করবে
    window.print();
}

// --- DOWNLOAD TODAY'S MEALS AS PHOTO LOGIC (FIXED FOR MOBILE) ---
function downloadTodaysMealsPhoto() {
    const container = document.getElementById('today-meals-container');
    
    if (!container || container.innerHTML.includes('No meals added')) {
        alert("No meals available to download!");
        return;
    }

    // ডাউনলোড শুরু হওয়ার সময় বাটনের টেক্সট পরিবর্তন করা
    const btn = document.querySelector('button[onclick="downloadTodaysMealsPhoto()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';
    btn.disabled = true;

    // ডিলিট বাটন (ডাস্টবিন আইকন) হাইড করা
    const deleteButtons = container.querySelectorAll('.btn');
    deleteButtons.forEach(btn => btn.style.display = 'none');

    // --- নতুন ফিক্স: মোবাইলের জন্য ফুল সাইজ ওপেন করা ---
    const tableResponsive = container.querySelector('.table-responsive');
    let originalOverflow = '';
    if (tableResponsive) {
        originalOverflow = tableResponsive.style.overflow;
        tableResponsive.style.overflow = 'visible'; // স্ক্রলবার সরিয়ে পুরো টেবিল দৃশ্যমান করা
    }

    // html-to-image ব্যবহার করে পুরো কন্টেইনারটিকে ছবিতে রূপান্তর
    htmlToImage.toJpeg(container, { 
        quality: 0.98, 
        backgroundColor: '#ffffff',
        // স্ক্রিনের সাইজের বদলে টেবিলের আসল (পুরো) লম্বাই-চওড়াই বলে দেওয়া
        width: container.scrollWidth,
        height: container.scrollHeight,
        style: {
            transform: 'none',
        }
    })
        .then(function (dataUrl) {
            // ছবির নাম তৈরি করা
            const niceDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
            const fileName = `Todays_Meals_${niceDate}.jpg`;

            // ছবি ডাউনলোড করা
            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataUrl;
            link.click();

            // কাজ শেষে টেবিল এবং বাটন আবার আগের অবস্থায় ফিরিয়ে আনা
            deleteButtons.forEach(btn => btn.style.display = '');
            btn.innerHTML = originalText;
            btn.disabled = false;
            if (tableResponsive) tableResponsive.style.overflow = originalOverflow;
        })
        .catch(function (error) {
            console.error('Error generating image!', error);
            alert("Failed to save photo. Please try again.");
            
            // এরর হলেও যেন অ্যাপ আটকে না যায়, তাই সবকিছু আগের অবস্থায় ফেরানো
            deleteButtons.forEach(btn => btn.style.display = '');
            btn.innerHTML = originalText;
            btn.disabled = false;
            if (tableResponsive) tableResponsive.style.overflow = originalOverflow;
        });
}


// --- MEAL EDIT LOGIC ---

// এডিট পপ-আপ ওপেন করা এবং আগের ডেটা বসানো
// 3. Edit Meal Modal
function openEditMealModal(btn, mealId) {
    activeEditBtn = btn; // ম্যাজিক: ক্লিক করা বাটনটি সেভ করে রাখলাম
    const meal = state.meals.find(m => m._id === mealId);
    if (!meal) return;

    document.getElementById('edit-meal-id').value = meal._id;
    document.getElementById('edit-meal-date').value = meal.date.split('T')[0];
    document.getElementById('edit-meal-type').value = meal.mealType;

    const memberListDiv = document.getElementById('edit-meal-member-list');
    memberListDiv.innerHTML = '';
    
    const activeMembers = state.members
        .filter(m => m.isActive)
        .sort((a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true }));
    
    const mealMemberIds = meal.members.map(m => m._id || m);

    activeMembers.forEach(member => {
        const isChecked = mealMemberIds.includes(member._id) ? 'checked' : '';
        memberListDiv.innerHTML += `
            <div class="form-check mb-2 border-bottom pb-1">
                <input class="form-check-input edit-meal-member-checkbox border-secondary" type="checkbox" value="${member._id}" id="edit-member-${member._id}" ${isChecked}>
                <label class="form-check-label ms-2 fw-bold text-dark" for="edit-member-${member._id}">
                    ${member.name} <span class="text-muted small fw-normal">(Room: ${member.room})</span>
                </label>
            </div>
        `;
    });
    
    new bootstrap.Modal(document.getElementById('editMealModal')).show();
}

// আপডেট করা মিল সেভ করা

async function saveEditedMeal(event) {
    event.preventDefault();
    
    const id = document.getElementById('edit-meal-id').value;
    const date = document.getElementById('edit-meal-date').value;
    const mealType = document.getElementById('edit-meal-type').value;
    
    const checkboxes = document.querySelectorAll('.edit-meal-member-checkbox:checked');
    const members = Array.from(checkboxes).map(cb => cb.value);

    if (members.length === 0) {
        Swal.fire('Oops!', 'আপডেট করার জন্য অন্তত একজন মেম্বার সিলেক্ট করতে হবে!', 'warning');
        return;
    }

    // ১. সাথে সাথে বক্সটি বন্ধ করে দেওয়া
    bootstrap.Modal.getInstance(document.getElementById('editMealModal')).hide();

    // ২. ব্যাকগ্রাউন্ডের পেন আইকনে স্পিনার ঘুরানো
    if (activeEditBtn) {
        activeEditBtn.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span>';
        activeEditBtn.disabled = true;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/meals/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, mealType, members, totalMeals: members.length })
        });

        if (response.ok) {
            await loadAllData(); 
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Meal Updated!' });
        } else {
            Swal.fire('Error!', 'আপডেট করতে সমস্যা হয়েছে।', 'error');
            if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
        }
    } catch (error) {
        console.error("Error updating meal:", error);
        Swal.fire('Error!', 'নেটওয়ার্ক সমস্যা! দয়া করে আবার চেষ্টা করুন।', 'error');
        if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
    }
}

// --- BALANCE TABLE LOGIC ---
function renderBalanceTable() {
    const tbody = document.getElementById('table-balance');
    if (!tbody) return;
    tbody.innerHTML = '';

    // যদি রিপোর্ট ডেটা না থাকে
    if (!state.report || !state.report.members || state.report.members.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="text-center text-muted py-4">No balance data available. Select a date range from the Dashboard first.</td></tr>`;
        return;
    }

    state.report.members.forEach(member => {
        // ব্যালেন্স যদি মাইনাস হয় (বাকি থাকে) তাহলে লাল, আর প্লাস হলে (অ্যাডভান্স) সবুজ
        const balanceColor = member.balance < 0 ? 'text-danger' : 'text-success';
        const balanceText = member.balance < 0 ? `Due: ৳${Math.abs(member.balance).toFixed(2)}` : `Adv: ৳${member.balance.toFixed(2)}`;
        const managerBadge = member.isManager ? '<span class="badge bg-warning text-dark ms-1" style="font-size: 0.65rem;">Manager</span>' : '';

        tbody.innerHTML += `
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-dark">${member.name} ${managerBadge}</div>
                    <small class="text-muted"><i class="bi bi-door-closed"></i> Room: ${member.room}</small>
                </td>
                <td class="text-end pe-4 fw-bold ${balanceColor}" style="font-size: 1.1rem;">
                    ${balanceText}
                </td>
            </tr>
        `;
    });
}

// --- LOW BALANCE ALERT LOGIC ---
function renderLowBalanceAlert() {
    const tbody = document.getElementById('table-low-balance');
    const thresholdInput = document.getElementById('low-balance-threshold');
    
    if (!tbody || !thresholdInput) return;

    if (!thresholdInput.hasAttribute('data-loaded')) {
        const savedThreshold = localStorage.getItem('savedLowBalanceLimit');
        if (savedThreshold !== null) {
            thresholdInput.value = savedThreshold;
        }
        thresholdInput.setAttribute('data-loaded', 'true');
    }
    
    const threshold = Number(thresholdInput.value) || 0;
    localStorage.setItem('savedLowBalanceLimit', threshold);
    
    tbody.innerHTML = '';
    
    if (!state.report || !state.report.members || state.report.members.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">No data available.</td></tr>`;
        return;
    }

    // লজিক আপডেট: ব্যালেন্স লিমিটের নিচে হবে, কিন্তু একদম '০' (0) হওয়া যাবে না!
    const lowBalanceMembers = state.report.members.filter(m => 
        m.balance <= threshold && m.balance !== 0 && !m.isManager
    );

    if (lowBalanceMembers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-success py-4">
                    <i class="bi bi-check-circle-fill fs-4 d-block mb-1"></i> 
                    <span class="fw-bold">All good!</span> No member has a balance below ৳${threshold}.
                </td>
            </tr>`;
        return;
    }

    lowBalanceMembers.sort((a, b) => a.balance - b.balance);

    lowBalanceMembers.forEach(member => {
        const balanceColor = member.balance < 0 ? 'text-danger' : 'text-warning text-dark';
        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-dark">${member.name}</td>
                <td class="text-muted"><small>${member.room}</small></td>
                <td class="text-end fw-bold pe-3 ${balanceColor}">৳${member.balance.toFixed(2)}</td>
            </tr>
        `;
    });
}

// --- COPY LOW BALANCE NAMES LOGIC ---
function copyLowBalanceNames() {
    const thresholdInput = document.getElementById('low-balance-threshold');
    const threshold = Number(thresholdInput.value) || 0;

    if (!state.report || !state.report.members || state.report.members.length === 0) {
        alert("কপি করার মতো কোনো ডেটা নেই!");
        return;
    }

    // এখানেও শর্তটি আপডেট করা হলো (balance !== 0)
    const lowBalanceMembers = state.report.members.filter(m => 
        m.balance <= threshold && m.balance !== 0 && !m.isManager
    );

    if (lowBalanceMembers.length === 0) {
        alert("লিস্টে কপি করার মতো কোনো মেম্বার নেই!");
        return;
    }

    lowBalanceMembers.sort((a, b) => a.balance - b.balance);

    let copyText = `⚠️ Low Balance Alert (Below ৳${threshold}):\n\n`;
    
    lowBalanceMembers.forEach((member, index) => {
        const balanceText = member.balance < 0 ? `(Due: ৳${Math.abs(member.balance).toFixed(2)})` : `(Balance: ৳${member.balance.toFixed(2)})`;
        copyText += `${index + 1}. ${member.name} - Room: ${member.room} ${balanceText}\n`;
    });

    copyText += `\nদয়া করে দ্রুত মেসে টাকা জমা দিন।`;

    navigator.clipboard.writeText(copyText).then(() => {
        const copyBtn = document.querySelector('button[onclick="copyLowBalanceNames()"]');
        const originalHTML = copyBtn.innerHTML;
        
        copyBtn.innerHTML = '<i class="bi bi-check2-all"></i> Copied!';
        copyBtn.classList.replace('btn-danger', 'btn-success');
        
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.classList.replace('btn-success', 'btn-danger');
        }, 2000);
        
    }).catch(err => {
        console.error("Copy failed", err);
        alert("কপি করতে সমস্যা হয়েছে। আপনার ব্রাউজার হয়তো এটি সাপোর্ট করছে কানা।");
    });
}


// --- DOWNLOAD LOW BALANCE AS IMAGE LOGIC ---
function downloadLowBalanceImage() {
    if (typeof html2canvas === 'undefined') {
        alert("ইমেজ লাইব্রেরি লোড হচ্ছে... অনুগ্রহ করে ২-৩ সেকেন্ড পর আবার চেষ্টা করুন।");
        return;
    }

    const card = document.getElementById('low-balance-card');
    const actionBox = document.getElementById('low-balance-actions');
    
    if (!card) return;

    // ১. ছবি তোলার আগে বাটন ও ইনপুট বক্স হাইড করে দেওয়া
    if (actionBox) actionBox.style.display = 'none';

    // ২. কার্ডের HD স্ক্রিনশট নেওয়া (scale: 2)
    html2canvas(card, {
        scale: 2, 
        backgroundColor: "#ffffff",
        useCORS: true
    }).then(canvas => {
        // ৩. ছবি তোলা শেষ হলে বাটনগুলো আবার ফিরিয়ে আনা
        if (actionBox) actionBox.style.display = 'flex';

        // ৪. ছবি ডাউনলোড করানো
        const link = document.createElement('a');
        const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-'); 
        link.download = `Low_Balance_Alert_${today}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => {
        // কোনো এরর হলেও যেন বাটনগুলো গায়েব না থাকে
        if (actionBox) actionBox.style.display = 'flex';
        console.error("Image generation failed:", err);
        alert("ছবি ডাউনলোড করতে সমস্যা হয়েছে।");
    });
}


// ==========================================
// --- REFUND MONEY LOGIC (AUTO MINUS) ---
// ==========================================

// মেম্বার লিস্ট আপডেট করার ফাংশন
const originalRenderDepositSelect = typeof renderDepositSelect === 'function' ? renderDepositSelect : function(){};
renderDepositSelect = function() {
    originalRenderDepositSelect(); // আগের ফাংশনটি কল করা হলো
    const refundSelect = document.getElementById('refund-member');
    if (refundSelect && state.members) {
        let options = '<option value="" disabled selected>-- মেম্বার সিলেক্ট করুন --</option>';
        state.members.filter(m => m.isActive).forEach(m => {
            options += `<option value="${m._id}">${m.name} (${m.room})</option>`;
        });
        refundSelect.innerHTML = options;
    }
};

// রিফান্ড ফর্ম সাবমিট করার লজিক
document.addEventListener("DOMContentLoaded", () => {
    const refundForm = document.getElementById('form-refund-money');
    if (refundForm) {
        // আজকের তারিখ ডিফল্টভাবে বসানো
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(today.getTime() - offset)).toISOString().split('T')[0];
        const dateInput = document.getElementById('refund-date');
        if (dateInput) dateInput.value = localISOTime;

        refundForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('refund-date').value;
            const memberId = document.getElementById('refund-member').value;
            const amountVal = document.getElementById('refund-amount').value;
            
            // ম্যাজিক: পজিটিভ নাম্বারকে অটোমেটিক মাইনাস (-) করে দেওয়া
            const autoMinusAmount = -Math.abs(Number(amountVal));
            
            // সাবমিট বাটনে লোডিং দেখানো
            const submitBtn = refundForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Processing...';
            submitBtn.disabled = true;

            try {
                const res = await fetch('https://mess-backend-pg3z.onrender.com/api/deposits', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date, member: memberId, amount: autoMinusAmount }) // মাইনাস ডেটা পাঠানো হলো
                });
                
                if (res.ok) {
                    // এখান থেকে alert মেসেজটি পুরোপুরি সরিয়ে দেওয়া হয়েছে
                    refundForm.reset();
                    if (dateInput) dateInput.value = localISOTime;
                    await loadAllData(); // ডেটা রিলোড করে ব্যালেন্স আপডেট করা
                } else {
                    const err = await res.json();
                    alert(`❌ সমস্যা হয়েছে: ${err.message || 'Refund failed'}`);
                }
            } catch (error) {
                console.error(error);
                alert('ইন্টারনেট কানেকশন বা সার্ভারে সমস্যা আছে!');
            } finally {
                // কাজ শেষ হলে বাটন আগের অবস্থায় ফিরে আসবে
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
});


// ==========================================
// --- PROFESSIONAL POPUPS (SWEETALERT2) ---
// ==========================================

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
                localStorage.setItem('isManager', 'false');
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

// Delete Member
function deleteMember(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "This member will be deleted permanently!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete!',
        showLoaderOnConfirm: true, // বাটনে লোডিং অ্যানিমেশন চালু করবে
        preConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/members/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Server Error');
                await loadAllData();
                return true;
            } catch (error) {
                Swal.showValidationMessage('সার্ভারে সমস্যা হয়েছে!');
            }
        },
        allowOutsideClick: () => !Swal.isLoading() // লোডিং চলাকালীন বাইরে ক্লিক করলে পপআপ কাটবে না
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Deleted!', text: 'Member has been deleted.', icon: 'success', timer: 1500, showConfirmButton: false });
        }
    });
}

// Delete Meal
function deleteMeal(id) {
    Swal.fire({
        title: 'Delete this meal?',
        text: "You can re-add it from the form above.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete!',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/meals/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Error');
                await loadAllData();
                return true;
            } catch (error) {
                Swal.showValidationMessage('সমস্যা হয়েছে!');
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Deleted!', text: 'Meal entry has been deleted.', icon: 'success', timer: 1500, showConfirmButton: false });
        }
    });
}

// Delete Bazar
function deleteBazar(id) {
    Swal.fire({
        title: 'Delete Bazar Entry?',
        text: "This will remove the expense from the total calculation.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete!',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/bazar/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Error');
                await loadAllData();
                return true;
            } catch (error) {
                Swal.showValidationMessage('সমস্যা হয়েছে!');
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Deleted!', text: 'Bazar entry has been deleted.', icon: 'success', timer: 1500, showConfirmButton: false });
        }
    });
}

// Delete Deposit
function deleteDeposit(id) {
    Swal.fire({
        title: 'Delete Deposit/Refund?',
        text: "This will directly affect the member's balance.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete!',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/deposits/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Error');
                await loadAllData();
                return true;
            } catch (error) {
                Swal.showValidationMessage('সমস্যা হয়েছে!');
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Deleted!', text: 'Entry has been deleted.', icon: 'success', timer: 1500, showConfirmButton: false });
        }
    });
}

// Clear Today's Meals
function clearTodaysMeals() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - offset)).toISOString().split('T')[0];
    const todaysMeals = state.meals.filter(meal => meal.date.startsWith(localISOTime));

    if (todaysMeals.length === 0) {
        Swal.fire('Oops!', 'আজকের তালিকায় কোনো মিল নেই!', 'info');
        return;
    }

    Swal.fire({
        title: 'Clear All Meals?',
        text: `আপনি কি নিশ্চিত যে আজকের সব মিল (${todaysMeals.length} টি এন্ট্রি) ডিলিট করতে চান?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, clear all!',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            try {
                for (const meal of todaysMeals) {
                    await fetch(`${API_BASE_URL}/meals/${meal._id}`, { method: 'DELETE' });
                }
                await loadAllData();
                return true;
            } catch (error) {
                Swal.showValidationMessage('ডিলিট করতে সমস্যা হয়েছে!');
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Cleared!', text: 'আজকের সব মিল সফলভাবে ডিলিট করা হয়েছে।', icon: 'success', timer: 2000, showConfirmButton: false });
        }
    });
}