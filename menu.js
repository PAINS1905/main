/* menu.js */

// ============================================================
// [1] 사이드바 로드 및 초기화
// ============================================================
function loadSidebar(currentPage) {
    const sidebarHTML = `
        <a href="index.html" id="link-home">Home</a>
        
        <a href="javascript:void(0)" class="menu-toggle" onclick="toggleSubmenu('members-submenu', 'members-arrow')">
            Members <span id="members-arrow" style="font-size:0.8rem; transition: transform 0.3s;">▼</span>
        </a>
        <div class="submenu" id="members-submenu">
            <a href="members.html" id="link-members">운영진</a>
            <a href="attendance.html" id="link-attendance">출석 현황 확인</a>
            <a href="fee.html" id="link-fee">회비 내역 조회</a>
        </div>

        <a href="javascript:void(0)" class="menu-toggle" onclick="toggleSubmenu('support-submenu', 'support-arrow')">
            지원 <span id="support-arrow" style="font-size:0.8rem; transition: transform 0.3s;">▼</span>
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

    // 스타일(헤더 고정 + 메뉴 애니메이션) 주입
    initGlobalStyles();

    // 현재 페이지 강조 (Highlighting)
    if (currentPage) {
        const targetLink = document.getElementById('link-' + currentPage);
        if (targetLink) {
            targetLink.style.color = "#ab3333";
            targetLink.style.fontWeight = "bold";
            targetLink.style.backgroundColor = "#f0f0f0";

            const parentSubmenu = targetLink.closest('.submenu');
            if (parentSubmenu) {
                // 페이지 로드시에는 애니메이션 없이 즉시 열려있게 처리
                parentSubmenu.classList.add('open');
                parentSubmenu.style.maxHeight = "500px"; 
                parentSubmenu.style.opacity = "1";
                
                const toggleBtn = parentSubmenu.previousElementSibling; 
                if(toggleBtn) {
                    const arrowSpan = toggleBtn.querySelector('span');
                    if(arrowSpan) {
                        arrowSpan.innerText = '▲';
                        arrowSpan.style.transform = 'rotate(180deg)';
                    }
                }
            }
        }
    }
}

// ============================================================
// [2] 전역 스타일 주입 (CSS 수정 없이 JS로 처리)
//     - 스마트 헤더 (스크롤 감지)
//     - 부드러운 서브메뉴 애니메이션
// ============================================================
function initGlobalStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* [1] 스마트 헤더 스타일 */
        header {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            transition: transform 0.3s ease-in-out;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        body { padding-top: 70px; } /* 헤더 공간 확보 */
        header.nav-up { transform: translateY(-100%); }

        /* [2] 부드러운 서브메뉴 애니메이션 스타일 */
        /* 기존 HTML의 display:none을 덮어쓰기 위해 !important 사용 */
        .submenu {
            display: block !important; 
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            transition: max-height 0.4s ease-in-out, opacity 0.4s ease-in-out;
            background-color: #f8f8f8;
            border-bottom: none !important; /* 열렸을 때만 선이 보이게 처리 */
        }
        
        .submenu.open {
            max-height: 500px; /* 내용이 다 들어갈 만큼 충분히 큰 값 */
            opacity: 1;
            border-bottom: 1px solid #eee !important;
        }
    `;
    document.head.appendChild(style);

    // 스크롤 감지 이벤트 실행
    initScrollEvent();
}

// ============================================================
// [3] 스크롤 감지 로직 (헤더 숨김/표시)
// ============================================================
function initScrollEvent() {
    let lastScrollTop = 0;
    const delta = 5;
    const header = document.querySelector('header');
    
    if (!header) return;

    window.addEventListener('scroll', function() {
        const st = window.pageYOffset || document.documentElement.scrollTop;
        if (Math.abs(lastScrollTop - st) <= delta) return;

        if (st > lastScrollTop && st > header.offsetHeight) {
            header.classList.add('nav-up'); // 내리면 숨김
        } else {
            if(st + window.innerHeight < document.body.scrollHeight) {
                header.classList.remove('nav-up'); // 올리면 보임
            }
        }
        lastScrollTop = st;
    });
}

// ============================================================
// [4] 토글 기능들 (모든 페이지 공통)
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
        // 닫기
        submenu.classList.remove('open');
        arrow.innerText = '▼';
        arrow.style.transform = 'rotate(0deg)';
    } else {
        // 열기
        submenu.classList.add('open');
        arrow.innerText = '▲';
        arrow.style.transform = 'rotate(180deg)'; // 화살표 회전 효과 추가
    }
}
