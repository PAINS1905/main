// PAINS 활동 아카이브 (GitHub Pages용)
// - pdfs/manifest.json에서 프로젝트 목록을 불러와 필터/검색 후 렌더링합니다.
// - PDF 파일은 /pdfs 폴더에 두고, manifest의 file 필드에 파일명을 적어주세요.

(() => {
  'use strict';

  const MANIFEST_URL = 'pdfs/manifest.json';

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

  function norm(v) {
    return (v ?? '').toString().trim();
  }

  function isPdfFile(name) {
    return /\.pdf$/i.test(norm(name));
  }

  // "pdfs/파일명.pdf" 형태를 안전하게 URL로 만들기
  function pdfHref(file) {
    const f = norm(file);
    // encodeURI는 공백/한글 등을 인코딩하면서 '/'는 보존합니다.
    return encodeURI(`pdfs/${f}`);
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

      const li = document.createElement('li');
      li.className = 'project-card';

      const main = document.createElement('div');
      main.className = 'project-main';

      const aTitle = document.createElement('a');
      aTitle.className = 'project-title';
      aTitle.href = pdfHref(file);
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
      btnDownload.href = pdfHref(file);
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
