// PAINS 활동 아카이브 (GitHub Pages용)
// - 구글 앱스 스크립트 API에서 프로젝트 목록을 불러와 필터/검색 후 렌더링합니다.

(() => {
  'use strict';

  // 구글 앱스 스크립트 웹 앱 URL
  const API_URL = "https://script.google.com/macros/s/AKfycbwuNda5HuzwNhp7ecL0BTMt4eCgE8z9y1F8_kDR-ZaEp72mYngLp0DQ4ibWcKDEZyg/exec";
  const VIEWER_PAGE = 'pdf-viewer.html';

  const $ = (id) => document.getElementById(id);

  const els = {
    year: $('filter-year'),
    gen: $('filter-generation'),
    period: $('filter-period'),
    sport: $('filter-sport'),
    q: $('filter-q'),
    reset: $('btn-reset'),
    list: $('project-list'),
    count: $('results-count'),
    empty: $('empty'),
  };

  let allProjects = [];
  let releaseCfg = null; 

  function norm(v) {
    return (v ?? '').toString().trim();
  }

  function isPdfFile(name) {
    return /\.pdf$/i.test(norm(name));
  }

  function coerceProjects(json) {
    if (Array.isArray(json)) {
      if (json.every((x) => typeof x === 'string')) {
        return json
          .filter(isPdfFile)
          .map((file) => ({
            title: file.replace(/\.pdf$/i, ''),
            file,
          }));
      }
      return json;
    }
    if (json && Array.isArray(json.projects)) return json.projects;
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

  function buildFilters(projects) {
    const years = unique(projects.map((p) => p.year))
      .sort((a, b) => {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        const aIsNum = !Number.isNaN(na);
        const bIsNum = !Number.isNaN(nb);
        if (aIsNum && bIsNum) return nb - na; 
        return b.localeCompare(a, 'ko');
      });

    const gens = unique(projects.map((p) => p.generation)).sort(byNumberPrefix);
    const periods = unique(projects.map((p) => p.period)).sort((a, b) => a.localeCompare(b, 'ko'));
    const sports = unique(projects.map((p) => p.sport)).sort((a, b) => a.localeCompare(b, 'ko'));

    fillSelect(els.year, years, '전체');
    fillSelect(els.gen, gens, '전체');
    fillSelect(els.period, periods, '전체');
    fillSelect(els.sport, sports, '전체');
  }

  function projectMeta(p) {
    const parts = [];
    if (norm(p.year)) parts.push(norm(p.year));
    if (norm(p.generation)) parts.push(norm(p.generation));
    if (norm(p.period)) parts.push(norm(p.period));
    if (norm(p.sport)) parts.push(norm(p.sport));
    return parts.join(' · ');
  }

  function localPdfUrl(file) {
    const f = norm(file);
    return encodeURI(`pdfs/${f}`);
  }

  function parseReleaseCfg(json) {
    const rel = json?.release;
    if (!rel) return null;

    const owner = norm(rel.owner);
    const repo = norm(rel.repo);
    const tag = norm(rel.tag);
    const useLatest = !!(rel.useLatest ?? rel.use_latest);
    const proxy = norm(rel.proxy);

    if (!owner || !repo) return null;
    if (!useLatest && !tag) return null;

    return { owner, repo, tag, useLatest, proxy };
  }

  function releaseDownloadUrl(file, projectTag) {
    if (!releaseCfg) return null;
    const f = norm(file);
    if (!f) return null;

    if (releaseCfg.useLatest) {
      return `https://github.com/${releaseCfg.owner}/${releaseCfg.repo}/releases/latest/download/${encodeURIComponent(f)}`;
    }

    const tag = norm(projectTag) || releaseCfg.tag;
    return `https://github.com/${releaseCfg.owner}/${releaseCfg.repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(f)}`;
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
    return `${VIEWER_PAGE}?${params.toString()}`;
  }

  function pdfLinksForProject(p) {
    const file = norm(p.file);
    const title = norm(p.title) || file || '제목 없음';

    const origin = norm(p.origin).toLowerCase();
    const local = localPdfUrl(file);
    const release = releaseDownloadUrl(file, p.tag);

    const directUrl = (origin === 'local') ? local : (origin === 'release' ? release : (releaseCfg ? release : local));
    const downloadUrl = directUrl;

    const srcUrl = (directUrl && releaseCfg && directUrl.startsWith('https://github.com/'))
      ? (maybeProxyUrl(directUrl) || directUrl)
      : directUrl;

    const previewUrl = buildViewerUrl({ title, file, srcUrl, directUrl, downloadUrl });

    return { previewUrl, downloadUrl, directUrl, srcUrl };
  }

  function render(projects) {
    if (!els.list) return;

    els.list.innerHTML = '';

    if (els.count) els.count.textContent = `${projects.length}개 프로젝트`;
    if (els.empty) els.empty.style.display = projects.length ? 'none' : 'block';

    projects.forEach((p) => {
      const title = norm(p.title) || norm(p.file) || '제목 없음';
      const file = norm(p.file);

      if (!file) return;

      const { previewUrl, downloadUrl } = pdfLinksForProject(p);

      const li = document.createElement('li');
      li.className = 'project-card';

      const main = document.createElement('div');
      main.className = 'project-main';

      const aTitle = document.createElement('a');
      aTitle.className = 'project-title';
      aTitle.href = previewUrl;    
      aTitle.target = '_blank';
      aTitle.rel = 'noopener';
      aTitle.textContent = title;

      const meta = document.createElement('div');
      meta.className = 'project-meta';
      meta.textContent = projectMeta(p);

      main.appendChild(aTitle);
      if (meta.textContent) main.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'project-actions';

      const btnDownload = document.createElement('a');
      btnDownload.className = 'btn btn-download';
      btnDownload.href = downloadUrl; 
      btnDownload.target = '_blank';
      btnDownload.rel = 'noopener';
      btnDownload.setAttribute('download', '');
      btnDownload.textContent = '다운로드';

      actions.appendChild(btnDownload);

      li.appendChild(main);
      li.appendChild(actions);

      els.list.appendChild(li);
    });
  }

  function applyFilters() {
    const y = norm(els.year?.value);
    const g = norm(els.gen?.value);
    const p = norm(els.period?.value);
    const s = norm(els.sport?.value);
    const q = norm(els.q?.value).toLowerCase();

    const filtered = allProjects.filter((proj) => {
      if (y && norm(proj.year) !== y) return false;
      if (g && norm(proj.generation) !== g) return false;
      if (p && norm(proj.period) !== p) return false;
      if (s && norm(proj.sport) !== s) return false;

      if (q) {
        const t = norm(proj.title).toLowerCase();
        if (!t.includes(q)) return false;
      }
      return true;
    });

    render(filtered);
  }

  function attachEvents() {
    [els.year, els.gen, els.period, els.sport].forEach((sel) => {
      if (!sel) return;
      sel.addEventListener('change', applyFilters);
    });

    if (els.q) els.q.addEventListener('input', applyFilters);

    if (els.reset) {
      els.reset.addEventListener('click', () => {
        if (els.year) els.year.value = '';
        if (els.gen) els.gen.value = '';
        if (els.period) els.period.value = '';
        if (els.sport) els.sport.value = '';
        if (els.q) els.q.value = '';
        applyFilters();
      });
    }
  }

  async function init() {
    if (els.count) els.count.textContent = '로딩 중…';

    try {
      // CORS 에러 방지를 위해 구글 앱스 스크립트에 안전한 단순 fetch 요청 전송
      const res = await fetch(API_URL, { redirect: 'follow' });
      if (!res.ok) throw new Error(`Google Apps Script fetch failed: ${res.status}`);
      const json = await res.json();

      releaseCfg = parseReleaseCfg(json);

      const projects = coerceProjects(json)
        .filter((p) => p && typeof p === 'object')
        .filter((p) => norm(p.file) && isPdfFile(p.file));

      allProjects = projects;

      buildFilters(allProjects);
      attachEvents();
      applyFilters();
    } catch (err) {
      console.error(err);
      if (els.count) els.count.textContent = '데이터를 불러오지 못했습니다';
      if (els.empty) {
        els.empty.style.display = 'block';
        // 에러 문구를 API 환경에 맞게 수정
        els.empty.innerHTML =
          '데이터 목록을 불러오지 못했습니다.<br />' +
          '스프레드시트의 배포 URL이나 네트워크 상태를 확인해 주세요.';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
