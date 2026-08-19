/**
 * KICEditor - Application Engine (Seol-Maji Compact Spacing & Alignment Engine V9)
 * Updated: PDF/print stability, exact A4 page sizing, serif body font enforcement,
 *         choices layout tweaks, zoom implementation and offscreen render fixes.
 */

// Initial Sample Data (V9 Architecture)
const DEFAULT_DOCUMENTS = [
  {
    id: 'doc-n-001',
    title: 'Pray N',
    topBrand: 'Pray N',
    topRightBadge: 'Label 1: 다항함수 추론',
    themeColor: '#10b981', // Emerald Teal Accent matching user's image
    diffColor: '#10b981',
    description: '수학 II 심화 킬러 및 준킬러 문항 모음집입니다.',
    updatedAt: Date.now() - 60000 * 5,
    questions: [
      {
        id: 'q-001',
        num: '1',
        title: '다항함수 추론',
        difficulty: 'HD',
        labelInfo: 'Label 1: 다항함수 추론',
        answer: '⑤ 7',
        showRecord: true,
        tagColumn: true,
        tagRemark: true,
        tagStar: false,
        problemBlocks: [
          {
            id: 'pb-101',
            type: 'statement',
            content: '다음은 다항함수 \\( f(x) \\)에 대한 조건이다.'
          },
          {
            id: 'pb-102',
            type: 'choices',
            layout: '5',
            items: ['', '', '', '', '']
          }
        ],
        explanationBlocks: [
          {
            id: 'eb-101',
            type: 'phase',
            title: 'PHASE 1  피적분함수의 차수 비교 및 정적분 식 정리하기',
            content: '주어진 두 정적분 식의 차를 하나의 정적분 식 \\( \\int_{-1}^{1} x^n(1-x)(x+1)^2 dx \\)로 통합하여 분석합니다.'
          },
          {
            id: 'eb-102',
            type: 'column',
            title: 'Column  우함수와 기함수의 정적분 성질',
            content: '구간 \\( [-1, 1] \\)에서의 정적분은 기함수(홀수 차수) 성분을 0으로 소거하고 우함수(짝수 차수) 성분만 2배로 계산하면 연산 실수를 획기적으로 줄일 수 있습니다.'
          }
        ]
      }
    ]
  }
];

class AppState {
  constructor() {
    this.documents = this.loadFromStorage();
    this.currentDocId = null;
    this.currentQId = null;
    this.activeTab = 'problem'; // 'problem' or 'explanation'
    this.zoom = 1.0;
    this.columnMode = 2;
    this.draggedQIndex = null;
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('SEOL_MAJI_ARCHIVE_V9');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { console.warn('Storage parse exception:', e); }
    return DEFAULT_DOCUMENTS;
  }

  saveToStorage() {
    try {
      localStorage.setItem('SEOL_MAJI_ARCHIVE_V9', JSON.stringify(this.documents));
      const saveText = document.getElementById('saveStatusText');
      if (saveText) {
        saveText.textContent = '저장됨';
        setTimeout(() => { saveText.textContent = '저장'; }, 1500);
      }
    } catch (e) { console.error('Save to storage exception:', e); }
  }

  get currentDoc() {
    if (!this.currentDocId) return null;
    return this.documents.find(d => d.id === this.currentDocId) || null;
  }

  get currentQuestion() {
    const doc = this.currentDoc;
    if (!doc || !doc.questions || doc.questions.length === 0) return null;
    return doc.questions.find(q => q.id === this.currentQId) || doc.questions[0] || null;
  }
}

const state = new AppState();

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  renderDashboard();
});

