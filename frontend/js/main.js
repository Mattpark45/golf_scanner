class GolfTeeScanner {
    constructor() {
        this.scanning = false;
        this.selectedDate = null;
        this.activeAlarms = {};
        this.golfCards = {};
        this.apiUrl = 'http://localhost:5000/api';
        
        this.initializeElements();
        this.setupEventListeners();
        this.createDateTabs();
    }

    initializeElements() {
        this.scanButton = document.getElementById('scanButton');
        this.dateTabsContainer = document.getElementById('dateTabs');
        this.golfCardsContainer = document.getElementById('golfCards');
        this.alarmList = document.getElementById('alarmList');
        this.activeAlarmsLabel = document.getElementById('activeAlarms');
    }

    setupEventListeners() {
        this.scanButton.addEventListener('click', () => this.toggleScanning());
    }

    createDateTabs() {
        const dates = this.getNextDays(8);
        dates.forEach((date, index) => {
            const button = document.createElement('button');
            button.className = `date-tab ${index === 0 ? 'active' : ''}`;
            button.textContent = this.formatDate(date);
            button.dataset.fullDate = this.formatFullDate(date);
            button.addEventListener('click', (e) => this.selectDate(e.target));
            this.dateTabsContainer.appendChild(button);
        });
        this.selectedDate = this.formatFullDate(dates[0]);
    }

    getNextDays(count) {
        const dates = [];
        for (let i = 0; i < count; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            dates.push(date);
        }
        return dates;
    }

    formatDate(date) {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    formatFullDate(date) {
        return date.toISOString().split('T')[0];
    }

    selectDate(buttonElement) {
        // 모든 탭에서 active 클래스 제거
        this.dateTabsContainer.querySelectorAll('.date-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 선택된 탭에 active 클래스 추가
        buttonElement.classList.add('active');
        
        // 선택된 날짜 저장
        this.selectedDate = buttonElement.dataset.fullDate;
        
        // 스캔 중이라면 재시작
        if (this.scanning) {
            this.toggleScanning().then(() => this.toggleScanning());
        }
    }

    async toggleScanning() {
        if (!this.scanning) {
            try {
                const response = await fetch(`${this.apiUrl}/start-scanning`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ date: this.selectedDate })
                });
                
                if (response.ok) {
                    this.scanning = true;
                    this.scanButton.textContent = '스캔 중지';
                    this.updateAlarm('스캔을 시작합니다...');
                    this.startDataPolling();
                } else {
                    throw new Error('Failed to start scanning');
                }
            } catch (error) {
                this.updateAlarm(`스캔 시작 실패: ${error.message}`);
            }
        } else {
            try {
                const response = await fetch(`${this.apiUrl}/stop-scanning`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    this.scanning = false;
                    this.scanButton.textContent = '스캔 시작';
                    this.updateAlarm('스캔을 중지합니다...');
                    this.stopDataPolling();
                } else {
                    throw new Error('Failed to stop scanning');
                }
            } catch (error) {
                this.updateAlarm(`스캔 중지 실패: ${error.message}`);
            }
        }
    }

    async fetchGolfData() {
        try {
            const response = await fetch(`${this.apiUrl}/golf-data`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            this.updateAlarm(`데이터 가져오기 실패: ${error.message}`);
            return [];
        }
    }

    startDataPolling() {
        this.pollingInterval = setInterval(async () => {
            const data = await this.fetchGolfData();
            this.updateGolfCards(data);
        }, 10000); // 10초마다 데이터 업데이트
    }

    stopDataPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }

    updateGolfCards(data) {
        // 기존 알람 상태 저장
        const previousAlarms = {};
        Object.keys(this.golfCards).forEach(name => {
            const card = this.golfCards[name];
            if (card.alarmCheckbox) {
                previousAlarms[name] = card.alarmCheckbox.checked;
            }
        });

        // 컨테이너 비우기
        this.golfCardsContainer.innerHTML = '';
        this.golfCards = {};

        // 새 카드 생성
        data.forEach(golf => {
            const card = this.createGolfCard(golf);
            this.golfCardsContainer.appendChild(card.element);
            this.golfCards[golf.golf_course] = card;

            // 이전 알람 상태 복원
            if (previousAlarms[golf.golf_course]) {
                card.alarmCheckbox.checked = true;
                this.handleAlarmToggle(golf.golf_course, true, golf);
            }
        });

        // 알람 상태 업데이트
        this.updateActiveAlarmsCount();
    }

    createGolfCard(golf) {
        const cardElement = document.createElement('div');
        cardElement.className = 'golf-card';

        const content = `
            <h3>${golf.golf_course}</h3>
            <p class="location">${golf.location}</p>
            <p class="price">${golf.price}</p>
            <p class="teams">남은 팀: ${golf.remaining_teams}</p>
            <p class="time">시간: ${golf.play_time}</p>
            <div class="alarm-container">
                <label class="alarm-toggle">
                    <input type="checkbox" class="alarm-checkbox">
                    알람 설정
                </label>
            </div>
        `;

        cardElement.innerHTML = content;

        const alarmCheckbox = cardElement.querySelector('.alarm-checkbox');
        alarmCheckbox.addEventListener('change', (e) => {
            this.handleAlarmToggle(golf.golf_course, e.target.checked, golf);
        });

        return {
            element: cardElement,
            alarmCheckbox: alarmCheckbox,
            data: golf
        };
    }

    handleAlarmToggle(golfName, isChecked, golfData) {
        if (isChecked) {
            this.addAlarm(golfName, golfData);
        } else {
            this.removeAlarm(golfName);
        }
    }

    addAlarm(golfName, golfData) {
        const teamsCount = this.extractNumber(golfData.remaining_teams);
        
        this.activeAlarms[golfName] = {
            teams: teamsCount,
            play_time: golfData.play_time,
            data: golfData
        };

        const message = `[알람 설정]\n골프장: ${golfName}\n경기 시간: ${golfData.play_time}\n현재 팀 수: ${teamsCount}팀`;
        this.updateAlarm(message);
        this.updateActiveAlarmsCount();
    }

    removeAlarm(golfName) {
        if (this.activeAlarms[golfName]) {
            const message = `❌ 알람 해제: ${golfName}`;
            this.updateAlarm(message);
            delete this.activeAlarms[golfName];
            this.updateActiveAlarmsCount();
        }
    }

    extractNumber(str) {
        const matches = str.match(/\d+/);
        return matches ? parseInt(matches[0]) : 0;
    }

    updateActiveAlarmsCount() {
        const count = Object.keys(this.activeAlarms).length;
        this.activeAlarmsLabel.textContent = `활성 알람: ${count}개`;
    }

    updateAlarm(message) {
        const time = new Date().toLocaleTimeString();
        const alarmEntry = document.createElement('div');
        alarmEntry.className = 'alarm-entry';
        alarmEntry.innerHTML = `<span class="alarm-time">[${time}]</span> ${message}`;
        this.alarmList.appendChild(alarmEntry);
        this.alarmList.scrollTop = this.alarmList.scrollHeight;
    }

    checkAlarms(newData) {
        newData.forEach(golf => {
            const alarm = this.activeAlarms[golf.golf_course];
            if (alarm) {
                const currentTeams = this.extractNumber(golf.remaining_teams);
                if (currentTeams < alarm.teams) {
                    this.notifyTeamDecrease(
                        golf.golf_course,
                        alarm.teams,
                        currentTeams,
                        golf.play_time
                    );
                    alarm.teams = currentTeams;
                }
            }
        });
    }

    notifyTeamDecrease(golfName, previousTeams, currentTeams, playTime) {
        const message = `[티타임 변동 알림]\n` +
                       `골프장: ${golfName}\n` +
                       `경기 시간: ${playTime}\n` +
                       `팀 수 변동: ${previousTeams}팀 → ${currentTeams}팀\n` +
                       `알림 시각: ${new Date().toLocaleTimeString()}`;
        
        this.updateAlarm(message);
        this.playNotificationSound();
        this.showBrowserNotification(message);
    }

    playNotificationSound() {
        // 알림음 재생 로직
        const audio = new Audio('notification.mp3');
        audio.play().catch(e => console.log('알림음 재생 실패:', e));
    }

    async showBrowserNotification(message) {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                new Notification('티타임 알림', {
                    body: message,
                    icon: 'path/to/icon.png'
                });
            }
        }
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new GolfTeeScanner();
});