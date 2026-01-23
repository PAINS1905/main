/* menu.js */

// ============================================================
// [1] 사이드바 로드 및 초기화
// ============================================================
function loadSidebar(currentPage) {
    const sidebarHTML = `
        <a href="index.html" id="link-home">Home</a>
        
        <a href="javascript:void(0)" class="menu-toggle" onclick="toggleSubmenu('members-submenu', 'members-arrow')">
            Members <span id="members-arrow" style="font-size:0.8rem;">▼</span>
        </a>
        <div class="submenu" id="members-submenu">
            <a href="members.html" id="link-members">운영진</a>
            <a href="attendance.html" id="link-attendance">출석 현황 확인</a>
            <a href="fee.html" id="link-fee">회비 내역 조회</a>
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
    const sidebarElement = document.getElementById('sidebar');
    if (sidebarElement) {
        sidebarElement.innerHTML = sidebarHTML;
    }

    // 현재 페이지 강조 (Highlighting)
    if (currentPage) {
        const targetLink = document.getElementById('link-' + currentPage);
        if (targetLink) {
            targetLink.style.color = "#ab3333";
            targetLink.style.fontWeight = "bold";
            targetLink.style.backgroundColor = "#f0f0f0";

            const parentSubmenu = targetLink.closest('.submenu');
            if (parentSubmenu) {
                parentSubmenu.classList.add('open');
                const toggleBtn = parentSubmenu.previousElementSibling; 
                if(toggleBtn) {
                    const arrowSpan = toggleBtn.querySelector('span');
                    if(arrowSpan) arrowSpan.innerText = '▲';
                }
            }
        }
    }

    // [추가됨] 스마트 헤더 기능 실행
    initSmartHeader();
}

// ============================================================
// [2] 스마트 헤더 기능 (스크롤 반응형) - 여기서 CSS와 동작을 모두 처리
// ============================================================
function initSmartHeader() {
    // 1. 헤더 스타일 강제 주입 (CSS 수정 없이 JS로 처리)
    const style = document.createElement('style');
    style.innerHTML = `
        /* 헤더를 상단에 고정 */
        header {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            transition: transform 0.3s ease-in-out; /* 부드러운 움직임 */
            box-shadow: 0 2px 5px rgba(0,0,0,0.1); /* 그림자 추가 */
        }
        
        /* 헤더가 고정되면서 본문이 가려지는 것을 방지하기 위해 body에 여백 추가 */
        body {
            padding-top: 70px; /* 헤더 높이만큼 공간 확보 */
        }
        
        /* 스크롤 내릴 때 숨김 클래스 */
        header.nav-up {
            transform: translateY(-100%);
        }
    `;
    document.head.appendChild(style);

    // 2. 스크롤 감지 로직
    let lastScrollTop = 0;
    const delta = 5; // 스크롤 감도
    const header = document.querySelector('header');
    
    if (!header) return; // 헤더가 없으면 중단

    window.addEventListener('scroll', function() {
        const st = window.pageYOffset || document.documentElement.scrollTop;
        
        // 바운싱 효과(모바일 등) 무시
        if (Math.abs(lastScrollTop - st) <= delta) return;

        // 스크롤 내릴 때 (Hide) & 헤더 높이보다 더 내렸을 때
        if (st > lastScrollTop && st > header.offsetHeight) {
            header.classList.add('nav-up');
        } 
        // 스크롤 올릴 때 (Show)
        else {
            if(st + window.innerHeight < document.body.scrollHeight) {
                header.classList.remove('nav-up');
            }
        }
        
        lastScrollTop = st;
    });
}

// ============================================================
// [3] 토글 기능들 (모든 페이지 공통)
// ============================================================
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