function initUI() {
  document.getElementById('btnGoDashboard').addEventListener('click', (e) => { e.preventDefault(); showDashboard(); });
  document.getElementById('btnBackToDashboard').addEventListener('click', (e) => { e.preventDefault(); showDashboard(); });
  document.getElementById('btnNewDoc').addEventListener('click', (e) => { e.preventDefault(); handleCreateNewDoc(); });

  const searchInput = document.getElementById('searchDocInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => renderDashboard(e.target.value.trim()));
  }

  const docTitleInput = document.getElementById('docTitleInput');
  if (docTitleInput) {
    docTitleInput.addEventListener('input', (e) => {
      if (state.currentDoc) {
        state.currentDoc.title = e.target.value;
        state.currentDoc.updatedAt = Date.now();
        state.saveToStorage();
        renderPaperPreview();
      }
    });
  }

  const docTopBrand = document.getElementById('docTopBrand');
  if (docTopBrand) {
    docTopBrand.addEventListener('input', (e) => {
      if (state.currentDoc) {
        state.currentDoc.topBrand = e.target.value;
        state.saveToStorage();
        renderPaperPreview();
      }
    });
  }

  const docTopRightBadge = document.getElementById('docTopRightBadge');
  if (docTopRightBadge) {
    docTopRightBadge.addEventListener('input', (e) => {
      if (state.currentDoc) {
        state.currentDoc.topRightBadge = e.target.value;
        state.saveToStorage();
        renderPaperPreview();
      }
    });
  }

  // Main Theme Color Swatches & Picker
  document.querySelectorAll('.color-swatch-main').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const color = swatch.getAttribute('data-color');
      setMainThemeColor(color);
    });
  });

  const mainPicker = document.getElementById('docThemeColorPicker');
  if (mainPicker) {
    mainPicker.addEventListener('input', (e) => setMainThemeColor(e.target.value));
    mainPicker.addEventListener('change', (e) => setMainThemeColor(e.target.value));
  }

  // Difficulty Badge Color Swatches & Picker
  document.querySelectorAll('.color-swatch-diff').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const color = swatch.getAttribute('data-color');
      setDifficultyColor(color);
    });
  });

  const diffPicker = document.getElementById('docDiffColorPicker');
  if (diffPicker) {
    diffPicker.addEventListener('input', (e) => setDifficultyColor(e.target.value));
    diffPicker.addEventListener('change', (e) => setDifficultyColor(e.target.value));
  }

  // Tab Switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeTab = btn.getAttribute('data-tab');

      const isProblemTab = state.activeTab === 'problem';
      document.getElementById('previewModeTitle').textContent = 
        isProblemTab ? '문제지 속지 미리보기' : '해설지 속지 미리보기';
      document.getElementById('blockSectionTitle').textContent = 
        isProblemTab ? '문제지 속지 블록 구성' : '해설지 속지 블록 구성';
      document.getElementById('blockSectionHint').textContent = 
        isProblemTab ? '문제지에 출력될 블록을 구성합니다.' : '해설지에 출력될 블록을 구성합니다.';
      document.getElementById('addBlockBtnText').textContent = 
        isProblemTab ? 'add block (문제지 블록 추가)' : 'add block (해설지 블록 추가)';

      renderBlockEditors();
      renderPaperPreview();
    });
  });

  document.getElementById('btnAddQuestion').addEventListener('click', (e) => {
    e.preventDefault();
    handleAddQuestion();
  });

  ['qTitle', 'qDifficulty', 'qLabelInfo', 'qAnswer'].forEach(fieldId => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.addEventListener('input', () => updateQuestionFromForm());
      el.addEventListener('change', () => updateQuestionFromForm());
    }
  });

  ['qShowRecord', 'qTagColumn', 'qTagRemark', 'qTagStar'].forEach(chkId => {
    const el = document.getElementById(chkId);
    if (el) {
      el.addEventListener('change', () => updateQuestionFromForm());
    }
  });

  // Block Menu Dropdown
  const btnBlockMenu = document.getElementById('btnToggleBlockMenu');
  const dropdownBlockMenu = document.getElementById('blockMenuDropdown');

  if (btnBlockMenu && dropdownBlockMenu) {
    btnBlockMenu.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      renderBlockDropdownMenu();
      const isHidden = dropdownBlockMenu.style.display === 'none' || dropdownBlockMenu.style.display === '';
      dropdownBlockMenu.style.display = isHidden ? 'grid' : 'none';
    });

    dropdownBlockMenu.addEventListener('click', (e) => { e.stopPropagation(); });
    document.addEventListener('click', () => { dropdownBlockMenu.style.display = 'none'; });
  }

  // Preview Controls
  document.getElementById('btnToggleColumns').addEventListener('click', (e) => {
    e.preventDefault();
    state.columnMode = state.columnMode === 2 ? 1 : 2;
    document.getElementById('colModeText').textContent = state.columnMode === 2 ? '2단 보기' : '1단 보기';
    renderPaperPreview();
  });

  document.getElementById('btnZoomIn').addEventListener('click', (e) => {
    e.preventDefault();
    if (state.zoom < 1.6) { state.zoom += 0.1; applyZoom(); }
  });

  document.getElementById('btnZoomOut').addEventListener('click', (e) => {
    e.preventDefault();
    if (state.zoom > 0.6) { state.zoom -= 0.1; applyZoom(); }
  });

  document.getElementById('btnExportProblemPDF').addEventListener('click', (e) => { e.preventDefault(); handleExportPDF('problem'); });
  document.getElementById('btnExportExplanationPDF').addEventListener('click', (e) => { e.preventDefault(); handleExportPDF('explanation'); });
  document.getElementById('btnPrint').addEventListener('click', (e) => { e.preventDefault(); handlePrintCurrentView(); });
  document.getElementById('btnSave').addEventListener('click', (e) => { e.preventDefault(); state.saveToStorage(); });

  // set initial zoom UI
  applyZoom();
}

/* ACCENT THEME COLOR CONTROLS */
function setMainThemeColor(colorHex) {
  if (!state.currentDoc) return;
  state.currentDoc.themeColor = colorHex;
  state.saveToStorage();

  document.querySelectorAll('.color-swatch-main').forEach(s => {
    s.classList.toggle('active', s.getAttribute('data-color') === colorHex);
  });
  const picker = document.getElementById('docThemeColorPicker');
  if (picker) picker.value = colorHex;

  renderPaperPreview();
}

function setDifficultyColor(colorHex) {
  if (!state.currentDoc) return;
  state.currentDoc.diffColor = colorHex;
  state.saveToStorage();

  document.querySelectorAll('.color-swatch-diff').forEach(s => {
    s.classList.toggle('active', s.getAttribute('data-color') === colorHex);
  });
  const picker = document.getElementById('docDiffColorPicker');
  if (picker) picker.value = colorHex;

  renderPaperPreview();
}

function applyThemeCSSVariables(targetEl, mainColorHex = '#6b21a8', diffColorHex = '#1e3a8a') {
  if (!targetEl) return;
  const mainDark = adjustColorLuminance(mainColorHex, -0.2);
  const mainLight = adjustColorLuminance(mainColorHex, 0.85);
  const diffDark = adjustColorLuminance(diffColorHex, -0.2);

  targetEl.style.setProperty('--sheet-theme-color', mainColorHex);
  targetEl.style.setProperty('--sheet-theme-dark', mainDark);
  targetEl.style.setProperty('--sheet-theme-light', mainLight);
  targetEl.style.setProperty('--sheet-theme-rgb', hexToRgbTriplet(mainColorHex));
  targetEl.style.setProperty('--sheet-theme-dark-rgb', hexToRgbTriplet(mainDark));

  targetEl.style.setProperty('--sheet-diff-color', diffColorHex);
  targetEl.style.setProperty('--sheet-diff-dark', diffDark);
  targetEl.style.setProperty('--sheet-diff-rgb', hexToRgbTriplet(diffColorHex));
}

function adjustColorLuminance(hex, lum) {
  hex = String(hex).replace(/[^0-9a-f]/gi, '');
  if (hex.length < 6) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  lum = lum || 0;

  let rgb = "#", c, i;
  for (i = 0; i < 3; i++) {
    c = parseInt(hex.substr(i*2, 2), 16);
    c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
    rgb += ("00"+c).substr(c.length);
  }
  return rgb;
}

function hexToRgbTriplet(hex) {
  hex = String(hex || '').replace(/[^0-9a-f]/gi, '');
  if (hex.length < 6) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const parts = [0,1,2].map(i => parseInt(hex.substr(i * 2, 2), 16) || 0);
  return parts.join(', ');
}

function setActionButtonsBusy(isBusy, labelText = '출력 중...') {
  ['btnExportProblemPDF', 'btnExportExplanationPDF', 'btnPrint'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (isBusy) {
      if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = labelText;
    } else {
      btn.disabled = false;
      if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
    }
  });
}

