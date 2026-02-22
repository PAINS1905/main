// PAINS 활동 아카이브 (GitHub Pages용)
// - pdfs/manifest.json에서 프로젝트 목록을 불러와 필터/검색 후 렌더링합니다.
// - PDF는 2가지 방식 모두 지원합니다.
//   (1) /pdfs 폴더에 직접 업로드(기존 방식)
//   (2) GitHub Releases(Assets)에 업로드(권장: Pages 1GB 제한 회피)
// - 제목 클릭: pdf.js 뷰어(pdf-viewer.html)로 미리보기
// - 다운로드: 원본 PDF 링크로 다운로드/열기

(() => {
  'use strict';

  const MANIFEST_URL = 'pdfs/manifest.json';
  const VIEWER_PAGE = 'pdf-viewer.html';

  const $ = (id) => document.getElementById(id);

  const els = {
    year: $('filter-year'),
    gen: $('filter-generation'),
    period: $('filter-period'),
    sport: $('filter-sport'),
    q: $('filter-q'),
    sort: $('sort-options'), // 정렬 엘리먼트 추가
    reset: $('btn-reset'),
    list: $('project-list'),
    count: $('results-count'),
    empty: $('empty'),
  };

  let allProjects = [];
  let releaseCfg = null; // { owner, repo, tag, useLatest, proxy }

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

  // 다중 선택 박스에는 '전체' 옵션 생략 (아무것도 선택 안 함 = 전체)
  function fillSelect(selectEl, values) {
    if (!selectEl) return;
    selectEl.innerHTML = '';

    values.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
  }

  // select[multiple]에서 선택된 값들을 배열로 반환
  function getSelectedValues(selectEl) {
    if (!selectEl) return [];
    return Array.from(selectEl.selectedOptions)
      .map(opt => norm(opt.value))
      .filter(v => v !== '');
  }

  function buildFilters(projects) {
    const years = unique(projects.map((p) => p.year))
      .sort((a, b) => {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        const aIsNum = !Number.isNaN(na);
        const bIsNum = !Number.isNaN(nb);
        if (aIsNum && bIsNum) return nb - na; // 연도는 내림차순
        return b.localeCompare(a, 'ko');
      });

    const gens = unique(projects.map((p) => p.generation)).sort(byNumberPrefix);
    const periods = unique(projects.map((p) => p.period)).sort((a, b) => a.localeCompare(b, 'ko'));
    const sports = unique(projects.map((p) => p.sport)).sort((a, b) => a.localeCompare(b, 'ko'));

    fillSelect(els.year, years);
    fillSelect(els.gen, gens);
    fillSelect(els.period, periods);
    fillSelect(els.sport, sports);
  }

  function projectMeta(p) {
    const parts = [];
    if (norm(p.year)) parts.push(norm(p.year));
    if (norm(p.generation)) parts.push(norm(p.generation));
    if (norm(p.period)) parts.push(norm(p.period));
    if (norm(p.sport)) parts.push(norm(p.sport));
    return parts.join(' · ');
  }

  // ---------------------------
  // PDF 링크 생성 (local / release)
  // ---------------------------

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

  // ---------------------------
  // 렌더링
  // ---------------------------

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
    const selectedYears = getSelectedValues(els.year);
    const selectedGens = getSelectedValues(els.gen);
    const selectedPeriods = getSelectedValues(els.period);
    const selectedSports = getSelectedValues(els.sport);
    const q = norm(els.q?.value).toLowerCase();
    const sortVal = norm(els.sort?.value) || 'none';

    // 1. 필터링
    let filtered = allProjects.filter((proj) => {
      if (selectedYears.length > 0 && !selectedYears.includes(norm(proj.year))) return false;
      if (selectedGens.length > 0 && !selectedGens.includes(norm(proj.generation))) return false;
      if (selectedPeriods.length > 0 && !selectedPeriods.includes(norm(proj.period))) return false;
      if (selectedSports.length > 0 && !selectedSports.includes(norm(proj.sport))) return false;

      if (q) {
        const t = norm(proj.title).toLowerCase();
        if (!t.includes(q)) return false;
      }
      return true;
    });

    // 2. 정렬
    filtered.sort((a, b) => {
      const titleA = norm(a.title) || norm(a.file);
      const titleB = norm(b.title) || norm(b.file);
      const genA = norm(a.generation);
      const genB = norm(b.generation);

      if (sortVal === 'name_asc') {
        return titleA.localeCompare(titleB, 'ko');
      } else if (sortVal === 'name_desc') {
        return titleB.localeCompare(titleA, 'ko');
      } else if (sortVal === 'gen_asc') {
        return byNumberPrefix(genA, genB);
      } else if (sortVal === 'gen_desc') {
        // 내림차순을 위해 b와 a의 순서를 바꾸어 비교
        return byNumberPrefix(genB, genA);
      }
      return 0; // 'none' 이면 기본 순서 유지
    });

    // 3. 렌더링
    render(filtered);
  }

  function attachEvents() {
    [els.year, els.gen, els.period, els.sport].forEach((sel) => {
      if (!sel) return;
      sel.addEventListener('change', applyFilters);
    });

    if (els.q) els.q.addEventListener('input', applyFilters);
    if (els.sort) els.sort.addEventListener('change', applyFilters);

    if (els.reset) {
      els.reset.addEventListener('click', () => {
        // 다중 선택 박스들의 선택 해제
        [els.year, els.gen, els.period, els.sport].forEach((sel) => {
          if (sel) {
            Array.from(sel.options).forEach(opt => opt.selected = false);
          }
        });
        if (els.q) els.q.value = '';
        if (els.sort) els.sort.value = 'none';
        applyFilters();
      });
    }
  }

  async function init() {
    if (els.count) els.count.textContent = '로딩 중…';

    try {
      const res = await fetch(`${MANIFEST_URL}?v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
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
      if (els.count) els.count.textContent = '목록을 불러오지 못했습니다';
      if (els.empty) {
        els.empty.style.display = 'block';
        els.empty.innerHTML =
          '프로젝트 목록을 불러오지 못했습니다.<br />' +
          'pdfs/manifest.json 경로와 JSON 형식을 확인해 주세요.';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
