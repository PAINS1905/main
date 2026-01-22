/* menu.js */

// 1. 사이드바 HTML을 생성해서 넣어주는 함수
function loadSidebar(currentPage) {
    const sidebarHTML = `
        <a href="index.html" id="link-home">Home</a>
        
        <a href="javascript:void(0)" class="menu-toggle" onclick="toggleSubmenu('members-submenu', 'members-arrow')">
            Members <span id="members-arrow" style="font-size:0.8rem;">▼</span>
        </a>
        <div class="submenu" id="members-submenu">
            <a href="members.html" id="link-members">운영진</a>
            <a href="attendance.html" id="link-attendance">출석 현황 확인</a>
        </div>

        <a href="javascript:void(0)" class="menu-toggle" onclick="toggleSubmenu('support-submenu', 'support-arrow')">
            지원 <span id="support-arrow" style="font-size:0.8rem;">▼</span>
        </a>
        <div class="submenu" id="support-submenu">
            <a href="javascript:void(0)" onclick="alert('지원 기간이 아닙니다.')" id="link-result">지원 결과 안내</a>
            <a href="javascript:void(0)" onclick="alert('지원 기간이 아닙니다.')" id="link-apply">지원하기</a>
        </div>
    `;

    // HTML에 사이드바 내용 넣기
    document.getElementById('sidebar').innerHTML = sidebarHTML;

    // 2. 현재 페이지 강조하기 (Highlighting)
    if (currentPage) {
        const targetLink = document.getElementById('link-' + currentPage);
        if (targetLink) {
            // 강조 스타일 적용
            targetLink.style.color = "#ab3333";
            targetLink.style.fontWeight = "bold";
            targetLink.style.backgroundColor = "#f0f0f0";

            // 만약 서브메뉴 안에 있다면, 그 서브메뉴를 미리 열어두기
            const parentSubmenu = targetLink.closest('.submenu');
            if (parentSubmenu) {
                parentSubmenu.classList.add('open');
                // 화살표 방향도 위로(▲) 변경
                const toggleBtn = parentSubmenu.previousElementSibling; // 바로 위 형제 요소(toggle 버튼)
                if(toggleBtn) {
                    const arrowSpan = toggleBtn.querySelector('span');
                    if(arrowSpan) arrowSpan.innerText = '▲';
                }
            }
        }
    }
}

// 3. 토글 기능들 (모든 페이지 공통)
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function toggleSubmenu(menuId, arrowId) {
    const submenu = document.getElementById(menuId);
    const arrow = document.getElementById(arrowId);
    
    if (submenu.classList.contains('open')) {
        submenu.classList.remove('open');
        arrow.innerText = '▼';
    } else {
        submenu.classList.add('open');
        arrow.innerText = '▲';
    }
}
