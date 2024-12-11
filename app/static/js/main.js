document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    let isScanning = false;
    let selectedDate = null;

    // 소켓 연결 상태 처리
    socket.on('connect', () => {
        console.log('서버에 연결되었습니다.');
    });

    socket.on('disconnect', () => {
        console.log('서버와 연결이 끊어졌습니다.');
    });

    // 날짜 탭 초기화
    function initializeDateTabs() {
        const dateTabsContainer = document.getElementById('dateTabs');
        const today = new Date();
        
        for (let i = 0; i < 8; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            const dateStr = date.toISOString().split('T')[0];
            const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
            
            const tabButton = document.createElement('button');
            tabButton.className = `date-tab ${i === 0 ? 'active' : ''}`;
            tabButton.textContent = formattedDate;
            tabButton.dataset.date = dateStr;
            
            tabButton.addEventListener('click', () => selectDate(dateStr, tabButton));
            dateTabsContainer.appendChild(tabButton);
        }

        // 초기 날짜 설정
        selectedDate = today.toISOString().split('T')[0];
    }

    // 날짜 선택 처리
    function selectDate(date, button) {
        selectedDate = date;
        document.querySelectorAll('.date-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        button.classList.add('active');

        if (isScanning) {
            startScanning();
        }
    }

    // 스캔 버튼 이벤트 처리
    const scanButton = document.getElementById('scanButton');
    scanButton.addEventListener('click', () => {
        isScanning = !isScanning;
        scanButton.textContent = isScanning ? '스캔 중지' : '스캔 시작';
        
        if (isScanning) {
            startScanning();
        }
    });

    // 스캔 시작 함수
    function startScanning() {
        if (!selectedDate) {
            addAlarmMessage('날짜를 선택해주세요.');
            return;
        }

        socket.emit('start_scanning', { date: selectedDate });
    }

    // 스캔 결과 처리
    socket.on('scan_results', (response) => {
        if (response.status === 'success') {
            updateGolfCards(response.data);
        }
    });

    // 골프장 카드 업데이트
    function updateGolfCards(data) {
        const container = document.getElementById('golfCards');
        container.innerHTML = '';

        data.forEach(golf => {
            const card = createGolfCard(golf);
            container.appendChild(card);
        });
    }

    // 골프장 카드 생성
    function createGolfCard(golf) {
        const card = document.createElement('div');
        card.className = 'golf-card';
        
        card.innerHTML = `
            <h3>${golf.golf_course}</h3>
            <p class="location">${golf.location}</p>
            <p class="price">${golf.price}</p>
            <p class="teams">남은 팀: ${golf.remaining_teams}</p>
            <div class="alarm-checkbox">
                <input type="checkbox" id="alarm_${golf.golf_course}" 
                       onchange="toggleAlarm('${golf.golf_course}', this.checked, '${golf.remaining_teams}', '${golf.play_time}')">
                <label for="alarm_${golf.golf_course}">알람 설정</label>
            </div>
        `;

        return card;
    }

    // 알람 토글
    window.toggleAlarm = function(golfName, isActive, teams, playTime) {
        socket.emit('toggle_alarm', {
            golf_name: golfName,
            is_active: isActive,
            teams: teams,
            play_time: playTime
        });
    };

    // 알람 메시지 추가
    function addAlarmMessage(message) {
        const alarmList = document.getElementById('alarmList');
        const messageElement = document.createElement('div');
        messageElement.className = 'alarm-message';
        messageElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        alarmList.appendChild(messageElement);
        alarmList.scrollTop = alarmList.scrollHeight;
    }

    // 알람 업데이트 처리
    socket.on('alarm_update', (data) => {
        addAlarmMessage(data.message);
        updateAlarmCount();
    });

    // 알람 카운트 업데이트
    function updateAlarmCount() {
        const activeAlarms = document.querySelectorAll('input[type="checkbox"]:checked').length;
        document.getElementById('alarmCount').textContent = activeAlarms;
    }

    // 초기화
    initializeDateTabs();
});