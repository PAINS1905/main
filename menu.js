/* menu.js - v2.3 (지원 메뉴 순서 변경 완료) */

// ============================================================
// [1] 사이드바 로드 및 초기화
// ============================================================
function loadSidebar(currentPage) {
    console.log("PAINS Menu v2.3 Loaded");

    const sidebarHTML = `
        <a href="index.html" id="link-home">Home</a>
        
        <a href="javascript:void(0)" class="menu-toggle" onclick="toggleSubmenu('members-submenu', 'members-arrow')">
            Members <span id="members-arrow" style="font-size:0.8rem; transition: transform 0.3s; display:inline-block;">▼</span>
        </a>
        <div class="submenu" id="members-submenu">
            <a href="members.html" id="link-members">운영진</a>
            <a href="attendance.html" id="link-attendance">출석 현황 확인</a>
            <a href="fee.html" id="link-fee">회비 내역 조회</a>
        </div>

        <a href="javascript:void(0)" class="menu-toggle" onclick="toggleSubmenu('support-submenu', 'support-arrow')">
            지원 <span id="support-arrow" style="font-size:0.8rem; transition: transform 0.3s; display:inline-block;">▼</span>
        </a>
        <div class="submenu" id="support-submenu">
            <a href="javascript:void(0)" onclick="alert('지원 기간이 아닙니다. 11기 1차 지원은 2월 9일 월요일부터 가능합니다.')" id="link-apply">지원하기</a>
            <a href="javascript:void(0)" onclick="alert('지원 기간이 아닙니다.')" id="link-result">지원 결과 안내</a>
        </div>
    `;

    // HTML에 사이드바 내용 넣기
    const sidebarElement = document.getElementById('sidebar');
    if (sidebarElement) {
        sidebarElement.innerHTML = sidebarHTML;
    }

    // 스타일(헤더 고정 + 메뉴 애니메이션) 주입
    initGlobalStyles();

    // 현재 페이지 강조 (Highlighting) 및 메뉴 열기
    if (currentPage) {
        const targetLink = document.getElementById('link-' + currentPage);
        if (targetLink) {
            targetLink.style.color = "#ab3333";
            targetLink.style.fontWeight = "bold";
            targetLink.style.backgroundColor = "#f0f0f0";

            const parentSubmenu = targetLink.closest('.submenu');
            if (parentSubmenu) {
                // 메뉴 열기
                parentSubmenu.classList.add('open');
                
                // 화살표 회전 처리
                const toggleBtn = parentSubmenu.previousElementSibling; 
                if(toggleBtn) {
                    const arrowSpan = toggleBtn.querySelector('span');
                    if(arrowSpan) {
                        arrowSpan.style.transform = 'rotate(180deg)';
                    }
                }
            }
        }
    }
}

// ============================================================
// [2] 전역 스타일 주입
// ============================================================
function initGlobalStyles() {
    if (document.getElementById('pains-dynamic-style')) return;

    const style = document.createElement('style');
    style.id = 'pains-dynamic-style';
    style.innerHTML = `
        /* [1] 스마트 헤더 스타일 */
        header {
            position: fixed !important;
            top: 0;
            left: 0;
            width: 100%;
            transition: transform 0.3s ease-in-out;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        body { padding-top: 70px !important; }
        
        header.nav-up { transform: translateY(-100%); }

        /* [2] 부드러운 서브메뉴 애니메이션 스타일 */
        .submenu {
            display: block !important; 
            max-height: 0; 
            overflow: hidden;
            opacity: 0;
            transition: max-height 0.4s ease-in-out, opacity 0.4s ease-in-out;
            background-color: #f8f8f8;
            border-bottom: none !important;
        }
        
        .submenu.open {
            max-height: 1000px; 
            opacity: 1;
            border-bottom: 1px solid #eee !important;
        }
    `;
    document.head.appendChild(style);

    initScrollEvent();
}

// ============================================================
// [3] 스크롤 감지 로직
// ============================================================
function initScrollEvent() {
    let lastScrollTop = 0;
    const delta = 5;
    const header = document.querySelector('header');
    
    if (!header) return;

    window.addEventListener('scroll', function() {
        const st = window.scrollY || document.documentElement.scrollTop;
        if (Math.abs(lastScrollTop - st) <= delta) return;

        if (st > lastScrollTop && st > header.offsetHeight) {
            header.classList.add('nav-up');
        } else {
            if(st + window.innerHeight < document.body.scrollHeight) {
                header.classList.remove('nav-up');
            }
        }
        lastScrollTop = st;
    });
}

// ============================================================
// [4] 토글 기능들
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
        // [닫기]
        submenu.classList.remove('open');
        if(arrow) {
            arrow.style.transform = 'rotate(0deg)';
        }
    } else {
        // [열기]
        submenu.classList.add('open');
        if(arrow) {
            arrow.style.transform = 'rotate(180deg)';
        }
    }
}
