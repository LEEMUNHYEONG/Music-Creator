// ==========================================================
// js/cloud-sync-ui.js - 클라우드 동기화/복원/히스토리 모달 UI
// (index.html 인라인 530줄 블록에서 이관. 전역 함수들은 모달의
//  onclick 핸들러에서 호출되므로 최상위 선언을 유지한다.)
// ==========================================================

// ─── 유틸: 날짜 포매팅 ───────────────────────────────────────
function formatDateTimeKo(isoStr) {
    if (!isoStr) return "날짜 없음";
    const d = new Date(isoStr);
    if (isNaN(d)) return isoStr;
    return d.getFullYear() + "년 " +
           String(d.getMonth()+1).padStart(2,"0") + "월 " +
           String(d.getDate()).padStart(2,"0") + "일 " +
           String(d.getHours()).padStart(2,"0") + ":" +
           String(d.getMinutes()).padStart(2,"0");
}
function relativeTime(isoStr) {
    if (!isoStr) return "";
    const diff = Date.now() - new Date(isoStr).getTime();
    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return Math.floor(diff/60000) + "분 전";
    if (diff < 86400000) return Math.floor(diff/3600000) + "시간 전";
    if (diff < 604800000) return Math.floor(diff/86400000) + "일 전";
    return Math.floor(diff/604800000) + "주 전";
}

// ─── 클라우드 동기화 모달 (업로드/다운로드 통합) ───────────
let _csCurrentTab = 'upload';
let _csLocalProjects = [];
let _csCloudProjects = [];
let _csCloudIds = new Set();

// 자동 동기화 설정 로드/저장
function getCloudAutoSync() {
    return localStorage.getItem('cloudAutoSync') !== 'false'; // 기본: true
}
function setCloudAutoSync(val) {
    localStorage.setItem('cloudAutoSync', val ? 'true' : 'false');
    const toggle = document.getElementById('cloudAutoSyncToggle');
    if (toggle) toggle.checked = val;
}

async function openCloudSyncModal() {
    document.getElementById("cloudSyncModal").classList.remove("sync-modal-hidden");
    // 자동 동기화 토글 초기값 반영
    const toggle = document.getElementById('cloudAutoSyncToggle');
    if (toggle) toggle.checked = getCloudAutoSync();

    _csLocalProjects = [];
    _csCloudProjects = [];
    _csCloudIds = new Set();

    // 클라우드 프로젝트 ID 목록 미리 로드 (동기화 상태 표시용)
    if (typeof window.getAllCloudProjects === 'function') {
        window.getAllCloudProjects().then(cloud => {
            _csCloudProjects = cloud || [];
            _csCloudIds = new Set(_csCloudProjects.map(p => p.id));
            if (_csCurrentTab === 'download') renderCsDownloadList();
            else renderCsUploadList(); // 업로드 탭도 상태 갱신
        });
    }

    switchCloudSyncTab('upload');
}
function closeCloudSyncModal() {
    document.getElementById("cloudSyncModal").classList.add("sync-modal-hidden");
}

function switchCloudSyncTab(tab) {
    _csCurrentTab = tab;
    document.getElementById('csTabUpload').classList.toggle('active', tab === 'upload');
    document.getElementById('csTabDownload').classList.toggle('active', tab === 'download');
    document.getElementById('csUploadPanel').classList.toggle('sync-modal-hidden', tab !== 'upload');
    document.getElementById('csDownloadPanel').classList.toggle('sync-modal-hidden', tab !== 'download');

    const footer = document.getElementById('cloudSyncModalFooter');
    if (tab === 'upload') {
        footer.innerHTML = `<button class="btn-sync-secondary" onclick="closeCloudSyncModal()">닫기</button>
            <button class="btn-sync-primary" id="csUploadBtn" onclick="doCsUpload()">
                <i class="fas fa-cloud-upload-alt"></i> &nbsp;선택 업로드
            </button>`;
        renderCsUploadList();
    } else {
        footer.innerHTML = `<button class="btn-sync-secondary" onclick="closeCloudSyncModal()">닫기</button>
            <button class="btn-sync-primary" id="csDownloadBtn" onclick="doCsDownload()">
                <i class="fas fa-cloud-download-alt"></i> &nbsp;선택 다운로드
            </button>`;
        renderCsDownloadList();
    }
}