async function waitForRenderAssets(root) {
  if (!root) return;
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (e) { console.warn(e); }
  }

  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));

  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function prepareOutputRoot(root, isExplanationMode) {
  const doc = state.currentDoc;
  if (!root || !doc) return null;
  root.innerHTML = '';
  // ensure the offscreen root is renderable (don't use display:none or visibility:hidden)
  root.style.position = 'fixed';
  root.style.left = '-20000px';
  root.style.top = '0';
  root.style.visibility = 'visible';
  root.style.pointerEvents = 'none';
  root.style.background = '#ffffff';
  applyThemeCSSVariables(root, doc.themeColor || '#10b981', doc.diffColor || '#10b981');

  // render pages
  renderSeolMajiPages(root, doc, isExplanationMode, state.columnMode);

  // Force each page element to A4 size (mm) so html2canvas captures the correct layout
  const pages = Array.from(root.querySelectorAll('.exam-paper-page'));
  pages.forEach(p => {
    p.style.width = '210mm';
    p.style.height = '297mm';
    p.style.boxSizing = 'border-box';
    p.style.background = '#ffffff';
    p.style.color = '#000';
  });

  try {
    renderMathInElement(root, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '\\[', right: '\\]', display: true},
        {left: '$', right: '$', display: false},
        {left: '\\(', right: '\\)', display: false}
      ],
      throwOnError: false
    });
  } catch (e) {
    console.error('KaTeX output render error:', e);
  }

  // wait for fonts & images
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (e) { console.warn('font readiness warning', e); }
  }
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => { img.addEventListener('load', resolve, { once: true}); img.addEventListener('error', resolve, { once: true}); });
  }));

  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return root;
}

/* DASHBOARD & NAVIGATION */
function showDashboard() {
  state.currentDocId = null;
  document.getElementById('viewDashboard').classList.add('active');
  document.getElementById('viewEditor').style.display = 'none';
  document.getElementById('docTitleContainer').style.display = 'none';
  document.getElementById('editorActions').style.display = 'none';
  renderDashboard();
}

function openEditor(docId) {
  state.currentDocId = docId;
  const doc = state.currentDoc;
  if (!doc) return;

  if (!doc.questions || doc.questions.length === 0) {
    doc.questions = [createBlankQuestion('1')];
  }
  state.currentQId = doc.questions[0].id;

  document.getElementById('viewDashboard').classList.remove('active');
  document.getElementById('viewEditor').style.display = 'flex';
  document.getElementById('docTitleContainer').style.display = 'flex';
  document.getElementById('editorActions').style.display = 'flex';

  document.getElementById('docTitleInput').value = doc.title || '';
  document.getElementById('docTopBrand').value = doc.topBrand || '자유 입력';
  document.getElementById('docTopRightBadge').value = doc.topRightBadge || 'LABEL 1';

  const themeColor = doc.themeColor || '#6b21a8';
  document.querySelectorAll('.color-swatch-main').forEach(s => {
    s.classList.toggle('active', s.getAttribute('data-color') === themeColor);
  });
  const mainPicker = document.getElementById('docThemeColorPicker');
  if (mainPicker) mainPicker.value = themeColor;

  const diffColor = doc.diffColor || '#1e3a8a';
  document.querySelectorAll('.color-swatch-diff').forEach(s => {
    s.classList.toggle('active', s.getAttribute('data-color') === diffColor);
  });
  const diffPicker = document.getElementById('docDiffColorPicker');
  if (diffPicker) diffPicker.value = diffColor;

  renderSidebarQuestions();
  loadQuestionToForm();
  renderPaperPreview();
}

function renderDashboard(filterQuery = '') {
  const grid = document.getElementById('docGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const docs = state.documents.filter(d => {
    if (!filterQuery) return true;
    return (d.title && d.title.toLowerCase().includes(filterQuery.toLowerCase())) ||
           (d.description && d.description.toLowerCase().includes(filterQuery.toLowerCase()));
  });

  document.getElementById('docCount').textContent = docs.length;

  docs.forEach(doc => {
    const card = document.createElement('div');
    card.className = 'doc-card';
    const timeAgo = formatTimeAgo(doc.updatedAt);
    const qCount = doc.questions ? doc.questions.length : 0;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div class="doc-card-title">${escapeHTML(doc.title)}</div>
          <div class="doc-card-desc">${escapeHTML(doc.description || '설명이 없습니다.')}</div>
        </div>
        <button class="doc-card-menu-btn" title="삭제" onclick="handleDeleteDoc(event, '${doc.id}')">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
      <div class="doc-card-meta">
        <span>${timeAgo} · ${qCount}문항</span>
        <span style="font-family:var(--font-mono); font-size:0.72rem; color:#52525b;">${doc.id}</span>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.doc-card-menu-btn')) return;
      openEditor(doc.id);
    });
    grid.appendChild(card);
  });
}

function handleCreateNewDoc() {
  const newDoc = {
    id: 'doc-' + Math.random().toString(36).substr(2, 9),
    title: '새 N제 문제집',
    topBrand: 'Pray N',
    topRightBadge: 'Label 1: 다항함수 추론',
    themeColor: '#10b981',
    diffColor: '#10b981',
    description: '새 문제집입니다.',
    updatedAt: Date.now(),
    questions: [createBlankQuestion('1')]
  };

  state.documents.unshift(newDoc);
  state.saveToStorage();
  openEditor(newDoc.id);
}

window.handleDeleteDoc = function(e, docId) {
  if (e) e.stopPropagation();
  if (confirm('이 문제집을 삭제하시겠습니까?')) {
    state.documents = state.documents.filter(d => d.id !== docId);
    state.saveToStorage();
    renderDashboard();
  }
};

