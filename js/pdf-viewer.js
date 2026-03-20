// pdf-viewer.html 전용 스크립트

(() => {
  'use strict';

  const params = new URLSearchParams(location.search);

  const src = params.get('src') || '';
  const direct = params.get('direct') || src;
  const download = params.get('download') || direct;
  const title = params.get('title') || params.get('file') || 'PDF 미리보기';
  const file = params.get('file') || '';

  const fromPage = params.get('from') || 'activity';

  const $ = (id) => document.getElementById(id);

  const els = {
    title: $('doc-title'),
    canvas: $('pdf-canvas'),
    first: $('btn-first'), // 맨 앞 버튼
    prev: $('btn-prev'),
    next: $('btn-next'),
    last: $('btn-last'),   // 맨 뒤 버튼
    pageInput: $('page-num-input'), // 페이지 번호 입력창
    pageCount: $('page-count'),     // 전체 페이지 수 표시 영역
    zoomIn: $('btn-zoom-in'),
    zoomOut: $('btn-zoom-out'),
    download: $('btn-download'),
    error: $('error-box'),
    listBtn: $('btn-list'),
  };

  // UI 세팅
  document.title = title;
  if (els.title) els.title.textContent = title;

  if (els.listBtn) {
    els.listBtn.href = fromPage === 'notice' ? 'notice.html' : 'activity.html';
  }

  if (els.download) {
    els.download.href = download || '#';
    if (file) els.download.setAttribute('download', file);
  }

  // pdf.js 렌더링 상태
  let pdfDoc = null;
  let pageNum = 1;
  let pageRendering = false;
  let pageNumPending = null;
  let scale = 1.15; // 기본 배율
  const MIN_SCALE = 0.6;
  const MAX_SCALE = 2.6;

  function setStatus() {
    if (!pdfDoc) {
      if (els.pageInput) els.pageInput.value = '';
      if (els.pageCount) els.pageCount.textContent = '/ -';
      return;
    }
    // 현재 페이지 번호와 전체 페이지 수 업데이트
    if (els.pageInput) {
      els.pageInput.value = pageNum;
      els.pageInput.max = pdfDoc.numPages;
    }
    if (els.pageCount) {
      els.pageCount.textContent = `/ ${pdfDoc.numPages}`;
    }
  }

  function setNavDisabled() {
    if (!pdfDoc) {
      if (els.first) els.first.disabled = true;
      if (els.prev) els.prev.disabled = true;
      if (els.next) els.next.disabled = true;
      if (els.last) els.last.disabled = true;
      if (els.pageInput) els.pageInput.disabled = true;
      return;
    }
    
    const isFirstPage = pageNum <= 1;
    const isLastPage = pageNum >= pdfDoc.numPages;

    if (els.first) els.first.disabled = isFirstPage;
    if (els.prev) els.prev.disabled = isFirstPage;
    if (els.next) els.next.disabled = isLastPage;
    if (els.last) els.last.disabled = isLastPage;
    
    // 문서가 로드되면 입력창 활성화
    if (els.pageInput) els.pageInput.disabled = false;
  }

  function showError(html) {
    if (!els.error) return;
    els.error.style.display = 'block';
    els.error.innerHTML = html;
  }

  async function renderPage(num) {
    if (!pdfDoc) return;
    pageRendering = true;

    try {
      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale });

      const canvas = els.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });

      const baseScale = window.devicePixelRatio || 1;
      
      // 기기가 이미 고해상도(레티나 등)라면 무리하게 올리지 않고 1.5배만, 일반 모니터면 2배 적용
      const qualityMultiplier = baseScale >= 2 ? 1.5 : 2; 
      let outputScale = baseScale * qualityMultiplier;

      // 캔버스 최대 픽셀 제한 (브라우저 메모리 초과로 인한 검은 화면 뻗음 방지)
      const MAX_DIMENSION = 4000; 
      if (viewport.width * outputScale > MAX_DIMENSION || viewport.height * outputScale > MAX_DIMENSION) {
        outputScale = Math.min(MAX_DIMENSION / viewport.width, MAX_DIMENSION / viewport.height);
      }

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      const renderContext = {
        canvasContext: ctx,
        viewport,
        transform,
      };

      await page.render(renderContext).promise;
    } finally {
      pageRendering = false;
      if (pageNumPending !== null) {
        const next = pageNumPending;
        pageNumPending = null;
        renderPage(next);
      }
      setStatus();
      setNavDisabled();
    }
  }

  function queueRenderPage(num) {
    if (pageRendering) {
      pageNumPending = num;
    } else {
      renderPage(num);
    }
  }

  function onFirstPage() {
    if (!pdfDoc || pageNum <= 1) return;
    pageNum = 1;
    queueRenderPage(pageNum);
  }

  function onPrevPage() {
    if (!pdfDoc || pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
  }

  function onNextPage() {
    if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
  }

  function onLastPage() {
    if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
    pageNum = pdfDoc.numPages;
    queueRenderPage(pageNum);
  }

  // 사용자가 직접 번호를 입력했을 때 처리하는 함수
  function onPageInput(e) {
    if (!pdfDoc) return;
    
    let inputVal = parseInt(e.target.value, 10);
    
    // 빈칸이거나 숫자가 아니면 무시하고 현재 페이지로 되돌림
    if (isNaN(inputVal)) {
      e.target.value = pageNum;
      return;
    }
    
    // 범위를 벗어나는 숫자 방어 로직
    if (inputVal < 1) inputVal = 1;
    if (inputVal > pdfDoc.numPages) inputVal = pdfDoc.numPages;

    if (inputVal !== pageNum) {
      pageNum = inputVal;
      queueRenderPage(pageNum);
    } else {
      e.target.value = pageNum; 
    }
  }

  function zoomIn() {
    scale = Math.min(MAX_SCALE, Math.round(scale * 1.12 * 100) / 100);
    queueRenderPage(pageNum);
  }

  function zoomOut() {
    scale = Math.max(MIN_SCALE, Math.round(scale / 1.12 * 100) / 100);
    queueRenderPage(pageNum);
  }

  function attachEvents() {
    if (els.first) els.first.addEventListener('click', onFirstPage);
    if (els.prev) els.prev.addEventListener('click', onPrevPage);
    if (els.next) els.next.addEventListener('click', onNextPage);
    if (els.last) els.last.addEventListener('click', onLastPage);
    
    // 페이지 직접 입력 이벤트 연결 (엔터 쳤을 때 & 마우스로 다른 곳 클릭했을 때)
    if (els.pageInput) {
      els.pageInput.addEventListener('change', onPageInput);
      els.pageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          onPageInput(e);
          els.pageInput.blur(); // 엔터 후 포커스 해제
        }
      });
    }

    if (els.zoomIn) els.zoomIn.addEventListener('click', zoomIn);
    if (els.zoomOut) els.zoomOut.addEventListener('click', zoomOut);

    // 키보드 네비게이션
    window.addEventListener('keydown', (e) => {
      // 입력창에 포커스가 있을 때는 방향키로 페이지 넘김을 막습니다.
      if (document.activeElement === els.pageInput) return;

      if (e.key === 'ArrowLeft') onPrevPage();
      if (e.key === 'ArrowRight') onNextPage();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
    });
  }

  async function init() {
    attachEvents();
    setStatus();
    setNavDisabled();

    if (!src) {
      showError(
        '<strong>PDF 경로가 없습니다.</strong><br />' +
        'activity 페이지에서 다시 열어주세요.'
      );
      return;
    }

    try {
      // pdf.js 로드
      const loadingTask = pdfjsLib.getDocument({
        url: src,
        withCredentials: false,
        disableRange: false,
        disableStream: false,
      });

      pdfDoc = await loadingTask.promise;
      setStatus();
      setNavDisabled();
      renderPage(pageNum);
    } catch (err) {
      console.error(err);

      const looksLikeRelease =
        typeof direct === 'string' && direct.includes('/releases/') && direct.includes('/download/');

      const extra =
        looksLikeRelease
          ? '<br /><br />' +
            '원인이 <strong>GitHub Releases 자산(CORS 제한)</strong>일 가능성이 큽니다.<br />' +
            '이 경우 pdf.js로는 직접 불러올 수 없고, <strong>프록시</strong>를 설정해야 미리보기가 됩니다.'
          : '';

      showError(
        '<strong>PDF를 미리보기로 불러오지 못했습니다.</strong><br />' +
        '대신 상단의 <strong>다운로드</strong> 버튼으로 파일을 저장해 열어보세요.' +
        extra
      );

      setNavDisabled(); // 에러 시 모든 버튼/입력창 비활성화
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
