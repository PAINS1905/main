body.pains-theme .sidebar {
            position: fixed !important;
            top: 0 !important;
            left: calc(-1 * var(--pains-sidebar-width) - 24px) !important;
            width: var(--pains-sidebar-width) !important;
            height: 100vh !important;
            
            /* 👇 높이 계산을 정확하게 맞추기 위해 추가 */
            box-sizing: border-box !important; 
            
            /* 👇 기존 18px이던 하단 패딩을 80px로 늘려 모바일에서도 잘리지 않게 여유 공간 확보 */
            padding: calc(var(--pains-header-height) + 12px) 14px 80px !important; 
            
            background: rgba(255,255,255,0.96) !important;
            border-right: 1px solid rgba(216, 222, 232, 0.95);
            box-shadow: 24px 0 60px rgba(15, 23, 42, 0.14);
            overflow-y: auto !important; /* 스크롤바 활성화 */
            overflow-x: hidden;
            overscroll-behavior: contain;
            transition: left 0.28s ease;
            z-index: 1100 !important;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