/* DRAG & DROP SIDEBAR */
function renderSidebarQuestions() {
  const doc = state.currentDoc;
  if (!doc) return;

  const listEl = document.getElementById('questionList');
  if (!listEl) return;
  listEl.innerHTML = '';
  document.getElementById('sidebarQuestionCount').textContent = `${doc.questions.length}문항`;

  doc.questions.forEach((q, idx) => {
    q.num = String(idx + 1);
    const item = document.createElement('div');
    item.className = `q-list-item ${q.id === state.currentQId ? 'active' : ''}`;
    item.setAttribute('data-idx', idx);

    item.innerHTML = `
      <i class="fa-solid fa-grip-vertical drag-handle" title="드래그하여 순서 변경"></i>
      <div class="q-item-content">
        <div class="q-item-num">
          <span>${q.num}번. ${escapeHTML(q.title || '새 문제')}</span>
          <button type="button" class="q-item-del" onclick="handleDeleteQuestion(event, '${q.id}')" title="삭제">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="q-item-desc">${escapeHTML(q.labelInfo || 'LABEL 미지정')} · [${q.difficulty || 'HD'}]</div>
      </div>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.q-item-del')) return;
      state.currentQId = q.id;
      renderSidebarQuestions();
      loadQuestionToForm();
      renderPaperPreview();
    });

    const handle = item.querySelector('.drag-handle');
    if (handle) {
      handle.setAttribute('draggable', 'true');
      handle.addEventListener('dragstart', (e) => {
        state.draggedQIndex = idx;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      handle.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        state.draggedQIndex = null;
      });
    }

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const targetIdx = parseInt(item.getAttribute('data-idx'));
      if (state.draggedQIndex !== null && state.draggedQIndex !== targetIdx) {
        const movedQ = doc.questions.splice(state.draggedQIndex, 1)[0];
        doc.questions.splice(targetIdx, 0, movedQ);
        state.saveToStorage();
        renderSidebarQuestions();
        renderPaperPreview();
      }
    });

    listEl.appendChild(item);
  });
}

function loadQuestionToForm() {
  const q = state.currentQuestion;
  if (!q) return;

  document.getElementById('qTitle').value = q.title || '';
  document.getElementById('qDifficulty').value = q.difficulty || 'HD';
  const qLabelInfoEl = document.getElementById('qLabelInfo');
  if (qLabelInfoEl) qLabelInfoEl.value = q.labelInfo || '';
  document.getElementById('qAnswer').value = q.answer || '';

  document.getElementById('qShowRecord').checked = q.showRecord !== false;
  document.getElementById('qTagColumn').checked = q.tagColumn !== false;
  document.getElementById('qTagRemark').checked = q.tagRemark !== false;
  document.getElementById('qTagStar').checked = q.tagStar !== false;

  renderBlockEditors();
}

function updateQuestionFromForm() {
  const q = state.currentQuestion;
  if (!q) return;

  q.title = document.getElementById('qTitle').value;
  q.difficulty = document.getElementById('qDifficulty').value;
  const qLabelInfoEl = document.getElementById('qLabelInfo');
  if (qLabelInfoEl) q.labelInfo = qLabelInfoEl.value;
  q.answer = document.getElementById('qAnswer').value;

  q.showRecord = document.getElementById('qShowRecord').checked;
  q.tagColumn = document.getElementById('qTagColumn').checked;
  q.tagRemark = document.getElementById('qTagRemark').checked;
  q.tagStar = document.getElementById('qTagStar').checked;

  state.saveToStorage();
  renderSidebarQuestions();
  renderPaperPreview();
}

function handleAddQuestion() {
  const doc = state.currentDoc;
  if (!doc) return;

  const nextNum = String(doc.questions.length + 1);
  const newQ = createBlankQuestion(nextNum);
  doc.questions.push(newQ);
  state.currentQId = newQ.id;

  state.saveToStorage();
  renderSidebarQuestions();
  loadQuestionToForm();
  renderPaperPreview();
}

window.handleDeleteQuestion = function(e, qId) {
  if (e) e.stopPropagation();
  const doc = state.currentDoc;
  if (!doc || doc.questions.length <= 1) {
    alert('최소 1개의 문항은 유지되어야 합니다.');
    return;
  }

  doc.questions = doc.questions.filter(q => q.id !== qId);
  if (state.currentQId === qId) {
    state.currentQId = doc.questions[0].id;
  }

  state.saveToStorage();
  renderSidebarQuestions();
  loadQuestionToForm();
  renderPaperPreview();
};

function createBlankQuestion(numStr) {
  return {
    id: 'q-' + Math.random().toString(36).substr(2, 9),
    num: numStr,
    title: '새 문제',
    difficulty: 'HD',
    labelInfo: 'LABEL ' + numStr + '. 수열의 극한',
    answer: '',
    showRecord: true,
    tagColumn: true,
    tagRemark: true,
    tagStar: false,
    problemBlocks: [
      {
        id: 'pb-' + Math.random().toString(36).substr(2, 9),
        type: 'statement',
        content: '새 문제입니다. 지문을 입력하세요.'
      }
    ],
    explanationBlocks: [
      {
        id: 'eb-' + Math.random().toString(36).substr(2, 9),
        type: 'phase',
        title: 'PHASE 1  풀이 단계 1',
        content: '해설 내용을 입력하세요.'
      }
    ]
  };
}

/* SEPARATE DUAL BLOCK BUILDER */
function getActiveBlockList() {
  const q = state.currentQuestion;
  if (!q) return [];
  if (!q.problemBlocks) q.problemBlocks = [];
  if (!q.explanationBlocks) q.explanationBlocks = [];
  return state.activeTab === 'problem' ? q.problemBlocks : q.explanationBlocks;
}

function renderBlockEditors() {
  const blocks = getActiveBlockList();
  const listContainer = document.getElementById('blocksList');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  if (blocks.length === 0) {
    listContainer.innerHTML = `<div style="color:var(--text-dim); text-align:center; padding:16px;">
      ${state.activeTab === 'problem' ? '문제지' : '해설지'} 블록이 없습니다. add block 버튼으로 추가하세요.
    </div>`;
    return;
  }

  blocks.forEach((block) => {
    const card = document.createElement('div');
    card.className = 'block-card';

    let iconHTML = '';
    let titleText = '';

    switch(block.type) {
      case 'header': iconHTML = '<i class="fa-solid fa-heading icon-hdr"></i>'; titleText = '상단 헤더 배너 (Header Band)'; break;
      case 'statement': iconHTML = '<i class="fa-solid fa-paragraph icon-stmt"></i>'; titleText = 'statement (지문/본문)'; break;
      case 'boxed': iconHTML = '<i class="fa-regular fa-square-check icon-box"></i>'; titleText = '<보기> 상자 (Boxed)'; break;
      case 'label': iconHTML = '<i class="fa-solid fa-tag icon-lbl"></i>'; titleText = 'LABEL 라벨 배너 (Label Block)'; break;
      case 'choices': iconHTML = '<i class="fa-solid fa-list-ol icon-choices"></i>'; titleText = '선지 ①~⑤ (Choices)'; break;
      case 'image': iconHTML = '<i class="fa-regular fa-image icon-img"></i>'; titleText = '이미지 / 그래프 (Image)'; break;
      case 'phase': iconHTML = '<i class="fa-solid fa-layer-group icon-phase"></i>'; titleText = 'PHASE 단계별 해설 (Phase)'; break;
      case 'column': iconHTML = '<i class="fa-solid fa-columns icon-column"></i>'; titleText = 'Column 개념 분석 (Column)'; break;
      case 'remark': iconHTML = '<i class="fa-solid fa-note-sticky icon-remark"></i>'; titleText = 'Remark 보충 설명 (Remark)'; break;
      case 'star': iconHTML = '<i class="fa-solid fa-star icon-star"></i>'; titleText = '★* 별해 (Alternative Solution)'; break;
      case 'qref': iconHTML = '<i class="fa-solid fa-file-contract icon-qref"></i>'; titleText = 'QUESTION REF. 기출 박스'; break;
      case 'author': iconHTML = '<i class="fa-solid fa-user-pen icon-author"></i>'; titleText = "출제자의 말 (Author's Note)"; break;
      case 'note': iconHTML = '<i class="fa-solid fa-lightbulb icon-note"></i>'; titleText = '노트 & 힌트 (Note / Hint)'; break;
      case 'reference': iconHTML = '<i class="fa-solid fa-bookmark icon-ref"></i>'; titleText = '레퍼런스 / 출처 (Reference)'; break;
    }

    card.innerHTML = `
      <div class="block-card-header">
        <div class="block-tag">${iconHTML} <span>${titleText}</span></div>
        <div class="block-actions">
          <button type="button" class="btn-block-action btn-move-up" title="위로"><i class="fa-solid fa-arrow-up"></i></button>
          <button type="button" class="btn-block-action btn-move-down" title="아래로"><i class="fa-solid fa-arrow-down"></i></button>
          <button type="button" class="btn-block-action del btn-delete-block" title="삭제"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      <div class="block-card-body" id="block-body-${block.id}"></div>
    `;

    card.querySelector('.btn-move-up').addEventListener('click', (e) => { e.preventDefault(); moveBlock(block.id, -1); });
    card.querySelector('.btn-move-down').addEventListener('click', (e) => { e.preventDefault(); moveBlock(block.id, 1); });
    card.querySelector('.btn-delete-block').addEventListener('click', (e) => { e.preventDefault(); deleteBlock(block.id); });

    listContainer.appendChild(card);
    renderBlockBodyFields(block);
  });
}

function renderBlockDropdownMenu() {
  const dropdown = document.getElementById('blockMenuDropdown');
  if (!dropdown) return;
  dropdown.innerHTML = '';

  const isProblemTab = state.activeTab === 'problem';

  const menuItems = isProblemTab ? [
    { type: 'header', icon: 'fa-heading icon-hdr', title: '상단 헤더 배너 Block', desc: '커스텀 브랜드 헤더 띠지' },
    { type: 'statement', icon: 'fa-paragraph icon-stmt', title: '지문 / 본문 (Statement)', desc: '문제 및 본문 텍스트 (수식 지원)' },
    { type: 'boxed', icon: 'fa-square-check icon-box', title: '<보기> 상자 (Boxed)', desc: '조건 및 보기 상자 (ㄱ, ㄴ, ㄷ)' },
    { type: 'label', icon: 'fa-tag icon-lbl', title: '라벨 배너 (Label Block)', desc: 'LABEL 1. 수열의 극한 단원 배너' },
    { type: 'choices', icon: 'fa-list-ol icon-choices', title: '선지 ①~⑤ (Choices)', desc: '5지 선다형 선택지 옵션' },
    { type: 'image', icon: 'fa-image icon-img', title: '이미지 / 그래프 (Image)', desc: '도형, 그래프, 참고 이미지' }
  ] : [
    { type: 'header', icon: 'fa-heading icon-hdr', title: '상단 헤더 배너 Block', desc: '커스텀 브랜드 헤더 띠지' },
    { type: 'phase', icon: 'fa-layer-group icon-phase', title: 'PHASE 단계별 해설', desc: 'PHASE 1, PHASE 2 풀이 단계' },
    { type: 'column', icon: 'fa-columns icon-column', title: 'Column 개념 분석', desc: '심도있는 개념/연결고리 분석 상자' },
    { type: 'remark', icon: 'fa-note-sticky icon-remark', title: 'Remark 보충 설명', desc: '주목할 점, 복습 개념, 주의사항' },
    { type: 'star', icon: 'fa-star icon-star', title: '★* 별해', desc: '대안 풀이 및 사고력 증진 접근법' },
    { type: 'qref', icon: 'fa-file-contract icon-qref', title: 'QUESTION REF. 기출 박스', desc: '연계/관련 기출문제 제시 박스' },
    { type: 'author', icon: 'fa-user-pen icon-author', title: "출제자의 말 (Author's Note)", desc: '출제 의도 및 시험 가이드' },
    { type: 'note', icon: 'fa-lightbulb icon-note', title: '노트 & 힌트 (Note / Hint)', desc: '풀이 팁, 참고 공식' },
    { type: 'reference', icon: 'fa-bookmark icon-ref', title: '레퍼런스 / 출처 (Reference)', desc: '출처 표기' }
  ];

  menuItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'block-menu-item';
    div.setAttribute('data-type', item.type);
    div.innerHTML = `
      <i class="fa-solid ${item.icon}"></i>
      <div class="menu-item-text">
        <strong>${escapeHTML(item.title)}</strong>
        <small>${escapeHTML(item.desc)}</small>
      </div>
    `;
    div.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleAddBlock(item.type);
      dropdown.style.display = 'none';
    });
    dropdown.appendChild(div);
  });
}

function renderBlockBodyFields(block) {
  const bodyEl = document.getElementById(`block-body-${block.id}`);
  if (!bodyEl) return;

  if (block.type === 'statement' || block.type === 'reference') {
    bodyEl.innerHTML = `
      <textarea class="editor-textarea" placeholder="내용 입력 (수식 지원: \\( f(x) \\) 또는 \\[ ... \\])">${escapeHTML(block.content || '')}</textarea>
    `;
    bodyEl.querySelector('textarea').addEventListener('input', (e) => {
      block.content = e.target.value;
      state.saveToStorage();
      renderPaperPreview();
    });
  } else if (block.type === 'header') {
    bodyEl.innerHTML = `
      <div style="display:flex; gap:8px;">
        <input type="text" class="editor-input brand-inp" value="${escapeHTML(block.brandText || '자유 입력')}" placeholder="상단 브랜드 헤더 (예: 자유 입력)" style="flex:2;">
        <input type="text" class="editor-input badge-inp" value="${escapeHTML(block.diamondBadge || 'LABEL 1')}" placeholder="우측 뱃지 (예: LABEL 1)" style="flex:1;">
      </div>
    `;
    bodyEl.querySelector('.brand-inp').addEventListener('input', (e) => {
      block.brandText = e.target.value;
      state.saveToStorage();
      renderPaperPreview();
    });
    bodyEl.querySelector('.badge-inp').addEventListener('input', (e) => {
      block.diamondBadge = e.target.value;
      state.saveToStorage();
      renderPaperPreview();
    });
  } else if (block.type === 'label') {
    bodyEl.innerHTML = `
      <div style="display:flex; gap:8px;">
        <input type="text" class="editor-input label-no-inp" value="${escapeHTML(block.labelNo || 'LABEL 1.')}" placeholder="라벨 번호 (예: LABEL 1.)" style="width:120px;">
        <input type="text" class="editor-input label-title-inp" value="${escapeHTML(block.labelTitle || '수열의 극한')}" placeholder="단원/주제 제목 (예: 수열의 극한)">
      </div>
    `;
    bodyEl.querySelector('.label-no-inp').addEventListener('input', (e) => {
      block.labelNo = e.target.value;
      state.saveToStorage();
      renderPaperPreview();
    });
    bodyEl.querySelector('.label-title-inp').addEventListener('input', (e) => {
      block.labelTitle = e.target.value;
      state.saveToStorage();
      renderPaperPreview();
    });
  } else if (['boxed', 'phase', 'column', 'remark', 'star', 'qref', 'author', 'note'].includes(block.type)) {
    let defaultTitle = '';
    if (block.type === 'boxed') defaultTitle = '<보 기>';
    if (block.type === 'phase') defaultTitle = 'PHASE 1  단계별 해설';
    if (block.type === 'column') defaultTitle = 'Column  개념 분석';
    if (block.type === 'remark') defaultTitle = 'Remark / 학습 체크 포인트';
    if (block.type === 'star') defaultTitle = '★* (별해) 대안 풀이';
    if (block.type === 'qref') defaultTitle = 'QUESTION REF. >>> 기출 문제';
    if (block.type === 'author') defaultTitle = '출제자의 말';
    if (block.type === 'note') defaultTitle = '노트 & 힌트';

    bodyEl.innerHTML = `
      <div style="margin-bottom:8px;">
        <input type="text" class="editor-input title-inp" value="${escapeHTML(block.title || defaultTitle)}" placeholder="제목 입력">
      </div>
      <textarea class="editor-textarea content-inp" placeholder="상세 내용 입력">${escapeHTML(block.content || '')}</textarea>
    `;

    bodyEl.querySelector('.title-inp').addEventListener('input', (e) => {
      block.title = e.target.value;
      state.saveToStorage();
      renderPaperPreview();
    });
    bodyEl.querySelector('.content-inp').addEventListener('input', (e) => {
      block.content = e.target.value;
      state.saveToStorage();
      renderPaperPreview();
    });
  } else if (block.type === 'choices') {
    if (!block.items) block.items = ['', '', '', '', ''];
    if (!block.layout) block.layout = '5';

    bodyEl.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
        <span style="font-size:0.78rem; color:var(--text-sub);">선지 배치:</span>
        <select class="editor-select choice-layout-select" style="width:auto; padding:4px 8px;">
          <option value="5" ${block.layout === '5' ? 'selected' : ''}>1열 (가로 5개)</option>
          <option value="2" ${block.layout === '2' ? 'selected' : ''}>2열 (2-2-1 배치)</option>
          <option value="1" ${block.layout === '1' ? 'selected' : ''}>5열 (세로 5개)</option>
        </select>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${['①', '②', '③', '④', '⑤'].map((symbol, i) => `
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-weight:700; width:16px;">${symbol}</span>
            <input type="text" class="editor-input choice-item-input" data-idx="${i}" value="${escapeHTML(block.items[i] || '')}" placeholder="선지 ${i+1} 내용">
          </div>
        `).join('')}
      </div>
    `;

    bodyEl.querySelector('.choice-layout-select').addEventListener('change', (e) => {
      block.layout = e.target.value;
      state.saveToStorage();
      renderPaperPreview();
    });

    bodyEl.querySelectorAll('.choice-item-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        block.items[idx] = e.target.value;
        state.saveToStorage();
        renderPaperPreview();
      });
    });
  } else if (block.type === 'image') {
    bodyEl.innerHTML = `
      <div style="margin-bottom:8px;">
        <input type="text" class="editor-input img-url" value="${escapeHTML(block.url || '')}" placeholder="이미지 URL 주소 입력 (http://...)">
      </div>
      <input type="text" class="editor-input img-cap" value="${escapeHTML(block.caption || '')}" placeholder="캡션/도형 설명 입력">
    `;

    bodyEl.querySelector('.img-url').addEventListener('input', (e) => {
      block.url = e.target.value;
      state.saveToStorage();
      renderPaperPreview();
    });
    bodyEl.querySelector('.img-cap').addEventListener('input', (e) => {
      block.caption = e.target.value;
      state.saveToStorage();
      renderPaperPreview();
    });
  }
}

