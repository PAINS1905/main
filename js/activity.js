/* activity.js - 활동(프로젝트 PDF) 목록/필터 */

(() => {
  const DATA_URL = `data/projects.json?v=${Date.now()}`;

  const elYear = document.getElementById('filter-year');
  const elGen = document.getElementById('filter-generation');
  const elPeriod = document.getElementById('filter-period');
  const elSport = document.getElementById('filter-sport');
  const elQ = document.getElementById('filter-q');
  const btnReset = document.getElementById('btn-reset');

  const elCount = document.getElementById('results-count');
  const elList = document.getElementById('project-list');
  const elEmpty = document.getElementById('empty');

  /** @type {Array<any>} */
  let projects = [];

  const PERIOD_LABEL = {
    all: '전체',
    semester: '학기 중',
    vacation: '방학 중'
  };

  function normalize(v) {
    return (v ?? '').toString().trim().toLowerCase();
  }

  function option(label, value) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    return o;
  }

  function setOptions(selectEl, items, allLabel = '전체') {
    selectEl.innerHTML = '';
    selectEl.appendChild(option(allLabel, 'all'));
    for (const it of items) {
      selectEl.appendChild(option(it.label, it.value));
    }
  }

  function getState() {
    return {
      year: elYear.value,
      generation: elGen.value,
      period: elPeriod.value,
      sport: elSport.value,
      q: elQ.value
    };
  }

  function isFiltered(state) {
    return (
      state.year !== 'all' ||
      state.generation !== 'all' ||
      state.period !== 'all' ||
      state.sport !== 'all' ||
      normalize(state.q) !== ''
    );
  }

  function matches(p, state) {
    if (state.year !== 'all' && String(p.year) !== state.year) return false;
    if (state.generation !== 'all' && String(p.generation) !== state.generation) return false;
    if (state.period !== 'all' && normalize(p.period) !== state.period) return false;
    if (state.sport !== 'all' && normalize(p.sport) !== state.sport) return false;

    const q = normalize(state.q);
    if (q) {
      const hay = normalize([p.title, p.sport, p.tags?.join?.(' '), p.summary].filter(Boolean).join(' '));
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function sortProjects(a, b) {
    // 최근 연도/기수 우선, 그 다음 제목
    const ya = Number(a.year) || 0;
    const yb = Number(b.year) || 0;
    if (yb !== ya) return yb - ya;

    const ga = Number(a.generation) || 0;
    const gb = Number(b.generation) || 0;
    if (gb !== ga) return gb - ga;

    return (a.title || '').localeCompare((b.title || ''), 'ko');
  }

  function render() {
    const state = getState();
    const filtered = projects.filter(p => matches(p, state)).sort(sortProjects);

    // "필터 적용 시 제목+다운" 모드
    if (isFiltered(state)) {
      elList.classList.add('compact');
    } else {
      elList.classList.remove('compact');
    }

    elCount.textContent = `총 ${filtered.length}개`;

    elList.innerHTML = '';
    elEmpty.style.display = filtered.length === 0 ? 'block' : 'none';

    for (const p of filtered) {
      const li = document.createElement('li');
      li.className = 'project-card';

      const main = document.createElement('div');
      main.className = 'project-main';

      const titleA = document.createElement('a');
      titleA.className = 'project-title';
      titleA.textContent = p.title || '(제목 없음)';
      titleA.href = p.previewUrl || p.pdfUrl || '#';
      titleA.target = '_blank';
      titleA.rel = 'noopener';

      const meta = document.createElement('div');
      meta.className = 'project-meta';
      meta.textContent = `${p.year ?? '-'}년 · ${p.generation ?? '-'}기 · ${PERIOD_LABEL[normalize(p.period)] || '기타'} · ${p.sport ?? '-'}`;

      main.appendChild(titleA);
      main.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'project-actions';

      const dl = document.createElement('a');
      dl.className = 'btn btn-download';
      dl.textContent = '다운로드';
      dl.href = p.downloadUrl || p.pdfUrl || '#';

      // 같은-origin이면 download 속성이 잘 먹습니다.
      // (다른 도메인일 경우 브라우저 정책에 따라 무시될 수 있음)
      if (p.fileName) dl.setAttribute('download', p.fileName);
      else dl.setAttribute('download', '');

      actions.appendChild(dl);

      li.appendChild(main);
      li.appendChild(actions);

      elList.appendChild(li);
    }
  }

  function resetFilters() {
    elYear.value = 'all';
    elGen.value = 'all';
    elPeriod.value = 'all';
    elSport.value = 'all';
    elQ.value = '';
    render();
  }

  function initFiltersFromData(data) {
    // 연도/기수/종목은 데이터에서 뽑아 자동 생성
    const years = Array.from(new Set(data.map(p => Number(p.year)).filter(Boolean))).sort((a, b) => b - a);
    const gens = Array.from(new Set(data.map(p => Number(p.generation)).filter(Boolean))).sort((a, b) => a - b);
    const sports = Array.from(new Set(data.map(p => normalize(p.sport)).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ko'));

    setOptions(elYear, years.map(y => ({ label: `${y}년`, value: String(y) })), '전체');
    setOptions(elGen, gens.map(g => ({ label: `${g}기`, value: String(g) })), '전체');

    setOptions(
      elPeriod,
      [
        { label: '학기 중', value: 'semester' },
        { label: '방학 중', value: 'vacation' }
      ],
      '전체'
    );

    setOptions(elSport, sports.map(s => ({ label: s, value: s })), '전체');
  }

  async function bootstrap() {
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`데이터 로드 실패: ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('projects.json 형식이 배열(Array)이 아닙니다.');

      projects = data.map(p => ({
        ...p,
        year: p.year ?? null,
        generation: p.generation ?? null,
        period: normalize(p.period) || 'semester',
        sport: p.sport ?? '',
        title: p.title ?? '',
        pdfUrl: p.pdfUrl ?? '',
        // 선택값
        downloadUrl: p.downloadUrl ?? '',
        previewUrl: p.previewUrl ?? '',
        fileName: p.fileName ?? ''
      }));

      initFiltersFromData(projects);

      // 이벤트
      [elYear, elGen, elPeriod, elSport].forEach(el => el.addEventListener('change', render));
      elQ.addEventListener('input', render);
      btnReset.addEventListener('click', resetFilters);

      render();
    } catch (err) {
      console.error(err);
      elCount.textContent = '데이터를 불러오지 못했습니다.';
      elEmpty.style.display = 'block';
      elEmpty.innerHTML = 'projects.json을 불러오지 못했습니다.<br/>콘솔(개발자 도구)을 확인해 주세요.';
    }
  }

  // 실행
  bootstrap();
})();
