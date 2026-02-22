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
      // ["a.pdf", "b.pdf"] 형태도 허용
      if (json.every((x) => typeof x === 'string')) {
        return json
          .filter(isPdfFile)
          .map((file) => ({
            title: file.replace(/\.pdf$/i, ''),
            file,
          }));
      }
      // [{...}, {...}] 형태
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
        if (aIsNum && bIsNum) return nb - na; // 연도는 내림차순
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

  // ---------------------------
  // PDF 링크 생성 (local / release)
  // ---------------------------

  // "pdfs/파일명.pdf" 형태를 안전하게 URL로 만들기
  function localPdfUrl(file) {
    const f = norm(file);
    // encodeURI는 공백/한글 등을 인코딩하면서 '/'는 보존합니다.
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
      // https://github.com/<owner>/<repo>/releases/latest/download/<file>
      return `https://github.com/${releaseCfg.owner}/${releaseCfg.repo}/releases/latest/download/${encodeURIComponent(f)}`;
    }

    const tag = norm(projectTag) || releaseCfg.tag;
    return `https://github.com/${releaseCfg.owner}/${releaseCfg.repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(f)}`;
  }

  // pdf.js 뷰어에서 사용할 "프록시 URL" (선택)
  // - release asset은 CORS 헤더가 없어 pdf.js가 직접 읽기 어려운 경우가 많습니다.
  // - proxy를 설정하면: proxy + encodeURIComponent(releaseUrl) 로 우회합니다.
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
    if (srcUrl) params.set('src', srcUrl);       // pdf.js가 로드할 URL(프록시 포함 가능)
    if (directUrl) params.set('direct', directUrl); // 원본 URL(열기 버튼용)
    if (downloadUrl) params.set('download', downloadUrl);
    return `${VIEWER_PAGE}?${params.toString()}`;
  }

  function pdfLinksForProject(p) {
    const file = norm(p.file);
    const title = norm(p.title) || file || '제목 없음';

    // 프로젝트 단위로 local/release 강제하고 싶으면 origin 필드를 쓸 수 있게 해둠
    // - origin: "local" | "release"
    const origin = norm(p.origin).toLowerCase();

    const local = localPdfUrl(file);
    const release = releaseDownloadUrl(file, p.tag);

    const directUrl = (origin === 'local') ? local : (origin === 'release' ? release : (releaseCfg ? release : local));
    const downloadUrl = directUrl;

    // pdf.js가 읽을 URL: (릴리즈면 proxy가 있으면 proxy 우선)
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

      // file이 없으면 렌더링 제외
      if (!file) return;

      const { previewUrl, downloadUrl } = pdfLinksForProject(p);

      const li = document.createElement('li');
      li.className = 'project-card';

      const main = document.createElement('div');
      main.className = 'project-main';

      const aTitle = document.createElement('a');
      aTitle.className = 'project-title';
      aTitle.href = previewUrl;    // pdf.js 뷰어
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
      btnDownload.href = downloadUrl; // 원본 PDF
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
      // 캐시 때문에 갱신이 늦게 보이는 걸 방지하기 위해 v 파라미터를 붙입니다.
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