function handleAddBlock(type) {
  const blocks = getActiveBlockList();
  const newBlock = { id: (state.activeTab === 'problem' ? 'pb-' : 'eb-') + Math.random().toString(36).substr(2, 9), type };
  
  if (type === 'header') { newBlock.brandText = state.currentDoc?.topBrand || '자유 입력'; newBlock.diamondBadge = state.currentDoc?.topRightBadge || 'LABEL 1'; }
  if (type === 'label') { newBlock.labelNo = 'LABEL 1.'; newBlock.labelTitle = '수열의 극한'; }
  
  blocks.push(newBlock);
  state.saveToStorage();
  renderBlockEditors();
  renderPaperPreview();
}

function moveBlock(blockId, direction) {
  const blocks = getActiveBlockList();
  const idx = blocks.findIndex(b => b.id === blockId);
  if (idx === -1) return;

  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= blocks.length) return;

  const temp = blocks[idx];
  blocks[idx] = blocks[targetIdx];
  blocks[targetIdx] = temp;

  state.saveToStorage();
  renderBlockEditors();
  renderPaperPreview();
}

function deleteBlock(blockId) {
  const q = state.currentQuestion;
  if (!q) return;

  if (state.activeTab === 'problem' && q.problemBlocks) {
    q.problemBlocks = q.problemBlocks.filter(b => b.id !== blockId);
  } else if (state.activeTab === 'explanation' && q.explanationBlocks) {
    q.explanationBlocks = q.explanationBlocks.filter(b => b.id !== blockId);
  }

  state.saveToStorage();
  renderBlockEditors();
  renderPaperPreview();
}

