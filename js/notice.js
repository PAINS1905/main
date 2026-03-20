// PAINS 공지사항 아카이브
(() => {
  'use strict';

  // 구글 앱스 스크립트 웹 앱 URL (동일한 API 사용)
  const API_URL = "https://script.google.com/macros/s/AKfycbwuNda5HuzwNhp7ecL0BTMt4eCgE8z9y1F8_kDR-ZaEp72mYngLp0DQ4ibWcKDEZyg/exec";
  const VIEWER_PAGE = 'pdf-viewer.html';

  const $ = (id) => document.getElementById(id);

  const els = {
    dateStart: $('filter-date-start'),
    dateEnd: $('filter-date-end'),
    gen: $('filter-generation'),
    dept: $('filter-department'),
    q: $('filter-q'),
    reset: $('btn-reset'),
    list: $('project-list'),
    count: $('results-count'),
    empty: $('empty'),
  };

  let allNotices = [];
  let releaseCfg = null; 

  function norm(v) {
    return (v ?? '').toString().trim();
  }

  function isPdfFile(name) {
    return /\.pdf$/i.test(norm(name));
  }

  function coerceNotices(json) {
    if (json && Array.isArray(json.notices)) {
      return json.notices.map(n => {
        if (n.date) {
          const d = new Date(n.date);
          if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            n.date = `${yyyy}-${mm}-${dd}`;
          }
        }
        return n;
      });
    }
    return [];
  }

  function byNumberPrefix(a, b) {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    const aIsNum = !Number.isNaN(na);
    const bIsNum = !Number.isNaN(nb);
    if (aIsNum && bIsNum) return na - nb;
    if (aIsNum && !bIsNum) return -1;
    if (!aIsNum && bIsNum) return 1;
    return a.localeCompare(b, 'ko');
  }

  function unique(values) {
    return Array.from(new Set(values.filter((v) => norm(v) !== '').map((v) => norm(v))));
  }

  function fillSelect(selectEl, values, allLabel = '전체') {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = allLabel;
    selectEl.appendChild(optAll);

    values.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
  }

  function buildFilters(notices) {
    const gens = unique(notices.map((n) => n.generation)).sort(byNumberPrefix);
    const depts = unique(notices.map((n) => n.department)).sort((a, b) => a.localeCompare(b, 'ko'));

    fillSelect(els.gen, gens, '전체');
    fillSelect(els.dept, depts, '전체');
  }

  function noticeMeta(n) {
    const parts = [];
    if (norm(n.date)) {
      const dateParts = norm(n.date).split('-');
      if (dateParts.length === 3) {
        parts.push(`${dateParts[0]}년 ${dateParts[1]}월 ${dateParts[2]}일`);
      } else {
        parts.push(norm(n.date));
      }
    }
    if (norm(n.generation)) parts.push(norm(n.generation));
    if (norm(n.department)) parts.push(norm(n.department));
    return parts.join(' · ');
  }

  function localPdfUrl(file) {
    const f = norm(file);
    return encodeURI(`pdfs/${f}`); // 필요하다면 notices 폴더로 변경 가능
  }

  function parseReleaseCfg(json) {
    const rel = json?.release;
    if (!rel) return null;

    const owner = norm(rel.owner);
    const repo = norm(rel.repo);
    // 공지사항 페이지에서는 기본 태그를 무시하고 'NOTICEs'로 고정
    const tag = "NOTICEs";
    const useLatest = !!(rel.useLatest ?? rel.use_latest);
    const proxy = norm(rel.proxy);

    if (!owner || !repo) return null;

    return { owner, repo, tag, useLatest, proxy };
  }

  function releaseDownloadUrl(file) {
    if (!releaseCfg) return null;
    const f = norm(file);
    if (!f) return null;

    if (releaseCfg.useLatest) {
      return `https://github.com/${releaseCfg.owner}/${releaseCfg.repo}/releases/latest/download/${encodeURIComponent(f)}`;
    }

    return `https://github.com/${releaseCfg.owner}/${releaseCfg.repo}/releases/download/${encodeURIComponent(releaseCfg.tag)}/${encodeURIComponent(f)}`;
  }

  function maybeProxyUrl(directUrl) {
    if (!releaseCfg) return null;
    const base = norm(releaseCfg.proxy);
    if (!base) return null;

    if (base.includes('{url}')) {
      return base.replace('{url}', encodeURIComponent(directUrl));
    }
    return base + encodeURIComponent(directUrl);
  }

  function buildViewerUrl({ title, file, srcUrl, directUrl, downloadUrl }) {
    const params = new URLSearchParams();
    if (title) params.set('title', title);
    if (file) params.set('file', file);
    if (srcUrl) params.set('src', srcUrl);      
    if (directUrl) params.set('direct', directUrl); 
    if (downloadUrl) params.set('download', downloadUrl);
    params.set('from', 'notice');
    return `${VIEWER_PAGE}?${params.toString()}`;
  }

  function pdfLinksForNotice(n) {
    const file = norm(n.file);
    const title = norm(n.title) || file || '제목 없음';

    const local = localPdfUrl(file);
    const release = releaseDownloadUrl(file);

    const directUrl = releaseCfg ? release : local;
    const downloadUrl = directUrl;

    const srcUrl = (directUrl && releaseCfg && directUrl.startsWith('https://github.com/'))
      ? (maybeProxyUrl(directUrl) || directUrl)
      : directUrl;

    const previewUrl = buildViewerUrl({ title, file, srcUrl, directUrl, downloadUrl });

    return { previewUrl, downloadUrl, directUrl, srcUrl };
  }

  function render(notices) {
    if (!els.list) return;

    els.list.innerHTML = '';

    if (els.count) els.count.textContent = `${notices.length}개 공지`;
    if (els.empty) els.empty.style.display = notices.length ? 'none' : 'block';

    notices.forEach((n) => {
      const title = norm(n.title) || norm(n.file) || '제목 없음';
      const file = norm(n.file);

      if (!file) return;

      const { previewUrl, downloadUrl } = pdfLinksForNotice(n);

      const li = document.createElement('li');
      li.className = 'project-card';
      if (n.important) li.classList.add('is-important');

      const main = document.createElement('div');
      main.className = 'project-main';

      const aTitle = document.createElement('a');
      aTitle.className = 'project-title';
      aTitle.href = previewUrl;    
      aTitle.target = '_blank';
      aTitle.rel = 'noopener';
      
      // 중요 공지면 배지 추가
      if (n.important) {
        aTitle.innerHTML = `<span class="badge-important">[중요]</span>${title}`;
      } else {
        aTitle.textContent = title;
      }

      const meta = document.createElement('div');
      meta.className = 'project-meta';
      meta.textContent = noticeMeta(n);

      main.appendChild(aTitle);
      if (meta.textContent) main.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'project-actions';

      const btnViewer = document.createElement('a');
      btnViewer.className = 'btn'; 
      btnViewer.href = previewUrl; 
      btnViewer.target = '_blank';
      btnViewer.rel = 'noopener';
      btnViewer.textContent = '뷰어로 보기';

      const btnDownload = document.createElement('a');
      btnDownload.className = 'btn btn-download';
      btnDownload.href = downloadUrl; 
      btnDownload.target = '_blank';
      btnDownload.rel = 'noopener';
      btnDownload.setAttribute('download', '');
      btnDownload.textContent = '다운로드';

      actions.appendChild(btnViewer);
      actions.appendChild(btnDownload);

      li.appendChild(main);
      li.appendChild(actions);

      els.list.appendChild(li);
    });
  }

  function applyFilters() {
    const ds = norm(els.dateStart?.value);
    const de = norm(els.dateEnd?.value);
    const g = norm(els.gen?.value);
    const d = norm(els.dept?.value);
    const q = norm(els.q?.value).toLowerCase();

    const filtered = allNotices.filter((n) => {
      // 중요 공지는 어떠한 필터 조건에도 불구하고 무조건 노출
      if (n.important) return true;

      if (ds && norm(n.date) < ds) return false;
      if (de && norm(n.date) > de) return false;
      if (g && norm(n.generation) !== g) return false;
      if (d && norm(n.department) !== d) return false;

      if (q) {
        const t = norm(n.title).toLowerCase();
        if (!t.includes(q)) return false;
      }
      return true;
    });

    // 정렬 규칙: 1순위 (중요 공지), 2순위 (날짜 최신순)
    filtered.sort((a, b) => {
      if (a.important && !b.important) return -1;
      if (!a.important && b.important) return 1;
      // 둘 다 중요하거나, 둘 다 일반인 경우 날짜 내림차순(최신순) 정렬
      return norm(b.date).localeCompare(norm(a.date));
    });

    render(filtered);
  }

  function attachEvents() {
    [els.dateStart, els.dateEnd, els.gen, els.dept].forEach((el) => {
      if (!el) return;
      el.addEventListener('change', applyFilters);
    });

    if (els.q) els.q.addEventListener('input', applyFilters);

    if (els.reset) {
      els.reset.addEventListener('click', () => {
        if (els.dateStart) els.dateStart.value = '';
        if (els.dateEnd) els.dateEnd.value = '';
        if (els.gen) els.gen.value = '';
        if (els.dept) els.dept.value = '';
        if (els.q) els.q.value = '';
        applyFilters();
      });
    }
  }

  async function init() {
    if (els.count) els.count.textContent = '로딩 중…';

    try {
      const res = await fetch(API_URL, { redirect: 'follow' });
      if (!res.ok) throw new Error(`Google Apps Script fetch failed: ${res.status}`);
      const json = await res.json();

      releaseCfg = parseReleaseCfg(json);

      const notices = coerceNotices(json)
        .filter((n) => n && typeof n === 'object')
        .filter((n) => norm(n.file) && isPdfFile(n.file));

      allNotices = notices;

      buildFilters(allNotices);
      attachEvents();
      applyFilters();
    } catch (err) {
      console.error(err);
      if (els.count) els.count.textContent = '데이터를 불러오지 못했습니다';
      if (els.empty) {
        els.empty.style.display = 'block';
        els.empty.innerHTML =
          '데이터 목록을 불러오지 못했습니다.<br />' +
          '스프레드시트의 배포 URL이나 네트워크 상태를 확인해 주세요.';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