// ── 업로드 탭 렌더링 ──────────────────────────────────────
function renderCsUploadList() {
    const localKey = "musicCreatorProjects";
    let projects = [];
    try {
        const stored = localStorage.getItem(localKey);
        if (stored) projects = JSON.parse(stored);
        if (!Array.isArray(projects)) projects = [];
    } catch(e) {}
    projects = projects.filter(p => p && p.id);
    projects.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
    _csLocalProjects = projects;

    const container = document.getElementById('csUploadProjectList');
    if (!projects.length) {
        container.innerHTML = '<div class="sync-empty"><i class="fas fa-inbox"></i>로컬에 저장된 프로젝트가 없습니다.</div>';
        return;
    }
    container.innerHTML = projects.map((p, i) => {
        const synced = _csCloudIds.has(p.id);
        return `<div class="sync-project-card selected">
            <input type="checkbox" data-cs-upload-idx="${i}" checked onchange="updateCsUploadCount()">
            <div class="sync-card-info">
                <div class="sync-card-title">${escapeHtmlStr(p.title || "제목 없음")}</div>
                <div class="sync-card-meta">
                    <span><i class="fas fa-clock"></i> ${formatDateTimeKo(p.savedAt)}</span>
                    <span class="sync-card-badge">${p.lastStep || 1}단계</span>
                    <span title="${synced ? '클라우드 동기화됨' : '클라우드에 없음'}">
                        <i class="fas fa-cloud cs-cloud-icon${synced ? '' : ' unsynced'}"></i>
                        ${synced ? '<span style="font-size:0.75rem;color:#34d399;">동기화됨</span>' : '<span style="font-size:0.75rem;color:var(--text-secondary);">미동기화</span>'}
                    </span>
                </div>
            </div>
        </div>`;
    }).join('');
    document.getElementById('csUploadSelectAll').checked = true;
    updateCsUploadCount();
}
function toggleCsUploadAll(checked) {
    document.querySelectorAll('[data-cs-upload-idx]').forEach(cb => cb.checked = checked);
    updateCsUploadCount();
}
function updateCsUploadCount() {
    const count = document.querySelectorAll('[data-cs-upload-idx]:checked').length;
    document.getElementById('csUploadCountLabel').textContent = count + '개 선택됨';
    const btn = document.getElementById('csUploadBtn');
    if (btn) btn.disabled = count === 0;
}
async function doCsUpload() {
    const checked = [...document.querySelectorAll('[data-cs-upload-idx]:checked')];
    const indices = checked.map(cb => parseInt(cb.dataset.csUploadIdx));
    const toUpload = _csLocalProjects.filter((_, i) => indices.includes(i));
    if (!toUpload.length) return;
    const btn = document.getElementById('csUploadBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 업로드 중...'; }

    if (!window.firebaseAuth?.currentUser || !window.firebaseDb) {
        alert('로그인 후 이용 가능합니다.');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> &nbsp;선택 업로드'; }
        return;
    }
    const uid = window.firebaseAuth.currentUser.uid;
    let uploaded = 0;
    for (const p of toUpload) {
        try {
            await window.firebaseDb.collection('users').doc(uid).collection('projects').doc(String(p.id)).set(p, { merge: true });
            _csCloudIds.add(p.id);
            uploaded++;
        } catch(e) { console.error('업로드 실패:', p.id, e); }
    }
    closeCloudSyncModal();
    alert(`☁️ 클라우드 업로드 완료: ${uploaded}개 프로젝트가 동기화되었습니다.`);
}