window.moveBlock = moveBlock;
window.deleteBlock = deleteBlock;

/* PAGE RENDERER WITH SEOL-MAJI COMPACT SPACING & ALIGNMENT */
function renderPaperPreview() {
  const container = document.getElementById('paperSheetRenderArea');
  if (!container) return;
  container.innerHTML = '';

  const doc = state.currentDoc;
  if (!doc || !doc.questions || doc.questions.length === 0) return;

  const mainColor = doc.themeColor || '#10b981';
  const diffColor = doc.diffColor || '#10b981';
  applyThemeCSSVariables(container, mainColor, diffColor);

  renderSeolMajiPages(container, doc, state.activeTab === 'explanation', state.columnMode);

  try {
    renderMathInElement(container, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '\\[', right: '\\]', display: true},
        {left: '$', right: '$', display: false},
        {left: '\\(', right: '\\)', display: false}
      ],
      throwOnError: false
    });
  } catch (e) {
    console.error('KaTeX render exception boundary caught:', e);
  }

  // apply zoom transform for preview
  applyZoom();
}


function renderSeolMajiPages(targetContainer, doc, isExplanationMode, colMode) {
  const questions = doc.questions || [];
  const questionsPerPage = colMode === 1 ? 1 : 2;
  const totalPages = Math.ceil(questions.length / questionsPerPage);

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageEl = document.createElement('div');
    pageEl.className = `exam-paper-page ${isExplanationMode ? 'sheet-explanation' : 'sheet-problem'}`;

    applyThemeCSSVariables(pageEl, doc.themeColor || '#10b981', doc.diffColor || '#10b981');

    const customBrand = doc.topBrand || 'Pray N';
    const customTopBadge = doc.topRightBadge || 'LABEL 1';

    const headerHTML = `
      <div class="seol-top-page-bar ${isExplanationMode ? 'explanation' : 'problem'}">
        <div class="seol-top-brand-wrap">
          <div class="seol-top-band"><span>${escapeHTML(customBrand)}</span></div>
        </div>
        <div class="seol-top-decoration">
          <div class="seol-triangle-strip" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
          <div class="seol-record-strip" aria-hidden="true">
            <span class="rec-word">RECORD</span>
            <span class="rec-line"></span>
            <span class="rec-m">m</span>
            <span class="rec-s">s</span>
          </div>
          ${isExplanationMode ? `<div class="seol-page-badge">${escapeHTML(customTopBadge)}</div>` : ``}
        </div>
      </div>
    `;

    const bodyContainer = document.createElement('div');
    bodyContainer.className = `page-body-container mode-${colMode}col ${isExplanationMode ? 'mode-explanation' : 'mode-problem'}`;

    const pageQuestions = questions.slice(pageIdx * questionsPerPage, (pageIdx + 1) * questionsPerPage);
    pageQuestions.forEach(q => bodyContainer.appendChild(renderQuestionNode(q, isExplanationMode)));

    pageEl.innerHTML = headerHTML;
    pageEl.appendChild(bodyContainer);

    if (isExplanationMode) {
      pageEl.insertAdjacentHTML('beforeend', `<div class="seol-page-footer"><span>- ${pageIdx + 1} -</span></div>`);
    }

    targetContainer.appendChild(pageEl);
  }
}

