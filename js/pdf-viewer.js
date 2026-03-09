// pdf-viewer.html 전용 스크립트
// - query params:
//   - src: pdf.js가 로드할 URL (프록시 적용된 URL도 가능)
//   - direct: 원본 URL (참고용, 뷰어 내 원본 버튼은 삭제됨)
//   - download: 다운로드 URL(선택)
//   - title: 표시용 제목(선택)
//   - file: 파일명(선택)

(() => {
  'use strict';

  const params = new URLSearchParams(location.search);

  const src = params.get('src') || '';
  const direct = params.get('direct') || src;
  const download = params.get('download') || direct;
  const title = params.get('title') || params.get('file') || 'PDF 미리보기';
  const file = params.get('file') || '';

  const $ = (id) => document.getElementById(id);

  const els = {
    title: $('doc-title'),
    canvas: $('pdf-canvas'),
    prev: $('btn-prev'),
    next: $('btn-next'),
    zoomIn: $('btn-zoom-in'),
    zoomOut: $('btn-zoom-out'),
    status: $('page-status'),
    // open: $('btn-open'), // 원본 열기 버튼 연결 삭제
    download: $('btn-download'),
    error: $('error-box'),
  };

  // UI 세팅
  document.title = title;
  if (els.title) els.title.textContent = title;

  // 원본 버튼에 href 연결하던 부분 삭제
  
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
    if (!els.status) return;
    if (!pdfDoc) {
      els.status.textContent = '- / -';
      return;
    }
    els.status.textContent = `${pageNum} / ${pdfDoc.numPages}`;
  }

  function setNavDisabled() {
    if (!pdfDoc) {
      if (els.prev) els.prev.disabled = true;
      if (els.next) els.next.disabled = true;
      return;
    }
    if (els.prev) els.prev.disabled = pageNum <= 1;
    if (els.next) els.next.disabled = pageNum >= pdfDoc.numPages;
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

      // 캔버스 픽셀 비율 보정(레티나 대응)
      const outputScale = window.devicePixelRatio || 1;
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

  function zoomIn() {
    scale = Math.min(MAX_SCALE, Math.round(scale * 1.12 * 100) / 100);
    queueRenderPage(pageNum);
  }

  function zoomOut() {
    scale = Math.max(MIN_SCALE, Math.round(scale / 1.12 * 100) / 100);
    queueRenderPage(pageNum);
  }

  function attachEvents() {
    if (els.prev) els.prev.addEventListener('click', onPrevPage);
    if (els.next) els.next.addEventListener('click', onNextPage);
    if (els.zoomIn) els.zoomIn.addEventListener('click', zoomIn);
    if (els.zoomOut) els.zoomOut.addEventListener('click', zoomOut);

    // 키보드 네비게이션
    window.addEventListener('keydown', (e) => {
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

      // 에러 메시지에서 '원본' 텍스트 삭제
      showError(
        '<strong>PDF를 미리보기로 불러오지 못했습니다.</strong><br />' +
        '대신 상단의 <strong>다운로드</strong> 버튼으로 파일을 저장해 열어보세요.' +
        extra
      );

      // 네비게이션은 비활성
      if (els.prev) els.prev.disabled = true;
      if (els.next) els.next.disabled = true;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