// ── 다운로드 탭 렌더링 ────────────────────────────────────
async function renderCsDownloadList() {
    const container = document.getElementById('csDownloadProjectList');
    container.innerHTML = '<div class="sync-loading"><i class="fas fa-spinner fa-spin"></i> &nbsp;클라우드 데이터 불러오는 중...</div>';
    if (!_csCloudProjects.length && typeof window.getAllCloudProjects === 'function') {
        _csCloudProjects = (await window.getAllCloudProjects()) || [];
    }
    if (!_csCloudProjects.length) {
        container.innerHTML = '<div class="sync-empty"><i class="fas fa-cloud"></i>클라우드에 저장된 프로젝트가 없습니다.</div>';
        return;
    }
    container.innerHTML = _csCloudProjects.map((p, i) => `
        <div class="sync-project-card selected">
            <input type="checkbox" data-cs-dl-idx="${i}" checked onchange="updateCsDownloadCount()">
            <div class="sync-card-info">
                <div class="sync-card-title">${escapeHtmlStr(p.title || "제목 없음")}</div>
                <div class="sync-card-meta">
                    <span><i class="fas fa-clock"></i> ${formatDateTimeKo(p.savedAt)}</span>
                    <span class="sync-card-badge">${p.lastStep || 1}단계</span>
                    <span style="color:${relativeTime(p.savedAt).includes('방금')? '#34d399':'var(--text-secondary)'};">${relativeTime(p.savedAt)}</span>
                </div>
            </div>
        </div>
    `).join('');
    document.getElementById('csDownloadSelectAll').checked = true;
    updateCsDownloadCount();
}
function toggleCsDownloadAll(checked) {
    document.querySelectorAll('[data-cs-dl-idx]').forEach(cb => cb.checked = checked);
    updateCsDownloadCount();
}
function updateCsDownloadCount() {
    const count = document.querySelectorAll('[data-cs-dl-idx]:checked').length;
    document.getElementById('csDownloadCountLabel').textContent = count + '개 선택됨';
    const btn = document.getElementById('csDownloadBtn');
    if (btn) btn.disabled = count === 0;
}
async function doCsDownload() {
    const checked = [...document.querySelectorAll('[data-cs-dl-idx]:checked')];
    const indices = checked.map(cb => parseInt(cb.dataset.csDlIdx));
    const ids = _csCloudProjects.filter((_, i) => indices.includes(i)).map(p => p.id);
    if (!ids.length) return;
    const btn = document.getElementById('csDownloadBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 다운로드 중...'; }
    if (typeof window.downloadSelectedCloudProjects === 'function') {
        const count = await window.downloadSelectedCloudProjects(ids);
        closeCloudSyncModal();
        alert(`✅ ${count}개의 프로젝트가 이 기기에 다운로드되었습니다.`);
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> &nbsp;선택 다운로드'; }
}

// ─── 통합 복원 모달 ──────────────────────────────────────────
let _restoreCurrentTab = "cloud";

async function openRestoreModal() {
    document.getElementById("restoreModal").classList.remove("sync-modal-hidden");
    switchRestoreTab("cloud");
}
function closeRestoreModal() {
    document.getElementById("restoreModal").classList.add("sync-modal-hidden");
}
async function switchRestoreTab(tab) {
    _restoreCurrentTab = tab;
    document.getElementById("restoreTabCloud").classList.toggle("active", tab === "cloud");
    document.getElementById("restoreTabLocal").classList.toggle("active", tab === "local");
    document.getElementById("restoreTabCross").classList.toggle("active", tab === "cross");
    document.getElementById("restoreCloudTab").classList.toggle("sync-modal-hidden", tab !== "cloud");
    document.getElementById("restoreLocalTab").classList.toggle("sync-modal-hidden", tab !== "local");
    document.getElementById("restoreCrossTab").classList.toggle("sync-modal-hidden", tab !== "cross");
    // 탭 전환 시 복원 모달 footer 초기화
    document.getElementById("restoreModalFooter").innerHTML = '<button class="btn-sync-secondary" onclick="closeRestoreModal()">닫기</button>';
    if (tab === "cloud") {
        await loadRestoreCloudList();
    }
}
async function loadRestoreCloudList() {
    const container = document.getElementById("restoreCloudProjectList");
    container.innerHTML = '<div class="sync-loading"><i class="fas fa-spinner fa-spin"></i> &nbsp;불러오는 중...</div>';
    if (typeof window.getAllCloudProjects !== "function") {
        container.innerHTML = '<div class="sync-empty"><i class="fas fa-wifi"></i>로그인 후 이용 가능합니다.</div>';
        return;
    }
    const projects = await window.getAllCloudProjects();
    if (!projects || projects.length === 0) {
        container.innerHTML = '<div class="sync-empty"><i class="fas fa-cloud"></i>클라우드에 저장된 프로젝트가 없습니다.</div>';
        return;
    }
    container.innerHTML = projects.map(p => `
        <div class="sync-project-card">
            <div class="sync-card-info">
                <div class="sync-card-title">${escapeHtmlStr(p.title || "제목 없음")}</div>
                <div class="sync-card-meta">
                    <span><i class="fas fa-clock"></i> ${formatDateTimeKo(p.savedAt)}</span>
                    <span class="sync-card-badge">${p.lastStep || 1}단계</span>
                    <span>${relativeTime(p.savedAt)}</span>
                </div>
            </div>
            <button class="sync-card-action-btn restore-btn" onclick="openHistoryModal('${escapeHtmlStr(p.id)}', '${escapeHtmlStr(p.title || "제목 없음")}')">
                <i class="fas fa-history"></i> 히스토리
            </button>
            <button class="sync-card-action-btn" onclick="doRestoreFromCloud('${escapeHtmlStr(p.id)}')">
                <i class="fas fa-download"></i> 최신본 복원
            </button>
        </div>
    `).join("");
}
async function doRestoreFromCloud(projectId) {
    if (!(await window.showConfirmAsync("이 프로젝트의 최신 클라우드 버전을 로컬에 복원하시겠습니까?"))) return;
    if (typeof window.downloadSelectedCloudProjects === "function") {
        const count = await window.downloadSelectedCloudProjects([projectId]);
        if (count > 0) {
            closeRestoreModal();
            alert("✅ 클라우드 최신 버전으로 복원 완료!");
        }
    }
}

// ─── 로컬 파일 복원 (스마트 병합 배지 포함) ─────────────────
function handleRestoreLocalFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let data = JSON.parse(e.target.result);
            let projects = Array.isArray(data) ? data : (data.projects || [data]);
            projects = projects.filter(p => p && p.id);
            const container = document.getElementById("restoreLocalPreviewList");
            const emptyEl = document.getElementById("restoreLocalEmpty");
            if (projects.length === 0) {
                container.classList.add("sync-modal-hidden");
                emptyEl.classList.remove("sync-modal-hidden");
                emptyEl.innerHTML = '<div class="sync-empty"><i class="fas fa-exclamation-circle"></i>유효한 프로젝트 데이터를 찾을 수 없습니다.</div>';
                return;
            }
            // 스마트 병합 분석
            const analyzed = typeof window.analyzeIncomingProjects === 'function'
                ? window.analyzeIncomingProjects(projects)
                : projects.map(p => ({ ...p, _mergeStatus: 'new' }));

            window._localRestoreProjects = analyzed;
            container.classList.remove("sync-modal-hidden");
            emptyEl.classList.add("sync-modal-hidden");

            const badgeHtml = (status) => {
                if (status === 'new')     return '<span class="badge-merge badge-new">🔵 신규</span>';
                if (status === 'update')  return '<span class="badge-merge badge-update">🟢 업데이트</span>';
                return '<span class="badge-merge badge-current">🟡 이미 최신</span>';
            };
            const newUpd = analyzed.filter(p => p._mergeStatus !== 'current').length;

            container.innerHTML = `<div class="sync-select-bar">
                <label><input type="checkbox" id="localRestoreSelectAll" onchange="toggleLocalRestoreAll(this.checked)"> 전체 선택</label>
                <span class="sync-count-label"><span id="localRestoreCount">0개 선택됨</span> · 신규/업데이트 ${newUpd}건</span>
            </div>` + analyzed.map((p, i) => `
                <div class="sync-project-card${p._mergeStatus === 'current' ? '' : ' selected'}">
                    <input type="checkbox" data-idx="${i}" ${p._mergeStatus !== 'current' ? 'checked' : ''} onchange="updateLocalRestoreCount()">
                    <div class="sync-card-info">
                        <div class="sync-card-title">${escapeHtmlStr(p.title || "제목 없음")}</div>
                        <div class="sync-card-meta">
                            <span><i class="fas fa-clock"></i> ${formatDateTimeKo(p.savedAt)}</span>
                            <span class="sync-card-badge">${p.lastStep || 1}단계</span>
                            ${badgeHtml(p._mergeStatus)}
                        </div>
                    </div>
                </div>
            `).join("");
            updateLocalRestoreCount();
            const footer = document.getElementById("restoreModalFooter");
            footer.innerHTML = `
                <button class="btn-sync-secondary" onclick="closeRestoreModal()">닫기</button>
                <button class="btn-sync-primary" id="localRestoreImportBtn" onclick="doLocalRestoreImport()">
                    <i class="fas fa-file-import"></i> &nbsp;선택 가져오기
                </button>`;
        } catch(err) {
            alert("파일을 읽는 중 오류가 발생했습니다: " + err.message);
        }
    };
    reader.readAsText(file, "utf-8");
}
function toggleLocalRestoreAll(checked) {
    document.querySelectorAll("#restoreLocalPreviewList input[type=checkbox]").forEach(cb => cb.checked = checked);
    updateLocalRestoreCount();
}
function updateLocalRestoreCount() {
    const count = document.querySelectorAll("#restoreLocalPreviewList input[type=checkbox]:checked").length;
    const el = document.getElementById("localRestoreCount");
    if (el) el.textContent = count + "개 선택됨";
    const btn = document.getElementById("localRestoreImportBtn");
    if (btn) btn.disabled = count === 0;
}
function doLocalRestoreImport() {
    const checked = [...document.querySelectorAll("#restoreLocalPreviewList input[type=checkbox]:checked")];
    const indices = checked.map(cb => parseInt(cb.dataset.idx));
    const toImport = (window._localRestoreProjects || []).filter((_, i) => indices.includes(i));
    if (toImport.length === 0) return;
    const result = typeof window.smartMergeToLocal === 'function'
        ? window.smartMergeToLocal(toImport)
        : { newCount: toImport.length, updateCount: 0 };
    closeRestoreModal();
    alert(`✅ 가져오기 완료!\n🔵 신규 추가: ${result.newCount}건\n🟢 업데이트: ${result.updateCount}건`);
}