function renderProblemBlockHTML(b) {
  if (b.type === 'header') return '';
  if (b.type === 'label') return '';
  if (b.type === 'statement' && b.content) {
    return `<div class="seol-statement-text">${escapeHTML(b.content)}</div>`;
  }
  if (b.type === 'boxed' && b.content) {
    return `
      <div class="seol-boxed-container">
        <div class="seol-boxed-content">${escapeHTML(b.content)}</div>
      </div>
    `;
  }
  if (b.type === 'choices' && b.items) {
    const symbols = ['①', '②', '③', '④', '⑤'];
    const layoutClass = `col-${b.layout || '5'}`;
    let itemsHTML = '';
    b.items.forEach((itemText, i) => {
      itemsHTML += `
        <div class="seol-choice-item">
          <span class="choice-symbol">${symbols[i]}</span>
          <span class="choice-text">${escapeHTML(itemText || '')}</span>
        </div>
      `;
    });
    return `<div class="seol-choices ${layoutClass}">${itemsHTML}</div>`;
  }
  if (b.type === 'image' && b.url) {
    return `
      <div class="seol-image-wrap">
        <img src="${escapeHTML(b.url)}" class="seol-inline-image">
        ${b.caption ? `<div class="seol-image-caption">${escapeHTML(b.caption)}</div>` : ''}
      </div>
    `;
  }
  return '';
}

function renderExplanationBlockHTML(b) {
  if (b.type === 'header') return '';
  if (b.type === 'phase' && (b.title || b.content)) {
    return `
      <div class="seol-phase-box">
        <div class="seol-phase-title">${escapeHTML(b.title || 'PHASE')}</div>
        <div class="seol-phase-text">${escapeHTML(b.content || '')}</div>
      </div>
    `;
  }
  if (b.type === 'column' && (b.title || b.content)) {
    return `
      <div class="seol-column-box">
        <div class="seol-column-header">${escapeHTML(b.title || 'Column')}</div>
        <div class="seol-column-content">${escapeHTML(b.content || '')}</div>
      </div>
    `;
  }
  if (b.type === 'remark' && (b.title || b.content)) {
    return `
      <div class="seol-remark-box">
        <div class="seol-remark-header">${escapeHTML(b.title || 'Remark')}</div>
        <div class="seol-remark-content">${escapeHTML(b.content || '')}</div>
      </div>
    `;
  }
  if (b.type === 'star' && (b.title || b.content)) {
    return `
      <div class="seol-star-box">
        <div class="seol-star-header">${escapeHTML(b.title || '★※ 별해')}</div>
        <div class="seol-star-content">${escapeHTML(b.content || '')}</div>
      </div>
    `;
  }
  if (b.type === 'qref' && (b.title || b.content)) {
    return `
      <div class="seol-qref-box">
        <div class="seol-qref-header"><span>QUESTION REF.</span><span>${escapeHTML(b.title || '기출 박스')}</span></div>
        <div class="seol-qref-content">${escapeHTML(b.content || '')}</div>
      </div>
    `;
  }
  if (b.type === 'author' && (b.title || b.content)) {
    return `
      <div class="seol-author-box">
        <div class="seol-author-header">${escapeHTML(b.title || '출제자의 말')}</div>
        <div class="seol-author-content">${escapeHTML(b.content || '')}</div>
      </div>
    `;
  }
  if (b.type === 'note' && (b.title || b.content)) {
    return `
      <div class="seol-note-box">
        <div class="seol-note-header">${escapeHTML(b.title || '노트 & 힌트')}</div>
        <div class="seol-note-content">${escapeHTML(b.content || '')}</div>
      </div>
    `;
  }
  if (b.type === 'reference' && (b.title || b.content)) {
    return `
      <div class="seol-reference-box">
        <div class="seol-reference-header">${escapeHTML(b.title || 'Reference')}</div>
        <div class="seol-reference-content">${escapeHTML(b.content || '')}</div>
      </div>
    `;
  }
  return '';
}

