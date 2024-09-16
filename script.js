const SubscriptionApp = (function() {
    let subscriptions = [];

    const SubscriptionStore = {
        get() {
            return JSON.parse(localStorage.getItem('subscriptions')) || [];
        },
        set(subscriptions) {
            localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
        }
    };

    const popularSubscriptions = {
        'Netflix': 'streaming',
        'Spotify': 'music',
        'Xbox Game Pass': 'gaming',
        'PlayStation Plus': 'gaming',
        'Disney+': 'streaming',
        'Amazon Prime': 'streaming',
        'Apple Music': 'music',
        'YouTube Premium': 'streaming',
        'Hulu': 'streaming',
        'HBO Max': 'streaming',
        'Adobe Creative Cloud': 'software',
        'Microsoft 365': 'software',
        'Dropbox': 'cloud',
        'Google One': 'cloud',
        'Audible': 'education',
        'Skillshare': 'education',
        'Fitness+': 'fitness',
        'Peloton': 'fitness',
        'The New York Times': 'news',
        'Wall Street Journal': 'news',
        'Nvidia GeForce Now': 'gaming',
        'BluTV': 'streaming',
        'Gain': 'streaming',
        'Hepsiburada Premium': 'shopping',
        'Exxen': 'streaming',
        'Digiturk': 'streaming',
        'beIN Connect': 'streaming',
        'TODD': 'streaming',
        'beIN Sports': 'sports',
        'S Sport': 'sports',
        'Tivibu': 'streaming',
        'Storytel': 'education'
    };

    function init() {
        subscriptions = SubscriptionStore.get();
        renderSubscriptions();
        setupEventListeners();
        updateTotalCost();
        setupSortable();
        setupTabs();
        checkUpcomingRenewals();
        setInterval(checkUpcomingRenewals, 24 * 60 * 60 * 1000); // Her gün kontrol et
    }

    function setupEventListeners() {
        document.querySelector('.add-subscription-btn').addEventListener('click', showAddSubscriptionModal);
        document.querySelector('.close').addEventListener('click', closeModal);
        window.addEventListener('click', (event) => {
            if (event.target === document.getElementById('subscription-modal')) {
                closeModal();
            }
        });
        document.getElementById('subscription-form').addEventListener('submit', handleFormSubmit);
        document.getElementById('category-filter').addEventListener('change', filterSubscriptions);
        document.getElementById('sort-select').addEventListener('change', sortSubscriptions);
        document.getElementById('platform').addEventListener('input', handlePlatformInput);
    }

    function setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                changeTab(tabName);
            });
        });
    }

    function changeTab(tabName) {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        const tabsContainer = document.querySelector('.tabs');
        
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');

        tabsContainer.setAttribute('data-active-tab', tabName);

        if (tabName === 'costs') {
            updateFinancialSummary();
        }
    }

    function updateFinancialSummary() {
        const monthlyTotal = calculateMonthlyTotal();
        const yearlyTotal = monthlyTotal * 12;
        const mostExpensive = findMostExpensiveSubscription();

        document.getElementById('monthly-total').innerHTML = `${monthlyTotal.toFixed(2)} <i class="fas fa-turkish-lira-sign"></i>`;
        document.getElementById('yearly-total').innerHTML = `${yearlyTotal.toFixed(2)} <i class="fas fa-turkish-lira-sign"></i>`;
        document.getElementById('most-expensive').innerHTML = mostExpensive ? `${mostExpensive.platform} - ${mostExpensive.fee.toFixed(2)} <i class="fas fa-turkish-lira-sign"></i>` : '-';
        document.getElementById('total-subscriptions').textContent = subscriptions.length;

        renderCategoryChart();
        renderSpendingTrend();
    }

    function calculateMonthlyTotal() {
        return subscriptions.reduce((total, sub) => {
            const monthlyFee = sub.fee * getMonthlyMultiplier(sub.billingCycle);
            return total + monthlyFee;
        }, 0);
    }

    function getMonthlyMultiplier(billingCycle) {
        switch (billingCycle) {
            case 'weekly': return 4;
            case 'monthly': return 1;
            case 'quarterly': return 1/3;
            case 'semi-annually': return 1/6;
            case 'yearly': return 1/12;
            default: return 1;
        }
    }

    function findMostExpensiveSubscription() {
        return subscriptions.reduce((max, sub) => (!max || sub.fee > max.fee) ? sub : max, null);
    }

    function renderCategoryChart() {
        const categoryTotals = subscriptions.reduce((totals, sub) => {
            const monthlyFee = sub.fee * getMonthlyMultiplier(sub.billingCycle);
            totals[sub.category] = (totals[sub.category] || 0) + monthlyFee;
            return totals;
        }, {});

        const chartContainer = document.getElementById('category-chart');
        chartContainer.innerHTML = '<canvas id="categoryPieChart"></canvas>';

        new Chart(document.getElementById('categoryPieChart'), {
            type: 'pie',
            data: {
                labels: Object.keys(categoryTotals),
                datasets: [{
                    data: Object.values(categoryTotals),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#36A2EB'
                    ]
                }]
            },
            options: {
                responsive: true,
                title: {
                    display: true,
                    text: 'Kategori Bazında Aylık Harcama'
                }
            }
        });
    }

    function renderSpendingTrend() {
        const monthlySpending = Array(12).fill(0);
        const currentMonth = new Date().getMonth();

        subscriptions.forEach(sub => {
            const startDate = new Date(sub.startDate);
            const monthlyFee = sub.fee * getMonthlyMultiplier(sub.billingCycle);

            for (let i = 0; i < 12; i++) {
                const month = (currentMonth - i + 12) % 12;
                if (startDate <= new Date(new Date().getFullYear(), month, 1)) {
                    monthlySpending[i] += monthlyFee;
                }
            }
        });

        const chartContainer = document.getElementById('spending-trend');
        chartContainer.innerHTML = '<canvas id="spendingTrendChart"></canvas>';

        new Chart(document.getElementById('spendingTrendChart'), {
            type: 'line',
            data: {
                labels: Array(12).fill().map((_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    return d.toLocaleString('default', { month: 'short' });
                }).reverse(),
                datasets: [{
                    label: 'Aylık Harcama',
                    data: monthlySpending.reverse(),
                    borderColor: '#4a90e2',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                title: {
                    display: true,
                    text: 'Aylık Harcama Trendi'
                },
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true
                        }
                    }]
                }
            }
        });
    }

    function renderSubscriptions() {
        const subscriptionsContainer = document.getElementById('subscriptions');
        subscriptionsContainer.innerHTML = '';
        subscriptions.forEach((subscription, index) => {
            const card = createSubscriptionCard(subscription, index);
            subscriptionsContainer.appendChild(card);
        });
        renderTrialSubscriptions();
        renderUpcomingRenewals();
        updateTotalCost();
    }

    function createSubscriptionCard(subscription, index) {
        const card = document.createElement('div');
        card.className = 'subscription-card';
        card.dataset.index = index;

        const { daysLeft, endDate, isAutoRenewal } = getSubscriptionTimeInfo(subscription);
        const statusClass = getStatusClass(subscription);
        const statusText = getStatusText(subscription);
        const renewalInfo = isAutoRenewal ? 'Otomatik Yenileme Açık' : 'Otomatik Yenileme Kapalı';
        const endDateFormatted = formatDate(endDate);

        card.innerHTML = `
            <h3>${subscription.platform}</h3>
            <div class="subscription-details">
                <span><i class="fas fa-tag"></i> ${subscription.category}</span>
                <span><i class="fas fa-money-bill-wave"></i> ${subscription.fee} <i class="fas fa-turkish-lira-sign"></i> / ${getBillingCycleText(subscription.billingCycle)}</span>
                <span><i class="fas fa-calendar-alt"></i> Başlangıç: ${formatDate(subscription.startDate)}</span>
                <span><i class="fas fa-calendar-times"></i> Bitiş: ${endDateFormatted}</span>
                <span><i class="fas fa-clock"></i> ${daysLeft} gün kaldı</span>
                <span><i class="fas fa-sync-alt"></i> ${renewalInfo}</span>
            </div>
            <div class="status-indicator ${statusClass}">${statusText}</div>
            <div class="subscription-actions">
                <button class="edit-btn">Düzenle</button>
                <button class="delete-btn">Sil</button>
            </div>
        `;

        const editBtn = card.querySelector('.edit-btn');
        const deleteBtn = card.querySelector('.delete-btn');

        editBtn.addEventListener('click', () => editSubscription(index));
        deleteBtn.addEventListener('click', () => deleteSubscription(index));

        return card;
    }

    function getStatusClass(subscription) {
        const { daysLeft } = getSubscriptionTimeInfo(subscription);
        if (subscription.trialPeriod && daysLeft > 0) {
            return daysLeft <= 3 ? 'trial-ending-soon' : 'trial';
        } else if (daysLeft < 0) {
            return 'expired';
        } else if (daysLeft <= 7) {
            return 'expiring-soon';
        }
        return 'active';
    }

    function getStatusText(subscription) {
        const { daysLeft } = getSubscriptionTimeInfo(subscription);
        if (subscription.trialPeriod && daysLeft > 0) {
            return daysLeft <= 3 ? 'Deneme Bitiyor' : 'Deneme';
        } else if (daysLeft < 0) {
            return 'Süresi Doldu';
        } else if (daysLeft <= 7) {
            return 'Yakında Bitiyor';
        }
        return 'Aktif';
    }

    function getSubscriptionTimeInfo(subscription) {
        const startDate = new Date(subscription.startDate);
        const today = new Date();
        const isAutoRenewal = subscription.autoRenewal === 'true';

        let endDate = new Date(startDate);
        switch (subscription.billingCycle) {
            case 'weekly':
                endDate.setDate(startDate.getDate() + 7);
                break;
            case 'monthly':
                endDate.setMonth(startDate.getMonth() + 1);
                break;
            case 'quarterly':
                endDate.setMonth(startDate.getMonth() + 3);
                break;
            case 'semi-annually':
                endDate.setMonth(startDate.getMonth() + 6);
                break;
            case 'yearly':
                endDate.setFullYear(startDate.getFullYear() + 1);
                break;
        }

        if (subscription.trialPeriod) {
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + parseInt(subscription.trialPeriod));
        }

        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

        return { daysLeft, endDate, isAutoRenewal, fee: subscription.fee };
    }

    function getBillingCycleText(billingCycle) {
        switch (billingCycle) {
            case 'weekly': return 'Haftalık';
            case 'monthly': return 'Aylık';
            case 'quarterly': return '3 Aylık';
            case 'semi-annually': return '6 Aylık';
            case 'yearly': return 'Yıllık';
            default: return billingCycle;
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function renderTrialSubscriptions() {
        const trialList = document.getElementById('trial-list');
        trialList.innerHTML = '';

        const trialSubscriptions = subscriptions.filter(sub => sub.trialPeriod && getSubscriptionTimeInfo(sub).daysLeft > 0);

        trialSubscriptions.forEach(sub => {
            const { daysLeft } = getSubscriptionTimeInfo(sub);
            const trialItem = document.createElement('div');
            trialItem.className = 'trial-item';
            trialItem.innerHTML = `
                <span>${sub.platform}: ${daysLeft} gün kaldı</span>
                <button onclick="endTrial(${subscriptions.indexOf(sub)})">Denemeyi Bitir</button>
            `;
            trialList.appendChild(trialItem);
        });
    }

    function renderUpcomingRenewals() {
        const upcomingRenewals = subscriptions
            .map(subscription => {
                const { daysLeft, endDate, fee } = getSubscriptionTimeInfo(subscription);
                return { ...subscription, daysLeft, endDate, fee };
            })
            .filter(sub => sub.daysLeft >= 0 && sub.daysLeft <= 30)
            .sort((a, b) => a.daysLeft - b.daysLeft);

        const renewalsList = document.getElementById('upcoming-renewals-list');
        renewalsList.innerHTML = '';

        if (upcomingRenewals.length === 0) {
            renewalsList.innerHTML = '<p>Yaklaşan yenileme bulunmuyor.</p>';
            return;
        }

        upcomingRenewals.forEach(subscription => {
            const renewalItem = document.createElement('div');
            renewalItem.className = 'renewal-item';
            renewalItem.innerHTML = `
                <span>${subscription.platform}</span>
                <span>${subscription.daysLeft} gün kaldı</span>
                <span>${subscription.fee} <i class="fas fa-turkish-lira-sign"></i></span>
                <span>${formatDate(subscription.endDate)}</span>
            `;
            renewalsList.appendChild(renewalItem);
        });
    }

    function updateTotalCost() {
        const monthlyTotal = calculateMonthlyTotal();
        const totalCostElement = document.getElementById('total-cost');
        totalCostElement.textContent = `Aylık Toplam: ${monthlyTotal.toFixed(2)} TL`;
    }

    function setupSortable() {
        const subscriptionsList = document.getElementById('subscriptions');
        new Sortable(subscriptionsList, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function() {
                const newOrder = Array.from(subscriptionsList.children).map(card => parseInt(card.dataset.index));
                subscriptions = newOrder.map(index => subscriptions[index]);
                SubscriptionStore.set(subscriptions);
                renderSubscriptions();
            }
        });
    }

    function showAddSubscriptionModal() {
        document.getElementById('modal-title').textContent = 'Yeni Abonelik Ekle';
        document.getElementById('subscription-form').reset();
        document.getElementById('subscription-modal').style.display = 'block';
        setupMultiStepForm();
    }

    function closeModal() {
        document.getElementById('subscription-modal').style.display = 'none';
    }

    function handleFormSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const subscription = Object.fromEntries(formData.entries());
        subscription.fee = parseFloat(subscription.fee);
        subscription.trialPeriod = subscription.trialPeriod ? parseInt(subscription.trialPeriod) : null;

        const editIndex = event.target.dataset.editIndex;
        if (editIndex !== undefined) {
            subscriptions[editIndex] = subscription;
        } else {
            subscriptions.push(subscription);
        }

        SubscriptionStore.set(subscriptions);
        renderSubscriptions();
        closeModal();
        showNotification('Abonelik başarıyla kaydedildi.', 'success');
    }

    function editSubscription(index) {
        const subscription = subscriptions[index];
        document.getElementById('modal-title').textContent = 'Abonelik Düzenle';
        document.getElementById('subscription-form').dataset.editIndex = index;
        
        document.getElementById('platform').value = subscription.platform;
        document.getElementById('category').value = subscription.category;
        document.getElementById('fee').value = subscription.fee;
        document.getElementById('billingCycle').value = subscription.billingCycle;
        document.getElementById('startDate').value = subscription.startDate;
        document.getElementById('autoRenewal').value = subscription.autoRenewal;
        document.getElementById('trialPeriod').value = subscription.trialPeriod || '';

        document.getElementById('subscription-modal').style.display = 'block';
        setupMultiStepForm();
    }

    function deleteSubscription(index) {
        if (confirm('Bu aboneliği silmek istediğinizden emin misiniz?')) {
            subscriptions.splice(index, 1);
            SubscriptionStore.set(subscriptions);
            renderSubscriptions();
            showNotification('Abonelik başarıyla silindi.', 'success');
        }
    }

    function filterSubscriptions() {
        const category = document.getElementById('category-filter').value;
        const filteredSubscriptions = category === 'all' 
            ? subscriptions 
            : subscriptions.filter(sub => sub.category === category);
        renderFilteredSubscriptions(filteredSubscriptions);
    }

    function sortSubscriptions() {
        const sortBy = document.getElementById('sort-select').value;
        const sortedSubscriptions = [...subscriptions].sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(b.startDate) - new Date(a.startDate);
                case 'price':
                    return b.fee - a.fee;
                case 'name':
                    return a.platform.localeCompare(b.platform);
                case 'daysLeft':
                    const aDaysLeft = getSubscriptionTimeInfo(a).daysLeft;
                    const bDaysLeft = getSubscriptionTimeInfo(b).daysLeft;
                    return aDaysLeft - bDaysLeft;
                default:
                    return 0;
            }
        });
        renderFilteredSubscriptions(sortedSubscriptions);
    }

    function renderFilteredSubscriptions(filteredSubscriptions) {
        const subscriptionsContainer = document.getElementById('subscriptions');
        subscriptionsContainer.innerHTML = '';
        filteredSubscriptions.forEach((subscription, index) => {
            const card = createSubscriptionCard(subscription, index);
            subscriptionsContainer.appendChild(card);
        });
    }

    function handlePlatformInput(event) {
        const input = event.target.value.toLowerCase();
        const suggestions = Object.keys(popularSubscriptions).filter(platform => 
            platform.toLowerCase().includes(input)
        );
        
        const suggestionsContainer = document.getElementById('platform-suggestions');
        suggestionsContainer.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const div = document.createElement('div');
            div.textContent = suggestion;
            div.addEventListener('click', () => {
                document.getElementById('platform').value = suggestion;
                document.getElementById('category').value = popularSubscriptions[suggestion];
                suggestionsContainer.innerHTML = '';
            });
            suggestionsContainer.appendChild(div);
        });
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    function setupMultiStepForm() {
        const form = document.getElementById('subscription-form');
        const steps = form.querySelectorAll('.form-step');
        const progressBar = form.querySelector('.progress');
        let currentStep = 0;

        function showStep(stepIndex) {
            steps.forEach((step, index) => {
                step.style.display = index === stepIndex ? 'block' : 'none';
            });
            updateProgress();
        }

        function updateProgress() {
            const progress = ((currentStep + 1) / steps.length) * 100;
            progressBar.style.width = `${progress}%`;
        }

        form.querySelectorAll('.next-step').forEach(button => {
            button.addEventListener('click', () => {
                if (currentStep < steps.length - 1) {
                    currentStep++;
                    showStep(currentStep);
                }
            });
        });

        form.querySelectorAll('.prev-step').forEach(button => {
            button.addEventListener('click', () => {
                if (currentStep > 0) {
                    currentStep--;
                    showStep(currentStep);
                }
            });
        });

        showStep(currentStep);
    }

    function checkUpcomingRenewals() {
        const today = new Date();
        const upcomingRenewals = subscriptions.filter(sub => {
            const { daysLeft } = getSubscriptionTimeInfo(sub);
            return daysLeft >= 0 && daysLeft <= 3;
        });

        if (upcomingRenewals.length > 0) {
            const message = `${upcomingRenewals.length} aboneliğiniz yakında yenilenecek.`;
            showNotification(message, 'warning');
        }
    }

    return {
        init: init,
        endTrial: function(index) {
            subscriptions[index].trialPeriod = null;
            SubscriptionStore.set(subscriptions);
            renderSubscriptions();
            showNotification('Deneme süresi sonlandırıldı.', 'success');
        }
    };
})();

document.addEventListener('DOMContentLoaded', SubscriptionApp.init);

// Global scope'a endTrial fonksiyonunu ekleyin
window.endTrial = SubscriptionApp.endTrial;