// ─── 타계정 클라우드 불러오기 ────────────────────────────────
async function doCrossAccountFetch() {
    const email = document.getElementById("crossAccountEmail").value.trim();
    const pw    = document.getElementById("crossAccountPw").value;
    const errEl = document.getElementById("crossAccountError");
    const listEl = document.getElementById("crossAccountProjectList");
    const btn   = document.getElementById("crossAccountFetchBtn");
    errEl.classList.add("sync-modal-hidden");

    if (!email || !pw) {
        errEl.textContent = "이메일과 비밀번호를 모두 입력해 주세요.";
        errEl.classList.remove("sync-modal-hidden");
        return;
    }
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 불러오는 중...';
    listEl.innerHTML = '';

    try {
        if (typeof window.fetchProjectsFromOtherAccount !== 'function') throw new Error("기능을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");
        const projects = await window.fetchProjectsFromOtherAccount(email, pw);
        if (!projects || projects.length === 0) {
            listEl.innerHTML = '<div class="sync-empty"><i class="fas fa-cloud"></i>해당 계정의 클라우드에 저장된 프로젝트가 없습니다.<br><small style="margin-top:8px;display:block;opacity:0.7;">해당 계정으로 로그인 후 프로젝트를 저장하면 클라우드에 백업됩니다.</small></div>';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> &nbsp;프로젝트 불러오기';
            return;
        }
        // 스마트 병합 분석
        const analyzed = window.analyzeIncomingProjects(projects);
        window._crossAccountProjects = analyzed;

        const badgeHtml = (status) => {
            if (status === 'new')    return '<span class="badge-merge badge-new">🔵 신규</span>';
            if (status === 'update') return '<span class="badge-merge badge-update">🟢 업데이트</span>';
            return '<span class="badge-merge badge-current">🟡 이미 최신</span>';
        };
        const newUpd = analyzed.filter(p => p._mergeStatus !== 'current').length;
        const totalCount = analyzed.length;

        listEl.innerHTML = `<div class="sync-select-bar">
            <label><input type="checkbox" id="crossSelectAll" onchange="toggleCrossAll(this.checked)"> 전체 선택</label>
            <span class="sync-count-label"><span id="crossCount">0개 선택됨</span> · 총 ${totalCount}건 (신규/업데이트 ${newUpd}건)</span>
        </div>` + analyzed.map((p, i) => `
            <div class="sync-project-card${p._mergeStatus !== 'current' ? ' selected' : ''}">
                <input type="checkbox" data-cross-idx="${i}" ${p._mergeStatus !== 'current' ? 'checked' : ''} onchange="updateCrossCount()">
                <div class="sync-card-info">
                    <div class="sync-card-title">${escapeHtmlStr(p.title || "제목 없음")}</div>
                    <div class="sync-card-meta">
                        <span><i class="fas fa-clock"></i> ${formatDateTimeKo(p.savedAt)}</span>
                        <span class="sync-card-badge">${p.lastStep || 1}단계</span>
                        ${badgeHtml(p._mergeStatus)}
                    </div>
                </div>
            </div>
        `).join("");
        updateCrossCount();

        // footer에 가져오기 버튼 추가
        document.getElementById("restoreModalFooter").innerHTML = `
            <button class="btn-sync-secondary" onclick="closeRestoreModal()">닫기</button>
            <button class="btn-sync-primary" id="crossImportBtn" onclick="doCrossImport()">
                <i class="fas fa-file-import"></i> &nbsp;현재 계정으로 가져오기
            </button>`;
    } catch(err) {
        let msg = err.message || "알 수 없는 오류";
        if (msg.includes("auth/wrong-password") || msg.includes("auth/invalid-credential")) msg = "비밀번호가 올바르지 않습니다.";
        else if (msg.includes("auth/user-not-found"))  msg = "해당 이메일로 등록된 계정이 없습니다.";
        else if (msg.includes("auth/too-many-requests")) msg = "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
        errEl.textContent = "❌ " + msg;
        errEl.classList.remove("sync-modal-hidden");
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> &nbsp;프로젝트 불러오기';
}
function toggleCrossAll(checked) {
    document.querySelectorAll("[data-cross-idx]").forEach(cb => cb.checked = checked);
    updateCrossCount();
}
function updateCrossCount() {
    const count = document.querySelectorAll("[data-cross-idx]:checked").length;
    const el = document.getElementById("crossCount");
    if (el) el.textContent = count + "개 선택됨";
    const btn = document.getElementById("crossImportBtn");
    if (btn) btn.disabled = count === 0;
}
async function doCrossImport() {
    const checked = [...document.querySelectorAll("[data-cross-idx]:checked")];
    const indices = checked.map(cb => parseInt(cb.dataset.crossIdx));
    const toImport = (window._crossAccountProjects || []).filter((_, i) => indices.includes(i));
    if (toImport.length === 0) return;

    const btn = document.getElementById("crossImportBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 가져오는 중...'; }

    const result = window.smartMergeToLocal(toImport);

    // 현재 계정 클라우드에도 백업 (선택 항목)
    if (window.firebaseAuth?.currentUser && window.firebaseDb) {
        const uid = window.firebaseAuth.currentUser.uid;
        for (const p of toImport) {
            const clean = { ...p };
            delete clean._mergeStatus;
            try {
                await window.firebaseDb.collection("users").doc(uid).collection("projects").doc(p.id).set(clean);
            } catch(e) { /* 실패해도 로컬에는 저장됨 */ }
        }
    }
    closeRestoreModal();
    alert(`✅ 타계정 프로젝트 가져오기 완료!\n🔵 신규 추가: ${result.newCount}건\n🟢 업데이트: ${result.updateCount}건`);
}

// ─── 히스토리 복원 모달 ──────────────────────────────────────
let _historyProjectId = null;

async function openHistoryModal(projectId, projectTitle) {
    _historyProjectId = projectId;
    document.getElementById("historyModalProjectTitle").textContent = projectTitle;
    document.getElementById("historyList").innerHTML = '<div class="sync-loading"><i class="fas fa-spinner fa-spin"></i> &nbsp;히스토리 불러오는 중...</div>';
    document.getElementById("cloudHistoryModal").classList.remove("sync-modal-hidden");

    if (typeof window.getCloudBackupHistory !== "function") return;
    const history = await window.getCloudBackupHistory(projectId);
    const container = document.getElementById("historyList");
    if (!history || history.length === 0) {
        container.innerHTML = '<div class="sync-empty"><i class="fas fa-clock"></i>저장된 히스토리가 없습니다.<br><small>프로젝트를 저장하면 자동으로 히스토리가 쌓입니다.</small></div>';
        return;
    }
    container.innerHTML = history.map((h, i) => `
        <div class="history-card">
            <div>
                <div class="history-card-time">
                    ${i === 0 ? '<span style="color:#34d399;font-size:0.75rem;margin-right:6px;">● 최신</span>' : ''}
                    ${formatDateTimeKo(h.savedAt)}
                </div>
                <div class="history-card-rel">${relativeTime(h.savedAt)} · ${h.lastStep || 1}단계</div>
            </div>
            <button class="sync-card-action-btn restore-btn" onclick="doRestoreHistory('${escapeHtmlStr(h._historyDocId)}', '${escapeHtmlStr(formatDateTimeKo(h.savedAt))}')">
                <i class="fas fa-undo"></i> 이 시점으로 복원
            </button>
        </div>
    `).join("");
}
function closeHistoryModal() {
    document.getElementById("cloudHistoryModal").classList.add("sync-modal-hidden");
}
async function doRestoreHistory(historyDocId, timeLabel) {
    if (!(await window.showConfirmAsync(`"${timeLabel}" 시점의 데이터로 복원하시겠습니까?
현재 작업 내용은 교체됩니다.`))) return;
    if (!_historyProjectId) return;
    const ok = await window.restoreFromCloudHistory(_historyProjectId, historyDocId);
    if (ok) {
        closeHistoryModal();
        closeRestoreModal();
        alert(`✅ "${timeLabel}" 시점으로 복원 완료!`);
    } else {
        alert("❌ 복원에 실패했습니다. 다시 시도해 주세요.");
    }
}

// ─── HTML 이스케이프 유틸 ────────────────────────────────────
function escapeHtmlStr(str) {
    if (!str) return "";
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