function renderQuestionNode(q, isExplanationMode) {
  const qNode = document.createElement('div');
  qNode.className = `seol-question-node ${isExplanationMode ? 'is-explanation' : 'is-problem'}`;

  const diffCode = (q.difficulty || 'HD').toUpperCase();

  if (!isExplanationMode) {
    const blocks = q.problemBlocks || q.blocks || [];
    const bodyHTML = blocks.map(renderProblemBlockHTML).join('');
    qNode.innerHTML = `
      <div class="seol-q-top-row archive-problem-header">
        <div class="seol-num-cluster">
          <div class="seol-num-rail" aria-hidden="true"></div>
          <div class="seol-num-stack">
            <div class="seol-num-box">${escapeHTML(q.num || '')}</div>
            <div class="seol-diff-under">${escapeHTML(diffCode)}</div>
          </div>
          ${q.tagStar ? `<div class="seol-problem-star-mark">★※</div>` : ``}
        </div>
        <div class="seol-problem-meta">
          ${q.showRecord ? `<div class="seol-record-box">RECORD <span class="sep">|</span> <span class="line"></span> <span class="line short"></span> <span class="unit">m</span> <span class="unit">s</span></div>` : ''}
          <div class="seol-learning-badges">
            ${q.tagColumn ? `<span class="learning-tag column">Column</span>` : ''}
            ${q.tagRemark ? `<span class="learning-tag remark">Remark</span>` : ''}
          </div>
        </div>
      </div>
      <div class="seol-q-body problem-body">${bodyHTML}</div>
    `;
  } else {
    const blocks = q.explanationBlocks || q.blocks || [];
    const bodyHTML = blocks.map(renderExplanationBlockHTML).join('');
    qNode.innerHTML = `
      <div class="seol-exp-header-bar">
        <div class="seol-exp-header-left">
          <span class="exp-no">${escapeHTML(q.num || '')}</span>
          <span class="exp-diff">${escapeHTML(diffCode)}</span>
          <span class="exp-title">${escapeHTML(q.title || '')}</span>
        </div>
        <div class="seol-exp-header-right">
          <span class="exp-answer">정답 ${escapeHTML(q.answer || '미지정')}</span>
          <div class="seol-learning-badges explanation">
            ${q.tagColumn ? `<span class="learning-tag column">Column</span>` : ''}
            ${q.tagRemark ? `<span class="learning-tag remark">Remark</span>` : ''}
            ${q.tagStar ? `<span class="learning-tag star-outline">★※ 별해</span>` : ''}
          </div>
        </div>
      </div>
      <div class="seol-q-body explanation-body">${bodyHTML}</div>
    `;
  }

  return qNode;
}


/* PRINT / PDF / ZOOM HANDLERS */
async function handlePrintCurrentView() {
  const doc = state.currentDoc;
  const printRoot = document.getElementById('printRenderRoot');
  if (!doc || !printRoot) return;

  try {
    setActionButtonsBusy(true, '인쇄 준비...');
    await prepareOutputRoot(printRoot, state.activeTab === 'explanation');

    document.body.classList.add('print-mode');

    const cleanup = () => {
      document.body.classList.remove('print-mode');
      printRoot.innerHTML = '';
      setActionButtonsBusy(false);
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();

    setTimeout(() => {
      if (document.body.classList.contains('print-mode')) cleanup();
    }, 1500);
  } catch (e) {
    console.error(e);
    alert('인쇄 준비 중 오류가 발생했습니다: ' + (e && e.message ? e.message : e));
    document.body.classList.remove('print-mode');
    printRoot.innerHTML = '';
    setActionButtonsBusy(false);
  }
}


async function handleExportPDF(exportType) {
  const root = document.getElementById('pdfExportCanvas');
  const doc = state.currentDoc;
  if (!root || !doc) return;

  const isExplanation = exportType === 'explanation';
  const suffix = isExplanation ? '해설지' : '문제지';

  try {
    setActionButtonsBusy(true, 'PDF 생성 중...');

    // Prepare offscreen root for rendering
    root.innerHTML = '';
    root.style.visibility = 'visible';
    root.style.position = 'fixed';
    root.style.left = '-20000px';
    root.style.top = '0';
    root.style.pointerEvents = 'none';

    await prepareOutputRoot(root, isExplanation);

    // Ensure fonts loaded
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    const opt = {
      margin: 0,
      filename: `${(doc.title || 'document').replace(/[\/\\:?<>|"]/g, '_')}_${suffix}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: root.scrollWidth,
        windowHeight: root.scrollHeight
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    await html2pdf().set(opt).from(root).save();
  } catch (e) {
    console.error(e);
    alert('PDF 생성 중 오류가 발생했습니다: ' + (e && e.message ? e.message : e));
  } finally {
    root.innerHTML = '';
    root.style.visibility = 'hidden';
    setActionButtonsBusy(false);
  }
}

/* Helpers */
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '방금 전';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return `${diffSec}초 전`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}

/* ZOOM helper: applies CSS transform to preview container */
function applyZoom() {
  const container = document.querySelector('.paper-sheet-container');
  if (!container) return;
  container.style.transformOrigin = 'top center';
  container.style.transform = `scale(${state.zoom})`;
  const zoomText = document.getElementById('zoomLevelText');
  if (zoomText) zoomText.textContent = `${Math.round(state.zoom * 100)}%`;
}